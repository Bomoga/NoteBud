from neo4j import AsyncGraphDatabase
from src.lib.config.settings import settings

_driver = AsyncGraphDatabase.driver(
    settings.NEO4J_URI,
    auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
)

# DDL executed once at startup — all guarded by IF NOT EXISTS so safe to re-run.
# Chunk label convention: every chunk node carries BOTH :Chunk AND a type label
# (:ContentChunk or :SyllabusChunk).  The vector index is scoped to :ContentChunk
# only, permanently excluding syllabus scheduling data from similarity search.
_STARTUP_CYPHER = [
    "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Notebook) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Note) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Chunk) REQUIRE c.id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.username IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Course) REQUIRE c.code IS UNIQUE",
    (
        "CREATE VECTOR INDEX chunk_embeddings IF NOT EXISTS "
        "FOR (c:ContentChunk) ON (c.embedding) "
        "OPTIONS {indexConfig: {"
        "`vector.dimensions`: 768, "
        "`vector.similarity_function`: 'cosine'"
        "}}"
    ),
    (
        "CREATE VECTOR INDEX note_chunk_embeddings IF NOT EXISTS "
        "FOR (c:NoteChunk) ON (c.embedding) "
        "OPTIONS {indexConfig: {"
        "`vector.dimensions`: 768, "
        "`vector.similarity_function`: 'cosine'"
        "}}"
    ),
]


def get_driver():
    """Return the initialized async Neo4j driver."""
    return _driver


async def startup():
    """Apply schema constraints and vector index.

    Each statement uses IF NOT EXISTS — safe to call multiple times.
    Neo4j auto-commits DDL when run outside an explicit transaction.
    """
    async with _driver.session() as session:
        for statement in _STARTUP_CYPHER:
            await session.run(statement)


async def close_driver():
    """Close the driver and release all connections. Call on app shutdown."""
    await _driver.close()