from __future__ import annotations

import uuid
from datetime import datetime, timezone

from neo4j import AsyncDriver
from neo4j.time import DateTime as Neo4jDateTime


def _coerce_dates(d: dict) -> dict:
    for key in ("created_at",):
        val = d.get(key)
        if isinstance(val, Neo4jDateTime):
            d[key] = val.to_native()
    return d


class NotebookLinkRepository:
    def __init__(self, driver: AsyncDriver):
        self._driver = driver

    async def create(self, from_id: str, to_id: str, link_type: str) -> dict | None:
        link_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        # MERGE on the structural triple so duplicate links can't be created
        query = """
            MATCH (a:Notebook {id: $from_id})
            MATCH (b:Notebook {id: $to_id})
            MERGE (a)-[r:NOTEBOOK_LINK {from_notebook_id: $from_id,
                                         to_notebook_id:   $to_id,
                                         link_type:        $link_type}]->(b)
            ON CREATE SET r.id = $id, r.created_at = $now
            RETURN r,
                   a.title      AS from_title, a.course_code AS from_code,
                   b.title      AS to_title,   b.course_code AS to_code
        """
        async with self._driver.session() as session:
            result = await session.run(
                query,
                from_id=from_id, to_id=to_id,
                link_type=link_type, id=link_id, now=now,
            )
            record = await result.single()
            if record is None:
                return None
            r = _coerce_dates(dict(record["r"]))
            return {
                "id": r["id"],
                "from_notebook_id": from_id,
                "to_notebook_id": to_id,
                "to_notebook_title": record["to_title"],
                "to_notebook_course_code": record["to_code"],
                "link_type": link_type,
                "created_at": r["created_at"],
            }

    async def list_outbound(self, notebook_id: str) -> list[dict]:
        query = """
            MATCH (a:Notebook {id: $notebook_id})-[r:NOTEBOOK_LINK]->(b:Notebook)
            RETURN r, b.id AS to_id, b.title AS to_title, b.course_code AS to_code
            ORDER BY r.created_at DESC
        """
        async with self._driver.session() as session:
            result = await session.run(query, notebook_id=notebook_id)
            rows = []
            async for record in result:
                r = _coerce_dates(dict(record["r"]))
                rows.append({
                    "id": r["id"],
                    "from_notebook_id": notebook_id,
                    "to_notebook_id": record["to_id"],
                    "to_notebook_title": record["to_title"],
                    "to_notebook_course_code": record["to_code"],
                    "link_type": r["link_type"],
                    "created_at": r["created_at"],
                })
            return rows

    async def list_inbound(self, notebook_id: str) -> list[dict]:
        query = """
            MATCH (a:Notebook)-[r:NOTEBOOK_LINK]->(b:Notebook {id: $notebook_id})
            RETURN r, a.id AS from_id, a.title AS from_title, a.course_code AS from_code
            ORDER BY r.created_at DESC
        """
        async with self._driver.session() as session:
            result = await session.run(query, notebook_id=notebook_id)
            rows = []
            async for record in result:
                r = _coerce_dates(dict(record["r"]))
                rows.append({
                    "id": r["id"],
                    "from_notebook_id": record["from_id"],
                    "from_notebook_title": record["from_title"],
                    "from_notebook_course_code": record["from_code"],
                    "to_notebook_id": notebook_id,
                    "link_type": r["link_type"],
                    "created_at": r["created_at"],
                })
            return rows

    async def delete(self, link_id: str, owner_notebook_id: str) -> bool:
        """Delete a link only if it originates from owner_notebook_id."""
        query = """
            MATCH (a:Notebook {id: $owner_id})-[r:NOTEBOOK_LINK {id: $link_id}]->(:Notebook)
            DELETE r
            RETURN 1 AS deleted
        """
        async with self._driver.session() as session:
            result = await session.run(
                query, link_id=link_id, owner_id=owner_notebook_id
            )
            record = await result.single()
            return record is not None

    async def list_all_for_user(self, user_id: str) -> list[dict]:
        """Return all NOTEBOOK_LINK edges where either endpoint belongs to the user."""
        query = """
            MATCH (a:Notebook)-[r:NOTEBOOK_LINK]->(b:Notebook)
            WHERE a.owner_id = $user_id OR b.owner_id = $user_id
            RETURN r.id             AS id,
                   a.id             AS from_notebook_id,
                   b.id             AS to_notebook_id,
                   r.link_type      AS link_type,
                   r.created_at     AS created_at
        """
        async with self._driver.session() as session:
            result = await session.run(query, user_id=user_id)
            rows = []
            async for record in result:
                d = dict(record)
                if isinstance(d.get("created_at"), Neo4jDateTime):
                    d["created_at"] = d["created_at"].to_native()
                rows.append(d)
            return rows

    async def find_similar(self, notebook_id: str, owner_id: str) -> list[dict]:
        """Return other notebooks whose ContentChunks are SIMILAR to this one's."""
        query = """
            MATCH (nb:Notebook {id: $notebook_id})
                  -[:CONTAINS]->(d:Document)
                  -[:HAS_CHUNK]->(c:ContentChunk)
                  -[sim:SIMILAR]-(oc:ContentChunk)
                  <-[:HAS_CHUNK]-(:Document)
                  <-[:CONTAINS]-(other:Notebook)
            WHERE other.id <> $notebook_id
              AND other.owner_id = $owner_id
            WITH other, sim.score AS score
            WITH other, avg(score) AS avg_score, count(score) AS hit_count
            WHERE hit_count >= 2
            RETURN other.id       AS notebook_id,
                   other.title    AS title,
                   other.course_code AS course_code,
                   round(avg_score * 1000) / 1000 AS avg_score,
                   hit_count
            ORDER BY hit_count DESC, avg_score DESC
            LIMIT 10
        """
        async with self._driver.session() as session:
            result = await session.run(
                query, notebook_id=notebook_id, owner_id=owner_id
            )
            return [dict(record) async for record in result]
