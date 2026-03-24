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
    ) -> dict:
        """MERGE a :Document node with all properties. Idempotent on id."""
        query = """
            MERGE (d:Document {id: $id})
            SET d.gcs_uri   = $gcs_uri,
                d.filename  = $filename,
                d.file_type = $file_type
            RETURN d
        """
        async with self._driver.session() as session:
            result = await session.run(
                query,
                id=id,
                gcs_uri=gcs_uri,
                filename=filename,
                file_type=file_type,
            )
            record = await result.single()
            return dict(record["d"])

    async def link_to_notebook(self, doc_id: str, notebook_id: str) -> None:
        """Create a :CONTAINS edge from Notebook to Document."""
        query = """
            MATCH (nb:Notebook {id: $notebook_id}),
                  (d:Document  {id: $doc_id})
            MERGE (nb)-[:CONTAINS]->(d)
        """
        async with self._driver.session() as session:
            await session.run(query, notebook_id=notebook_id, doc_id=doc_id)
