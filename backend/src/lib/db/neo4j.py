from neo4j import AsyncGraphDatabase
from src.lib.config.settings import settings

_driver = AsyncGraphDatabase.driver(
    settings.NEO4J_URI,
    auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
)


def get_driver():
    """Return the initialized async Neo4j driver."""
    return _driver


async def close_driver():
    """Close the driver and release all connections. Call on app shutdown."""
    await _driver.close()