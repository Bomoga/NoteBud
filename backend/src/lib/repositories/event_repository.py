from __future__ import annotations

import uuid
from datetime import datetime, timezone, date

from neo4j import AsyncDriver
from neo4j.time import DateTime as Neo4jDateTime

from src.lib.schemas.event import CalendarEventCreate, CalendarEventUpdate


def _node_to_dict(node) -> dict:
    props = dict(node)
    for key in ("created_at", "updated_at"):
        val = props.get(key)
        if isinstance(val, Neo4jDateTime):
            props[key] = val.to_native()
    # date is stored as an ISO string "YYYY-MM-DD"
    val = props.get("date")
    if isinstance(val, str):
        props["date"] = date.fromisoformat(val)
    return props


class CalendarEventRepository:
    def __init__(self, driver: AsyncDriver):
        self._driver = driver

    async def create(self, data: CalendarEventCreate, owner_id: str) -> dict:
        event_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        query = """
            CREATE (e:CalendarEvent {
                id: $id,
                title: $title,
                date: $date,
                event_type: $event_type,
                description: $description,
                notebook_id: $notebook_id,
                owner_id: $owner_id,
                created_at: $now,
                updated_at: $now
            })
            RETURN e
        """
        async with self._driver.session() as session:
            result = await session.run(
                query,
                id=event_id,
                title=data.title,
                date=data.date.isoformat(),
                event_type=data.event_type.value,
                description=data.description,
                notebook_id=data.notebook_id,
                owner_id=owner_id,
                now=now,
            )
            record = await result.single()
            return _node_to_dict(record["e"])

    async def list(self, owner_id: str) -> list[dict]:
        query = """
            MATCH (e:CalendarEvent {owner_id: $owner_id})
            RETURN e ORDER BY e.date ASC
        """
        async with self._driver.session() as session:
            result = await session.run(query, owner_id=owner_id)
            return [_node_to_dict(r["e"]) async for r in result]

    async def get_by_id(self, event_id: str, owner_id: str) -> dict | None:
        query = "MATCH (e:CalendarEvent {id: $id, owner_id: $owner_id}) RETURN e"
        async with self._driver.session() as session:
            result = await session.run(query, id=event_id, owner_id=owner_id)
            record = await result.single()
            if record is None:
                return None
            return _node_to_dict(record["e"])

    async def update(self, event_id: str, data: CalendarEventUpdate, owner_id: str) -> dict | None:
        updates = data.model_dump(exclude_unset=True)
        if "date" in updates:
            updates["date"] = updates["date"].isoformat()
        if "event_type" in updates:
            updates["event_type"] = updates["event_type"].value
        if not updates:
            return await self.get_by_id(event_id, owner_id)
        now = datetime.now(timezone.utc)
        query = """
            MATCH (e:CalendarEvent {id: $id, owner_id: $owner_id})
            SET e += $updates, e.updated_at = $updated_at
            RETURN e
        """
        async with self._driver.session() as session:
            result = await session.run(
                query,
                id=event_id,
                owner_id=owner_id,
                updates=updates,
                updated_at=now,
            )
            record = await result.single()
            if record is None:
                return None
            return _node_to_dict(record["e"])

    async def delete(self, event_id: str, owner_id: str) -> bool:
        query = "MATCH (e:CalendarEvent {id: $id, owner_id: $owner_id}) DELETE e"
        async with self._driver.session() as session:
            result = await session.run(query, id=event_id, owner_id=owner_id)
            summary = await result.consume()
            return summary.counters.nodes_deleted > 0
