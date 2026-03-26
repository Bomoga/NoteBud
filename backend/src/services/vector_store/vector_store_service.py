import logging

from neo4j import AsyncDriver

from src.lib.repositories.chunk_repository import ChunkRepository

logger = logging.getLogger(__name__)


async def store_chunks(
    driver: AsyncDriver,
    chunks: list[dict],
    document_id: str,
    source_type: str = "content",
) -> list[str]:
    """Store chunks in the graph via ChunkRepository.

    Each chunk dict must contain: text (str), embedding (list[float]),
    position (int).

    source_type="content"  → :Chunk:ContentChunk nodes (enter vector index)
    source_type="syllabus" → :Chunk:SyllabusChunk nodes (excluded from index)

    After storage, compute_similar_edges() is called for content chunks only.
    Returns the list of created chunk IDs.
    """
    repo = ChunkRepository(driver)
    chunk_ids = await repo.create_chunks(chunks, document_id, source_type)

    if source_type == "content":
        await compute_similar_edges(chunk_ids)

    return chunk_ids


async def compute_similar_edges(chunk_ids: list[str]) -> None:
    """Stub — SIMILAR edge computation pending ML review.

    Will be implemented by the ML team in S3-16b.
    store_chunks() calls this for content chunks only; syllabus chunks
    never enter the similarity mesh.
    """
    logger.info(
        "SIMILAR edge computation pending ML review — chunk_ids: %s", chunk_ids
    )


async def refresh_chunk_edges(chunk_id: str) -> None:
    """Stub — incremental SIMILAR edge refresh pending ML review.

    Will be implemented by the ML team in S3-17.
    """
    logger.info(
        "refresh_chunk_edges pending ML review — chunk_id: %s", chunk_id
    )
