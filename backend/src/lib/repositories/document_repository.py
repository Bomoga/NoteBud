from neo4j import AsyncDriver


class DocumentRepository:
    def __init__(self, driver: AsyncDriver):
        self._driver = driver

    async def create(
        self,
        id: str,
        gcs_uri: str,
        filename: str,
        file_type: str,
        source_type: str = "content",
    ) -> dict:
        """MERGE a :Document node with all properties. Idempotent on id."""
        query = """
            MERGE (d:Document {id: $id})
            SET d.gcs_uri      = $gcs_uri,
                d.filename     = $filename,
                d.file_type    = $file_type,
                d.source_type  = $source_type,
                d.status       = "processing"
            RETURN d
        """
        async with self._driver.session() as session:
            result = await session.run(
                query,
                id=id,
                gcs_uri=gcs_uri,
                filename=filename,
                file_type=file_type,
                source_type=source_type,
            )
            record = await result.single()
            return dict(record["d"])

    async def list_by_notebook(self, notebook_id: str) -> list[dict]:
        """Return all documents linked to a notebook, ordered by filename."""
        query = """
            MATCH (nb:Notebook {id: $notebook_id})-[:CONTAINS]->(d:Document)
            RETURN d
            ORDER BY d.filename
        """
        async with self._driver.session() as session:
            result = await session.run(query, notebook_id=notebook_id)
            rows = []
            async for record in result:
                doc = dict(record["d"])
                # Default source_type for documents created before this field was added
                doc.setdefault("source_type", "content")
                rows.append(doc)
            return rows

    async def update_status(self, doc_id: str, status: str) -> None:
        """Update the status field on a Document node."""
        query = """
            MATCH (d:Document {id: $doc_id})
            SET d.status = $status
        """
        async with self._driver.session() as session:
            await session.run(query, doc_id=doc_id, status=status)

    async def link_to_notebook(self, doc_id: str, notebook_id: str) -> None:
        """Create a :CONTAINS edge from Notebook to Document."""
        query = """
            MATCH (nb:Notebook {id: $notebook_id}),
                  (d:Document  {id: $doc_id})
            MERGE (nb)-[:CONTAINS]->(d)
        """
        async with self._driver.session() as session:
            await session.run(query, notebook_id=notebook_id, doc_id=doc_id)
