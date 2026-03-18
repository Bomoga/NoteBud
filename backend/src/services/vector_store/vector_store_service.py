import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.lib.models.chunk import Chunk


async def store_chunks(
    db: AsyncSession,
    chunks: list[dict],
    embeddings: list[list[float]],
) -> list[str]:
    """
    Batch insert chunks with their embeddings.

    Args:
        db: Async database session
        chunks: List of dicts with keys: notebook_id, file_id, text, metadata
        embeddings: List of 768-dim float vectors, parallel to chunks

    Returns:
        List of created chunk UUIDs as strings
    """
    if len(chunks) != len(embeddings):
        raise ValueError("chunks and embeddings must have the same length")

    created_ids = []
    for chunk_data, embedding in zip(chunks, embeddings):
        chunk = Chunk(
            id=uuid.uuid4(),
            notebook_id=chunk_data["notebook_id"],
            file_id=chunk_data.get("file_id"),
            text=chunk_data["text"],
            embedding=embedding,
            metadata_=chunk_data.get("metadata"),
        )
        db.add(chunk)
        created_ids.append(str(chunk.id))

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    return created_ids


async def similarity_search(
    db: AsyncSession,
    query_embedding: list[float],
    notebook_id: int,
    top_k: int = 5,
    similarity_threshold: float = 0.70,
) -> list[dict]:
    """
    Find top-K most similar chunks within a notebook using cosine similarity.

    Args:
        db: Async database session
        query_embedding: 768-dim query vector
        notebook_id: Scope search to this notebook
        top_k: Max number of results (default 5)
        similarity_threshold: Min cosine similarity (default 0.70)

    Returns:
        List of dicts with keys: chunk_id, text, metadata, similarity_score
    """
    max_distance = 1.0 - similarity_threshold

    query = text("""
        SELECT
            id,
            text,
            metadata,
            1 - (embedding <=> CAST(:query_embedding AS vector)) AS similarity_score
        FROM chunks
        WHERE notebook_id = :notebook_id
          AND (embedding <=> CAST(:query_embedding AS vector)) <= :max_distance
        ORDER BY embedding <=> CAST(:query_embedding AS vector)
        LIMIT :top_k
    """)

    result = await db.execute(
        query,
        {
            "query_embedding": str(query_embedding),
            "notebook_id": notebook_id,
            "max_distance": max_distance,
            "top_k": top_k,
        },
    )

    rows = result.fetchall()
    return [
        {
            "chunk_id": str(row.id),
            "text": row.text,
            "metadata": row.metadata,
            "similarity_score": float(row.similarity_score),
        }
        for row in rows
    ]
