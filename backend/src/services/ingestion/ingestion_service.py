"""
Background ingestion pipeline: GCS file → chunks → Neo4j graph.

Steps 1–3 (extract / chunk / embed) are stubs — the ML team will fill
these in once the LlamaIndex loaders and Gemini embedding client are
integrated into the backend (see ml/services/gemini.py and ml/README.md).

Step 4 (store_chunks) and Step 5 (compute_similar_edges) are fully wired.
"""
import logging

from neo4j import AsyncDriver

from src.services.vector_store.vector_store_service import store_chunks

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Stubs — replace with real implementations (ML team, S3-16b / S3-18)
# ---------------------------------------------------------------------------

async def _extract_text(gcs_uri: str) -> str:
    """TODO: extract raw text from GCS file using LlamaIndex loaders.

    Supports PDF, DOCX, PPTX.  For now returns a placeholder string so the
    rest of the pipeline can be exercised end-to-end.
    """
    logger.warning("_extract_text is a stub — gcs_uri=%s", gcs_uri)
    return f"Placeholder text extracted from {gcs_uri}"


def _chunk_text(text: str) -> list[dict]:
    """TODO: split text into 512-token chunks with 64-token overlap using
    LlamaIndex SentenceSplitter.

    Returns a list of dicts: [{text, position}, ...].
    For now produces a single chunk so store_chunks() can be exercised.
    """
    logger.warning("_chunk_text is a stub — returning single placeholder chunk")
    return [{"text": text, "position": 0}]


async def _embed_chunks(chunks: list[dict]) -> list[dict]:
    """TODO: call Gemini text-embedding-004 (768-dim) for each chunk and add
    an `embedding` key to each dict.

    For now attaches a zero-vector so the node is created with a valid
    list property (not a string) that satisfies the ChunkRepository contract.
    """
    logger.warning("_embed_chunks is a stub — attaching zero-vectors")
    for chunk in chunks:
        chunk["embedding"] = [0.0] * 768
    return chunks


# ---------------------------------------------------------------------------
# Pipeline entry-point — called as a FastAPI BackgroundTask
# ---------------------------------------------------------------------------

async def ingest_document(
    driver: AsyncDriver,
    document_id: str,
    gcs_uri: str,
    source_type: str,
) -> None:
    """Run the full ingestion pipeline for a single document.

    1. Extract text from GCS file       (stub — ML team)
    2. Chunk the text                   (stub — ML team)
    3. Embed chunks                     (stub — ML team)
    4. store_chunks() → Neo4j graph     (implemented)
    5. compute_similar_edges()          (stub — S3-16b)
    """
    logger.info(
        "Ingestion started — document_id=%s gcs_uri=%s source_type=%s",
        document_id, gcs_uri, source_type,
    )
    try:
        text = await _extract_text(gcs_uri)
        chunks = _chunk_text(text)
        chunks = await _embed_chunks(chunks)
        chunk_ids = await store_chunks(
            driver=driver,
            chunks=chunks,
            document_id=document_id,
            source_type=source_type,
        )
        logger.info(
            "Ingestion complete — document_id=%s chunks_stored=%d",
            document_id, len(chunk_ids),
        )
    except Exception:
        logger.exception(
            "Ingestion failed — document_id=%s gcs_uri=%s", document_id, gcs_uri
        )