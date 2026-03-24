from neo4j import AsyncDriver


class GraphRAGService:
    """Stub — full implementation by ML team in S3-18."""

    def __init__(self, driver: AsyncDriver):
        self._driver = driver

    async def query(self, notebook_id: str, query_text: str) -> dict:
        return {
            "answer": "RAG service pending ML implementation",
            "sources": [],
        }
