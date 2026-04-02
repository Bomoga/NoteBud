import uuid
from datetime import datetime, timezone

from neo4j import AsyncDriver
from neo4j.time import DateTime as Neo4jDateTime

from src.lib.schemas.note import NoteCreate, NoteUpdate


def _node_to_dict(node) -> dict:
    """Convert a Neo4j Note node to a plain dict matching NoteRead."""
    props = dict(node)
    for key in ("created_at", "updated_at"):
        val = props.get(key)
        if isinstance(val, Neo4jDateTime):
            props[key] = val.to_native()
    return props


class NoteRepository:
    def __init__(self, driver: AsyncDriver):
        self._driver = driver

    async def create(self, notebook_id: str, data: NoteCreate, owner_id: str) -> dict:
        note_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        query = """
            MATCH (nb:Notebook {id: $notebook_id})
            CREATE (n:Note {
                id: $id,
                notebook_id: $notebook_id,
                title: $title,
                content: $content,
                created_at: $now,
                updated_at: $now,
                owner_id: $owner_id
            })
            CREATE (nb)-[:HAS_NOTE]->(n)
            RETURN n
        """
        async with self._driver.session() as session:
            result = await session.run(
                query,
                notebook_id=notebook_id,
                id=note_id,
                title=data.title,
                content=data.content,
                now=now,
                owner_id=owner_id,
            )
            record = await result.single()
            return _node_to_dict(record["n"])

    async def get_by_id(self, note_id: str) -> dict | None:
        query = "MATCH (n:Note {id: $id}) RETURN n"
        async with self._driver.session() as session:
            result = await session.run(query, id=note_id)
            record = await result.single()
            if record is None:
                return None
            return _node_to_dict(record["n"])

    async def list(self, notebook_id: str) -> list[dict]:
        query = """
            MATCH (nb:Notebook {id: $notebook_id})-[:HAS_NOTE]->(n:Note)
            RETURN n ORDER BY n.created_at ASC
        """
        async with self._driver.session() as session:
            result = await session.run(query, notebook_id=notebook_id)
            return [_node_to_dict(record["n"]) async for record in result]

    async def update(self, note_id: str, data: NoteUpdate) -> dict | None:
        updates = data.model_dump(exclude_unset=True)
        if not updates:
            return await self.get_by_id(note_id)
        now = datetime.now(timezone.utc)
        query = """
            MATCH (n:Note {id: $id})
            SET n += $updates, n.updated_at = $updated_at
            RETURN n
        """
        async with self._driver.session() as session:
            result = await session.run(
                query,
                id=note_id,
                updates=updates,
                updated_at=now,
            )
            record = await result.single()
            if record is None:
                return None
            return _node_to_dict(record["n"])

    async def delete(self, note_id: str) -> bool:
        query = "MATCH (n:Note {id: $id}) DETACH DELETE n"
        async with self._driver.session() as session:
            result = await session.run(query, id=note_id)
            summary = await result.consume()
            return summary.counters.nodes_deleted > 0
