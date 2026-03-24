import uuid
from datetime import datetime, timezone

from neo4j import AsyncDriver
from neo4j.time import DateTime as Neo4jDateTime

from src.lib.schemas.notebook import NotebookCreate, NotebookUpdate


def _node_to_dict(node) -> dict:
    """Convert a Neo4j Notebook node to a plain dict matching NotebookRead."""
    props = dict(node)
    for key in ("created_at", "updated_at"):
        val = props.get(key)
        if isinstance(val, Neo4jDateTime):
            props[key] = val.to_native()
    return props


class NotebookRepository:
    def __init__(self, driver: AsyncDriver):
        self._driver = driver

    async def create(self, data: NotebookCreate) -> dict:
        notebook_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        query = """
            MERGE (n:Notebook {id: $id})
            ON CREATE SET
                n.title = $title,
                n.course_code = $course_code,
                n.description = $description,
                n.created_at = $now,
                n.updated_at = $now,
                n.owner_id = $owner_id
            ON MATCH SET
                n.title = $title,
                n.course_code = $course_code,
                n.description = $description,
                n.updated_at = $now,
                n.owner_id = $owner_id
            RETURN n
        """
        async with self._driver.session() as session:
            result = await session.run(
                query,
                id=notebook_id,
                title=data.title,
                course_code=data.course_code,
                description=data.description,
                now=now,
                owner_id=None,
            )
            record = await result.single()
            return _node_to_dict(record["n"])

    async def get_by_id(self, notebook_id: str) -> dict | None:
        query = "MATCH (n:Notebook {id: $id}) RETURN n"
        async with self._driver.session() as session:
            result = await session.run(query, id=notebook_id)
            record = await result.single()
            if record is None:
                return None
            return _node_to_dict(record["n"])

    async def list(self) -> list[dict]:
        query = "MATCH (n:Notebook) RETURN n ORDER BY n.created_at DESC"
        async with self._driver.session() as session:
            result = await session.run(query)
            return [_node_to_dict(record["n"]) async for record in result]

    async def update(self, notebook_id: str, data: NotebookUpdate) -> dict | None:
        updates = data.model_dump(exclude_unset=True)
        if not updates:
            return await self.get_by_id(notebook_id)
        now = datetime.now(timezone.utc)
        # SET n += $updates merges the dict onto the node — fully parameterized,
        # no string interpolation of user data.
        query = """
            MATCH (n:Notebook {id: $id})
            SET n += $updates, n.updated_at = $updated_at
            RETURN n
        """
        async with self._driver.session() as session:
            result = await session.run(
                query,
                id=notebook_id,
                updates=updates,
                updated_at=now,
            )
            record = await result.single()
            if record is None:
                return None
            return _node_to_dict(record["n"])

    async def delete(self, notebook_id: str) -> bool:
        query = "MATCH (n:Notebook {id: $id}) DETACH DELETE n"
        async with self._driver.session() as session:
            result = await session.run(query, id=notebook_id)
            summary = await result.consume()
            return summary.counters.nodes_deleted > 0