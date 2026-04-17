from neo4j import AsyncDriver


class CourseRepository:
    def __init__(self, driver: AsyncDriver):
        self._driver = driver

    async def create_or_merge(
        self, code: str, name: str, subject: str | None = None
    ) -> dict:
        """MERGE a Course node and, if subject is given, a Subject node linked by BELONGS_TO."""
        async with self._driver.session() as session:
            result = await session.run(
                "MERGE (c:Course {code: $code}) SET c.name = $name RETURN c",
                code=code,
                name=name,
            )
            record = await result.single()
            course = dict(record["c"])

            if subject is not None:
                await session.run(
                    """
                    MERGE (s:Subject {name: $subject})
                    WITH s
                    MATCH (c:Course {code: $code})
                    MERGE (c)-[:BELONGS_TO]->(s)
                    """,
                    subject=subject,
                    code=code,
                )

        return course

    async def add_prerequisite(self, from_code: str, to_code: str) -> None:
        """Create a directed PREREQUISITE_OF edge: from_code is a prerequisite of to_code."""
        query = """
            MATCH (a:Course {code: $from_code}), (b:Course {code: $to_code})
            MERGE (a)-[:PREREQUISITE_OF]->(b)
        """
        async with self._driver.session() as session:
            await session.run(query, from_code=from_code, to_code=to_code)

    async def add_relates_to(
        self, from_code: str, to_code: str, weight: float
    ) -> None:
        """Create bidirectional RELATES_TO edges with a weight property."""
        query = """
            MATCH (a:Course {code: $from_code}), (b:Course {code: $to_code})
            MERGE (a)-[r1:RELATES_TO]->(b) SET r1.weight = $weight
            MERGE (b)-[r2:RELATES_TO]->(a) SET r2.weight = $weight
        """
        async with self._driver.session() as session:
            await session.run(
                query, from_code=from_code, to_code=to_code, weight=weight
            )

    async def get_related_courses(self, code: str) -> list[dict]:
        """Return courses connected by PREREQUISITE_OF or RELATES_TO within 1–2 hops.

        Uses undirected traversal so both edge directions are followed.
        """
        query = """
            MATCH (c:Course {code: $code})
                  -[:PREREQUISITE_OF|RELATES_TO*1..2]-
                  (related:Course)
            WHERE related.code <> $code
            RETURN DISTINCT related
        """
        async with self._driver.session() as session:
            result = await session.run(query, code=code)
            return [dict(record["related"]) async for record in result]