import uuid

from neo4j import AsyncDriver


def _node_to_dict(node) -> dict:
    return dict(node)


class NoteChunkRepository:
    def __init__(self, driver: AsyncDriver):
        self._driver = driver

    async def create_chunks(
        self,
        note_id: str,
        note_title: str,
        chunks: list[dict],
    ) -> list[str]:
        """Create :NoteChunk:Chunk nodes, [:HAS_CHUNK] edges from Note, and [:NEXT] edges.

        Each chunk dict must contain: text (str), embedding (list[float]), position (int).

        Returns chunk IDs in position order.
        """
        chunk_data = [
            {
                "id": str(uuid.uuid4()),
                "note_id": note_id,
                "note_title": note_title,
                "text": c["text"],
                "embedding": c["embedding"],
                "position": c["position"],
            }
            for c in sorted(chunks, key=lambda c: c["position"])
        ]

        create_query = """
            UNWIND $chunks AS chunk
            MATCH (n:Note {id: $note_id})
            CREATE (c:Chunk:NoteChunk {
                id: chunk.id,
                note_id: $note_id,
                note_title: $note_title,
                text: chunk.text,
                embedding: chunk.embedding,
                position: chunk.position
            })
            CREATE (n)-[:HAS_CHUNK]->(c)
            RETURN c.id AS id
        """

        next_query = """
            MATCH (n:Note {id: $note_id})-[:HAS_CHUNK]->(c:NoteChunk)
            WITH c ORDER BY c.position
            WITH collect(c) AS ordered
            UNWIND range(0, size(ordered) - 2) AS i
            WITH ordered[i] AS prev, ordered[i + 1] AS nxt
            MERGE (prev)-[:NEXT]->(nxt)
        """

        async with self._driver.session() as session:
            tx = await session.begin_transaction()
            try:
                result = await tx.run(
                    create_query,
                    chunks=chunk_data,
                    note_id=note_id,
                    note_title=note_title,
                )
                records = await result.data()
                chunk_ids = [r["id"] for r in records]

                if len(chunk_ids) > 1:
                    await tx.run(next_query, note_id=note_id)

                await tx.commit()
                return chunk_ids
            except Exception:
                await tx.rollback()
                raise

    async def delete_by_note(self, note_id: str) -> int:
        """DETACH DELETE all NoteChunks for a note. Returns count deleted."""
        query = """
            MATCH (n:Note {id: $note_id})-[:HAS_CHUNK]->(c:NoteChunk)
            DETACH DELETE c
        """
        async with self._driver.session() as session:
            result = await session.run(query, note_id=note_id)
            summary = await result.consume()
            return summary.counters.nodes_deleted
