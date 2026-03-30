import logging
from itertools import islice

from neo4j import AsyncDriver

from src.lib.repositories.chunk_repository import ChunkRepository

logger = logging.getLogger(__name__)

_VECTOR_INDEX = "chunk_embeddings"
_TOP_K = 11  # top-10 neighbours + the chunk itself
_SCORE_THRESHOLD = 0.80
_BATCH_SIZE = 50


async def store_chunks(
        driver: AsyncDriver,
        chunks: list[dict],
        document_id: str,
        source_type: str = "content",
) -> list[str]:
    """Store chunks in the graph via ChunkRepository.

    Each chunk dict must contain: text (str), embedding (list[float]), position (int).

    source_type="content"  -> :Chunk:ContentChunk nodes (enter vector index)
    source_type="syllabus" -> :Chunk:SyllabusChunk nodes (excluded from index)

    After storage, compute_similar_edges() is called for content chunks only.
    Returns the list of created chunk IDs.
    """
    repo = ChunkRepository(driver)
    chunk_ids = await repo.create_chunks(chunks, document_id, source_type)

    if source_type == "content":
        await compute_similar_edges(driver, chunk_ids)

    return chunk_ids


async def compute_similar_edges(
        driver: AsyncDriver,
        chunk_ids: list[str],
) -> None:
    """Build SIMILAR edges between ContentChunk nodes.

    For every chunk_id in the supplied list:
      1. Query the chunk_embeddings vector index for the top-10 nearest
         ContentChunk neighbours (score >= 0.80).
      2. Write bidirectional SIMILAR edges for qualifying pairs using MERGE
         so the operation is idempotent.

    Chunks are processed in batches of 50 to bound per-transaction memory.
    SyllabusChunk nodes are never passed here and are permanently excluded
    from the vector index, so they can never appear as neighbours.
    """
    if not chunk_ids:
        return

    def _batches(iterable, size):
        it = iter(iterable)
        while True:
            batch = list(islice(it, size))
            if not batch:
                break
            yield batch

    total_edges = 0

    for batch in _batches(chunk_ids, _BATCH_SIZE):
        async with driver.session() as session:
            for chunk_id in batch:
                result = await session.run(
                    """
                    MATCH (src:ContentChunk {id: $chunk_id})
                    CALL db.index.vector.queryNodes(
                        $index_name, $top_k, src.embedding
                    ) YIELD node AS neighbour, score
                    WHERE neighbour.id <> $chunk_id
                      AND score >= $threshold
                    RETURN neighbour.id AS neighbour_id, score
                    """,
                    chunk_id=chunk_id,
                    index_name=_VECTOR_INDEX,
                    top_k=_TOP_K,
                    threshold=_SCORE_THRESHOLD,
                )
                records = await result.data()

                if not records:
                    continue

                neighbour_ids = [r["neighbour_id"] for r in records]
                scores = {r["neighbour_id"]: r["score"] for r in records}

                write_result = await session.run(
                    """
                    UNWIND $pairs AS pair
                    MATCH (a:ContentChunk {id: pair.src_id})
                    MATCH (b:ContentChunk {id: pair.neighbour_id})
                    MERGE (a)-[r1:SIMILAR]-(b)
                      ON CREATE SET r1.score = pair.score
                    RETURN count(r1) AS edges_written
                    """,
                    pairs=[
                        {
                            "src_id": chunk_id,
                            "neighbour_id": nid,
                            "score": scores[nid],
                        }
                        for nid in neighbour_ids
                    ],
                )
                write_record = await write_result.single()
                if write_record:
                    total_edges += write_record["edges_written"]

    logger.info(
        "compute_similar_edges: processed %d chunks, wrote %d SIMILAR edges",
        len(chunk_ids),
        total_edges,
    )


async def refresh_chunk_edges(chunk_id: str) -> None:
    """Stub — incremental SIMILAR edge refresh pending ML review.

    Will be implemented by the ML team in S3-17.
    """
    logger.info(
        "refresh_chunk_edges pending ML review — chunk_id: %s", chunk_id
    )
