import uuid

from neo4j import AsyncDriver


def _node_to_dict(node) -> dict:
    return dict(node)


class ChunkRepository:
    def __init__(self, driver: AsyncDriver):
        self._driver = driver

    async def create_chunks(
        self,
        chunks: list[dict],
        document_id: str,
        source_type: str,
    ) -> list[str]:
        """Create chunk nodes, HAS_CHUNK edges from Document, and NEXT edges.

        Each chunk dict must contain: text (str), embedding (list[float]),
        position (int, 0-based).

        Labels applied per chunk:
          source_type="content"  → :Chunk:ContentChunk
          source_type="syllabus" → :Chunk:SyllabusChunk

        Returns chunk IDs in position order.
        """
        if source_type == "content":
            type_label = "ContentChunk"
        elif source_type == "syllabus":
            type_label = "SyllabusChunk"
        else:
            raise ValueError(
                f"source_type must be 'content' or 'syllabus', got {source_type!r}"
            )

        chunk_data = [
            {
                "id": str(uuid.uuid4()),
                "text": c["text"],
                "embedding": c["embedding"],   # stored as list[float], never a string
                "position": c["position"],
                "document_id": document_id,
                "source_file": c.get("source_file"),
                "page_number": c.get("page_number"),
                "slide_number": c.get("slide_number"),
            }
            for c in sorted(chunks, key=lambda c: c["position"])
        ]

        # type_label is a validated constant ("ContentChunk" or "SyllabusChunk"),
        # not user input — safe to interpolate for the label only.
        create_query = f"""
            UNWIND $chunks AS chunk
            MATCH (d:Document {{id: $document_id}})
            CREATE (c:Chunk:{type_label} {{
                id: chunk.id,
                text: chunk.text,
                embedding: chunk.embedding,
                position: chunk.position,
                document_id: $document_id,
                source_file: chunk.source_file,
                page_number: chunk.page_number,
                slide_number: chunk.slide_number
            }})
            CREATE (d)-[:HAS_CHUNK]->(c)
            RETURN c.id AS id
        """

        # NEXT edges link consecutive chunks in position order.
        next_query = """
            MATCH (d:Document {id: $document_id})
            OPTIONAL MATCH (d)-[:HAS_CHUNK]->(:Chunk)-[r:NEXT]->(:Chunk)
            DELETE r
            WITH d
            MATCH (d)-[:HAS_CHUNK]->(c:Chunk)
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
                    document_id=document_id,
                )
                records = await result.data()
                chunk_ids = [r["id"] for r in records]

                if len(chunk_ids) > 1:
                    await tx.run(next_query, document_id=document_id)

                await tx.commit()
                return chunk_ids
            except Exception:
                await tx.rollback()
                raise

    async def get_by_notebook(self, notebook_id: str) -> list[dict]:
        """Return all ContentChunks for a notebook, ordered by position.

        Scoped to :ContentChunk to exclude :SyllabusChunk nodes, which carry
        zero embeddings and must never enter vector search.
        """
        query = """
            MATCH (nb:Notebook {id: $notebook_id})
                  -[:CONTAINS]->(d:Document)
                  -[:HAS_CHUNK]->(c:ContentChunk)
            RETURN c
            ORDER BY c.position
        """
        async with self._driver.session() as session:
            result = await session.run(query, notebook_id=notebook_id)
            return [_node_to_dict(record["c"]) async for record in result]

    async def delete_by_notebook(self, notebook_id: str) -> int:
        """DETACH DELETE all chunks for a notebook. Returns count deleted."""
        query = """
            MATCH (nb:Notebook {id: $notebook_id})
                  -[:CONTAINS]->(d:Document)
                  -[:HAS_CHUNK]->(c:Chunk)
            DETACH DELETE c
        """
        async with self._driver.session() as session:
            result = await session.run(query, notebook_id=notebook_id)
            summary = await result.consume()
            return summary.counters.nodes_deleted
