import uuid

from neo4j import AsyncDriver


class UserRepository:
    def __init__(self, driver: AsyncDriver):
        self._driver = driver

    async def create_user(self, username: str, hashed_password: str) -> dict:
        """Create a new :User node with credentials. Raises ValueError if username taken."""
        existing = await self.get_by_username(username)
        if existing is not None:
            raise ValueError(f"Username '{username}' is already taken.")
        user_id = str(uuid.uuid4())
        query = """
            CREATE (u:User {id: $id, username: $username, hashed_password: $hashed_password})
            RETURN u
        """
        async with self._driver.session() as session:
            result = await session.run(
                query, id=user_id, username=username, hashed_password=hashed_password
            )
            record = await result.single()
            if record is None:
                raise RuntimeError("Failed to create user: database returned no record.")
            user_node = record.get("u")
            if user_node is None:
                raise RuntimeError("Failed to create user: missing 'u' node in database response.")
            return dict(user_node)

    async def get_by_username(self, username: str) -> dict | None:
        """Return a :User node by username, or None if not found."""
        query = "MATCH (u:User {username: $username}) RETURN u"
        async with self._driver.session() as session:
            result = await session.run(query, username=username)
            record = await result.single()
            if record is None:
                return None
            return dict(record["u"])

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
