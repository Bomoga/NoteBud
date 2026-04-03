"""
RAG chat service: embed query -> retrieve chunks -> stream LLM answer with citations.
"""

import asyncio
import json
import logging
import threading
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

_VECTOR_INDEX = "chunk_embeddings"
_RETRIEVAL_TOP_K = 20  # cast a wide net, then filter by notebook
_RESULT_LIMIT = 5
_SIMILARITY_FLOOR = 0.50  # minimum to include a chunk at all
_CONFIDENCE_THRESHOLD = 0.75  # for the low_confidence flag
_MIN_CONFIDENT_CHUNKS = 2

_SYSTEM_INSTRUCTION = (
    "You are a helpful study assistant. Answer the user's question based ONLY "
    "on the provided context from their notebook documents. If the context "
    "doesn't contain enough information to answer the question, say so clearly. "
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
    import time

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
    # 2. Retrieve top-5 chunks scoped to notebook
    # ------------------------------------------------------------------
    async def _retrieve_chunks(
        self,
        notebook_id: str,
        query_embedding: list[float],
    ) -> list[dict]:
        cypher = """
            CALL db.index.vector.queryNodes($index, $top_k, $embedding)
            YIELD node AS chunk, score
            MATCH (nb:Notebook {id: $notebook_id})
                  -[:CONTAINS]->(d:Document)
                  -[:HAS_CHUNK]->(chunk)
            WHERE score >= $floor
            RETURN chunk.id        AS chunk_id,
                   chunk.text      AS text,
                   chunk.source_file AS source_file,
                   chunk.page_number AS page_number,
                   chunk.slide_number AS slide_number,
                   score
            ORDER BY score DESC
            LIMIT $limit
        """
        async with self._driver.session() as session:
            result = await session.run(
                cypher,
                index=_VECTOR_INDEX,
                top_k=_RETRIEVAL_TOP_K,
                embedding=query_embedding,
                notebook_id=notebook_id,
                floor=_SIMILARITY_FLOOR,
                limit=_RESULT_LIMIT,
            )
            return await result.data()

    # ------------------------------------------------------------------
    # 3. Build the context prompt from retrieved chunks
    # ------------------------------------------------------------------
    @staticmethod
    def _build_context(chunks: list[dict]) -> str:
        parts: list[str] = []
        for i, chunk in enumerate(chunks, 1):
            filename = chunk["source_file"] or "unknown"
            parts.append(f"[Source {i}: {filename}]\n{chunk['text']}")
        return "\n\n".join(parts)

    # ------------------------------------------------------------------
    # 4. Build citations list
    # ------------------------------------------------------------------
    @staticmethod
    def _build_citations(chunks: list[dict]) -> list[dict]:
        return [
            {
                "chunk_id": c["chunk_id"],
                "filename": c["source_file"] or "unknown",
                "snippet": c["text"][:120],
            }
            for c in chunks
        ]

    # ------------------------------------------------------------------
    # 5. Stream Gemini LLM tokens from a background thread
    # ------------------------------------------------------------------
    @staticmethod
    async def _stream_llm(
        client: genai.Client, prompt: str
    ) -> AsyncGenerator[str, None]:
        """Yield text deltas from Gemini streaming, running the sync
        iterator in a daemon thread and bridging via asyncio.Queue."""
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue[str | Exception | None] = asyncio.Queue()

        def _produce() -> None:
            try:
                response = client.models.generate_content_stream(
                    model=settings.gemini_model,
                    contents=prompt,
                )
                for chunk in response:
                    if chunk.text:
                        loop.call_soon_threadsafe(queue.put_nowait, chunk.text)
            except Exception as exc:            # noqa: BLE001
                loop.call_soon_threadsafe(queue.put_nowait, exc)
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)

        threading.Thread(target=_produce, daemon=True).start()

        while True:
            item = await queue.get()
            if item is None:
                break
            if isinstance(item, Exception):
                raise item
            yield item

    # ------------------------------------------------------------------
    # Public API — non-streaming (kept for backwards compat with query router)
    # ------------------------------------------------------------------
    async def query(self, notebook_id: str, query_text: str) -> dict:
        query_embedding = await self._embed_query(query_text)
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
        response = await anyio.to_thread.run_sync(
            lambda: client.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
            )
        )
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
        except Exception as exc:
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

        # 5. Build prompt and citations
        context = self._build_context(chunks)
        prompt = (
            f"{_SYSTEM_INSTRUCTION}\n\nContext:\n{context}\n\n"
            f"Question: {query_text}"
        )
        citations = self._build_citations(chunks)

        # 6. Stream LLM tokens
        client = _get_genai_client()
        try:
            async for token in self._stream_llm(client, prompt):
                yield _sse({"token": token})
        except Exception as exc:
            logger.exception("Gemini LLM streaming error")
            yield _sse({"token": "\n\nSorry, an error occurred while generating the answer. Please try again."})

        # 7. Final event
        yield _sse({
            "done": True,
            "citations": citations,
            "low_confidence": low_confidence,
        })


def _sse(payload: dict) -> str:
    """Format a dict as an SSE data line."""
    return f"data: {json.dumps(payload)}\n\n"
