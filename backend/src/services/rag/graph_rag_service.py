"""
RAG chat service: embed query -> retrieve chunks -> stream LLM answer with citations.
"""

import asyncio
import json
import logging
import re
import threading
import time
from typing import AsyncGenerator

import anyio
from google import genai
from google.genai import errors as genai_errors
from neo4j import AsyncDriver

from src.lib.config.settings import settings
from src.services.ingestion.ingestion_service import (
    EMBEDDING_DIMENSIONS,
    EMBEDDING_MODEL,
)

_EMBED_MAX_RETRIES = 3
_EMBED_BACKOFF_BASE = 1.0

logger = logging.getLogger(__name__)

_CONTENT_VECTOR_INDEX = "chunk_embeddings"
_NOTE_VECTOR_INDEX = "note_chunk_embeddings"
# Cast a wide net so that notebook-scoped chunks are included even in a large
# multi-tenant index.  At 200 candidates the per-request overhead is small
# (Neo4j traverses the HNSW graph) while making false-zero results rare.
_RETRIEVAL_TOP_K = 200
_RESULT_LIMIT = 5
_SIMILARITY_FLOOR = 0.50  # minimum to include a chunk at all
_CONFIDENCE_THRESHOLD = 0.75  # for the low_confidence flag
_MIN_CONFIDENT_CHUNKS = 2

_SYSTEM_INSTRUCTION = (
    "You are a helpful study assistant. Use the provided context from the user's "
    "notebook documents as your primary source. When the context covers the topic, "
    "cite it inline using [Source N] where N matches the source number. "
    "When the context is silent or incomplete, answer from your own knowledge — "
    "do not refuse or say the context doesn't contain the information. "
    "Be concise and accurate."
)


def _get_genai_client() -> genai.Client:
    api_key = settings.gemini_api_key
    if not api_key:
        raise EnvironmentError(
            "GEMINI_API_KEY is not set — required for RAG chat"
        )
    return genai.Client(api_key=api_key)


def _embed_query_sync(client: genai.Client, text: str) -> list[float]:
    """Embed a single query string (blocking). Retries on transient errors."""
    for attempt in range(_EMBED_MAX_RETRIES):
        try:
            response = client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=text,
                config={"output_dimensionality": EMBEDDING_DIMENSIONS},
            )
            return response.embeddings[0].values
        except (genai_errors.ServerError, genai_errors.ClientError) as exc:
            retryable = isinstance(exc, genai_errors.ServerError) or "429" in str(exc)
            if retryable and attempt < _EMBED_MAX_RETRIES - 1:
                time.sleep(_EMBED_BACKOFF_BASE * (2 ** attempt))
                continue
            raise
    raise RuntimeError("EMBEDDING_FAILED: max retries exceeded")


class GraphRAGService:
    def __init__(self, driver: AsyncDriver):
        self._driver = driver

    # ------------------------------------------------------------------
    # 1. Embed the user query
    # ------------------------------------------------------------------
    async def _embed_query(self, query_text: str) -> list[float]:
        client = _get_genai_client()
        return await anyio.to_thread.run_sync(
            lambda: _embed_query_sync(client, query_text)
        )

    # ------------------------------------------------------------------
    # 1b. Resolve the full set of notebook IDs to search
    #     (current notebook + all directly connected notebooks)
    # ------------------------------------------------------------------
    async def _get_search_notebook_ids(self, notebook_id: str) -> list[str]:
        """Return notebook_id plus the IDs of all notebooks connected to it
        via a NOTEBOOK_LINK relationship in either direction."""
        cypher = """
            MATCH (nb:Notebook {id: $notebook_id})-[:NOTEBOOK_LINK]-(other:Notebook)
            RETURN other.id AS connected_id
        """
        async with self._driver.session() as session:
            result = await session.run(cypher, notebook_id=notebook_id)
            rows = await result.data()
        connected = [r["connected_id"] for r in rows]
        return [notebook_id] + connected

    # ------------------------------------------------------------------
    # 2. Retrieve top-K chunks across notebook + connected notebooks
    # ------------------------------------------------------------------
    async def _retrieve_chunks(
        self,
        notebook_id: str,
        query_embedding: list[float],
    ) -> list[dict]:
        notebook_ids = await self._get_search_notebook_ids(notebook_id)

        content_cypher = """
            CALL db.index.vector.queryNodes($index, $top_k, $embedding)
            YIELD node AS chunk, score
            MATCH (nb:Notebook)-[:CONTAINS]->(d:Document)-[:HAS_CHUNK]->(chunk)
            WHERE nb.id IN $notebook_ids AND score >= $floor
            RETURN chunk.id           AS chunk_id,
                   chunk.text         AS text,
                   chunk.source_file  AS source_file,
                   chunk.page_number  AS page_number,
                   chunk.slide_number AS slide_number,
                   'document'         AS source_type,
                   nb.id              AS notebook_id,
                   nb.title           AS notebook_title,
                   nb.course_code     AS notebook_course_code,
                   score
            ORDER BY score DESC
            LIMIT $limit
        """
        note_cypher = """
            CALL db.index.vector.queryNodes($index, $top_k, $embedding)
            YIELD node AS chunk, score
            MATCH (nb:Notebook)-[:HAS_NOTE]->(n:Note)-[:HAS_CHUNK]->(chunk)
            WHERE nb.id IN $notebook_ids AND score >= $floor
            RETURN chunk.id          AS chunk_id,
                   chunk.text        AS text,
                   chunk.note_title  AS source_file,
                   null              AS page_number,
                   null              AS slide_number,
                   'note'            AS source_type,
                   nb.id             AS notebook_id,
                   nb.title          AS notebook_title,
                   nb.course_code    AS notebook_course_code,
                   score
            ORDER BY score DESC
            LIMIT $limit
        """
        params = dict(
            top_k=_RETRIEVAL_TOP_K,
            embedding=query_embedding,
            notebook_ids=notebook_ids,
            floor=_SIMILARITY_FLOOR,
            limit=_RESULT_LIMIT,
        )
        async with self._driver.session() as session:
            content_result = await session.run(
                content_cypher, index=_CONTENT_VECTOR_INDEX, **params,
            )
            content_chunks = await content_result.data()

            note_result = await session.run(
                note_cypher, index=_NOTE_VECTOR_INDEX, **params,
            )
            note_chunks = await note_result.data()

        merged = sorted(
            content_chunks + note_chunks,
            key=lambda c: c["score"],
            reverse=True,
        )
        return merged[:_RESULT_LIMIT]

    # ------------------------------------------------------------------
    # 3. Build the context prompt from retrieved chunks
    # ------------------------------------------------------------------
    @staticmethod
    def _build_context(chunks: list[dict]) -> str:
        parts: list[str] = []
        for i, chunk in enumerate(chunks, 1):
            name = chunk["source_file"] or "unknown"
            label = "Note" if chunk.get("source_type") == "note" else "Document"
            nb_label = chunk.get("notebook_course_code") or chunk.get("notebook_title") or ""
            nb_suffix = f", {nb_label}" if nb_label else ""
            parts.append(f"[Source {i} ({label}{nb_suffix}): {name}]\n{chunk['text']}")
        return "\n\n".join(parts)

    # ------------------------------------------------------------------
    # 4. Build citations list (all retrieved chunks)
    # ------------------------------------------------------------------
    @staticmethod
    def _build_citations(chunks: list[dict]) -> list[dict]:
        return [
            {
                "chunk_id": c["chunk_id"],
                "filename": c["source_file"] or "unknown",
                "snippet": c["text"][:120],
                "source_type": c.get("source_type", "document"),
                "notebook_title": c.get("notebook_course_code") or c.get("notebook_title") or None,
            }
            for c in chunks
        ]

    # ------------------------------------------------------------------
    # 4b. Filter citations to only chunks actually cited in the answer
    # ------------------------------------------------------------------
    @staticmethod
    def _extract_cited_citations(chunks: list[dict], answer: str) -> list[dict]:
        """Return citations only for [Source N] markers present in *answer*.

        Falls back to all chunks if the model emitted no markers.
        """
        referenced = {int(m) for m in re.findall(r"\[Source\s+(\d+)\]", answer)}
        cited = [
            {
                "chunk_id": chunks[i - 1]["chunk_id"],
                "filename": chunks[i - 1]["source_file"] or "unknown",
                "snippet": chunks[i - 1]["text"][:120],
                "source_type": chunks[i - 1].get("source_type", "document"),
                "notebook_title": chunks[i - 1].get("notebook_course_code") or chunks[i - 1].get("notebook_title") or None,
            }
            for i in sorted(referenced)
            if 1 <= i <= len(chunks)
        ]
        # Fallback: include all chunks when the model produced no inline markers
        return cited if cited else GraphRAGService._build_citations(chunks)

    # ------------------------------------------------------------------
    # 5. Stream Gemini LLM tokens from a background thread
    # ------------------------------------------------------------------
    @staticmethod
    async def _stream_llm(
        client: genai.Client, prompt: str
    ) -> AsyncGenerator[str, None]:
        """Yield text deltas from Gemini streaming, running the sync
        iterator in a daemon thread and bridging via asyncio.Queue.

        A threading.Event (stop_flag) is checked by the producer so that
        if the client disconnects and the async generator is cancelled,
        the background thread stops consuming LLM tokens promptly.
        """
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue[str | Exception | None] = asyncio.Queue(maxsize=64)
        stop_flag = threading.Event()

        def _produce() -> None:
            try:
                response = client.models.generate_content_stream(
                    model=settings.gemini_model,
                    contents=prompt,
                )
                for chunk in response:
                    if stop_flag.is_set():
                        break
                    if chunk.text:
                        loop.call_soon_threadsafe(queue.put_nowait, chunk.text)
            except Exception as exc:            # noqa: BLE001
                if not stop_flag.is_set():
                    loop.call_soon_threadsafe(queue.put_nowait, exc)
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)

        threading.Thread(target=_produce, daemon=True).start()

        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                if isinstance(item, Exception):
                    raise item
                yield item
        finally:
            stop_flag.set()

    # ------------------------------------------------------------------
    # Public API — non-streaming (kept for backwards compat with query router)
    # ------------------------------------------------------------------
    async def query(self, notebook_id: str, query_text: str) -> dict:
        try:
            query_embedding = await self._embed_query(query_text)
        except EnvironmentError:
            logger.exception("GEMINI_API_KEY not configured")
            return {
                "answer": "The AI assistant is not configured. Please contact your administrator.",
                "sources": [],
            }
        except Exception:
            logger.exception("Failed to embed query in query()")
            return {
                "answer": "Sorry, something went wrong processing your query. Please try again.",
                "sources": [],
            }

        chunks = await self._retrieve_chunks(notebook_id, query_embedding)

        if not chunks:
            return {
                "answer": (
                    "No documents have been uploaded to this notebook yet, "
                    "or no relevant content was found for your query."
                ),
                "sources": [],
            }

        context = self._build_context(chunks)
        prompt = (
            f"{_SYSTEM_INSTRUCTION}\n\nContext:\n{context}\n\n"
            f"Question: {query_text}"
        )

        client = _get_genai_client()
        try:
            response = await anyio.to_thread.run_sync(
                lambda: client.models.generate_content(
                    model=settings.gemini_model,
                    contents=prompt,
                )
            )
        except Exception:
            logger.exception("LLM generate_content failed in query()")
            return {
                "answer": "Sorry, the AI assistant is temporarily unavailable. Please try again later.",
                "sources": [],
            }
        return {
            "answer": response.text,
            "sources": [c["source_file"] or "unknown" for c in chunks],
        }

    # ------------------------------------------------------------------
    # Public API — SSE streaming with citations
    # ------------------------------------------------------------------
    async def stream_chat(
        self,
        notebook_id: str,
        query_text: str,
    ) -> AsyncGenerator[str, None]:
        """Yield SSE-formatted events:
          data: {"token": "..."}
          data: {"done": true, "citations": [...], "low_confidence": ...}
        """
        # 1. Embed the query
        try:
            query_embedding = await self._embed_query(query_text)
        except Exception:
            logger.exception("Failed to embed query")
            yield _sse({"token": "Sorry, something went wrong processing your query. Please try again."})
            yield _sse({"done": True, "citations": [], "low_confidence": True})
            return

        # 2. Retrieve chunks
        chunks = await self._retrieve_chunks(notebook_id, query_embedding)

        # 3. No chunks → graceful message
        if not chunks:
            yield _sse({
                "token": (
                    "No documents have been uploaded to this notebook yet, "
                    "or no relevant content was found for your query."
                ),
            })
            yield _sse({"done": True, "citations": [], "low_confidence": True})
            return

        # 4. Confidence check
        confident = sum(1 for c in chunks if c["score"] >= _CONFIDENCE_THRESHOLD)
        low_confidence = confident < _MIN_CONFIDENT_CHUNKS

        # 5. Build prompt
        context = self._build_context(chunks)
        prompt = (
            f"{_SYSTEM_INSTRUCTION}\n\nContext:\n{context}\n\n"
            f"Question: {query_text}"
        )

        # 6. Stream LLM tokens; accumulate full answer to extract inline citations
        client = _get_genai_client()
        answer_parts: list[str] = []
        try:
            async for token in self._stream_llm(client, prompt):
                answer_parts.append(token)
                yield _sse({"token": token})
        except Exception:
            logger.exception("Gemini LLM streaming error")
            yield _sse({"token": "\n\nSorry, an error occurred while generating the answer. Please try again."})

        # 7. Derive citations from [Source N] markers actually used in the answer
        full_answer = "".join(answer_parts)
        cited = self._extract_cited_citations(chunks, full_answer)

        # 8. Final event
        yield _sse({
            "done": True,
            "citations": cited,
            "low_confidence": low_confidence,
        })


def _sse(payload: dict) -> str:
    """Format a dict as an SSE data line."""
    return f"data: {json.dumps(payload)}\n\n"
