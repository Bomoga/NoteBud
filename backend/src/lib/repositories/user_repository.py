from neo4j import AsyncDriver


class UserRepository:
    def __init__(self, driver: AsyncDriver):
        self._driver = driver

    async def create_or_get(self, user_id: str) -> dict:
        """Upsert a :User node by ID and return its properties."""
        query = """
            MERGE (u:User {id: $user_id})
            RETURN u
        """
        async with self._driver.session() as session:
            result = await session.run(query, user_id=user_id)
            record = await result.single()
            return dict(record["u"])
