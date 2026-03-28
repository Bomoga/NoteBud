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
            if record is None:
                # Fallback to a minimal representation if no record is returned
                return {"id": user_id}
            user_node = record.get("u")
            if user_node is None:
                # Fallback to a minimal representation if the expected key is missing
                return {"id": user_id}
            return dict(user_node)
