import pytest
from testcontainers.neo4j import Neo4jContainer

from src.lib.db.neo4j import startup


@pytest.fixture(scope="session")
def neo4j_container():
    """Start a real Neo4j container for the entire test session."""
    with Neo4jContainer("neo4j:2025.01").with_env(
        "NEO4J_PLUGINS", '["apoc"]'
    ) as container:
        yield container


@pytest.fixture(scope="session")
async def neo4j_driver(neo4j_container):
    """Connect to the test container and apply constraints + vector index."""
    from neo4j import AsyncGraphDatabase

    driver = AsyncGraphDatabase.driver(
        neo4j_container.get_connection_url(),
        auth=(neo4j_container.username, neo4j_container.password),
    )
    await startup.__wrapped__(driver) if hasattr(startup, "__wrapped__") else await _run_startup(driver)
    yield driver
    await driver.close()


async def _run_startup(driver):
    """Run the same DDL statements as startup() against an injected driver."""
    from src.lib.db.neo4j import _STARTUP_CYPHER

    async with driver.session() as session:
        for statement in _STARTUP_CYPHER:
            await session.run(statement)
