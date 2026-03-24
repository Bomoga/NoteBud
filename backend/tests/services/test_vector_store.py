import uuid
import pytest

from src.services.vector_store.vector_store_service import store_chunks


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_chunks(n: int, text_prefix: str = "chunk") -> list[dict]:
    return [
        {"text": f"{text_prefix} {i}", "embedding": [0.1] * 768, "position": i}
        for i in range(n)
    ]


async def _create_document(driver, notebook_id: str) -> str:
    from src.lib.repositories.notebook_repository import NotebookRepository
    from src.lib.repositories.document_repository import DocumentRepository
    from src.lib.schemas.notebook import NotebookCreate

    nb_repo = NotebookRepository(driver)
    await nb_repo.create(NotebookCreate(title="Test NB", course_code="TEST101"))

    # Use a real notebook so CONTAINS edge can be created
    doc_id = str(uuid.uuid4())
    doc_repo = DocumentRepository(driver)
    await doc_repo.create(id=doc_id, gcs_uri="gs://test/doc", filename="test.pdf", file_type="application/pdf")
    await doc_repo.link_to_notebook(doc_id=doc_id, notebook_id=notebook_id)
    return doc_id


# ---------------------------------------------------------------------------
# content chunks
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_store_chunks_content_creates_correct_node_count(neo4j_driver):
    from src.lib.schemas.notebook import NotebookCreate
    from src.lib.repositories.notebook_repository import NotebookRepository
    from src.lib.repositories.document_repository import DocumentRepository

    nb = await NotebookRepository(neo4j_driver).create(
        NotebookCreate(title="Content NB", course_code="C101")
    )
    doc_id = str(uuid.uuid4())
    await DocumentRepository(neo4j_driver).create(
        id=doc_id, gcs_uri="gs://t/f", filename="file.pdf", file_type="application/pdf"
    )
    await DocumentRepository(neo4j_driver).link_to_notebook(doc_id=doc_id, notebook_id=nb["id"])

    chunks = _make_chunks(3)
    ids = await store_chunks(neo4j_driver, chunks, doc_id, source_type="content")

    assert len(ids) == 3
    assert all(isinstance(i, str) for i in ids)

    async with neo4j_driver.session() as session:
        result = await session.run(
            "MATCH (d:Document {id: $doc_id})-[:HAS_CHUNK]->(c:ContentChunk) RETURN count(c) AS n",
            doc_id=doc_id,
        )
        record = await result.single()
        assert record["n"] == 3


@pytest.mark.asyncio
async def test_store_chunks_content_has_chunk_edges(neo4j_driver):
    from src.lib.schemas.notebook import NotebookCreate
    from src.lib.repositories.notebook_repository import NotebookRepository
    from src.lib.repositories.document_repository import DocumentRepository

    nb = await NotebookRepository(neo4j_driver).create(
        NotebookCreate(title="Edge NB", course_code="E101")
    )
    doc_id = str(uuid.uuid4())
    await DocumentRepository(neo4j_driver).create(
        id=doc_id, gcs_uri="gs://t/f2", filename="file2.pdf", file_type="application/pdf"
    )
    await DocumentRepository(neo4j_driver).link_to_notebook(doc_id=doc_id, notebook_id=nb["id"])

    await store_chunks(neo4j_driver, _make_chunks(2), doc_id, source_type="content")

    async with neo4j_driver.session() as session:
        result = await session.run(
            "MATCH (d:Document {id: $doc_id})-[:HAS_CHUNK]->(c) RETURN count(c) AS n",
            doc_id=doc_id,
        )
        record = await result.single()
        assert record["n"] == 2


@pytest.mark.asyncio
async def test_store_chunks_content_next_edges_in_order(neo4j_driver):
    from src.lib.schemas.notebook import NotebookCreate
    from src.lib.repositories.notebook_repository import NotebookRepository
    from src.lib.repositories.document_repository import DocumentRepository

    nb = await NotebookRepository(neo4j_driver).create(
        NotebookCreate(title="Next NB", course_code="N101")
    )
    doc_id = str(uuid.uuid4())
    await DocumentRepository(neo4j_driver).create(
        id=doc_id, gcs_uri="gs://t/f3", filename="file3.pdf", file_type="application/pdf"
    )
    await DocumentRepository(neo4j_driver).link_to_notebook(doc_id=doc_id, notebook_id=nb["id"])

    await store_chunks(neo4j_driver, _make_chunks(4), doc_id, source_type="content")

    async with neo4j_driver.session() as session:
        result = await session.run(
            "MATCH (d:Document {id: $doc_id})-[:HAS_CHUNK]->(c)-[:NEXT]->() RETURN count(c) AS n",
            doc_id=doc_id,
        )
        record = await result.single()
        # 4 chunks → 3 NEXT edges
        assert record["n"] == 3


# ---------------------------------------------------------------------------
# syllabus chunks
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_store_chunks_syllabus_creates_syllabus_nodes(neo4j_driver):
    from src.lib.schemas.notebook import NotebookCreate
    from src.lib.repositories.notebook_repository import NotebookRepository
    from src.lib.repositories.document_repository import DocumentRepository

    nb = await NotebookRepository(neo4j_driver).create(
        NotebookCreate(title="Syllabus NB", course_code="S101")
    )
    doc_id = str(uuid.uuid4())
    await DocumentRepository(neo4j_driver).create(
        id=doc_id, gcs_uri="gs://t/syl", filename="syllabus.pdf", file_type="application/pdf"
    )
    await DocumentRepository(neo4j_driver).link_to_notebook(doc_id=doc_id, notebook_id=nb["id"])

    await store_chunks(neo4j_driver, _make_chunks(2), doc_id, source_type="syllabus")

    async with neo4j_driver.session() as session:
        result = await session.run(
            "MATCH (d:Document {id: $doc_id})-[:HAS_CHUNK]->(c:SyllabusChunk) RETURN count(c) AS n",
            doc_id=doc_id,
        )
        record = await result.single()
        assert record["n"] == 2


@pytest.mark.asyncio
async def test_store_chunks_syllabus_has_no_similar_edges(neo4j_driver):
    from src.lib.schemas.notebook import NotebookCreate
    from src.lib.repositories.notebook_repository import NotebookRepository
    from src.lib.repositories.document_repository import DocumentRepository

    nb = await NotebookRepository(neo4j_driver).create(
        NotebookCreate(title="Syllabus NB2", course_code="S102")
    )
    doc_id = str(uuid.uuid4())
    await DocumentRepository(neo4j_driver).create(
        id=doc_id, gcs_uri="gs://t/syl2", filename="syllabus2.pdf", file_type="application/pdf"
    )
    await DocumentRepository(neo4j_driver).link_to_notebook(doc_id=doc_id, notebook_id=nb["id"])

    await store_chunks(neo4j_driver, _make_chunks(2), doc_id, source_type="syllabus")

    async with neo4j_driver.session() as session:
        result = await session.run(
            "MATCH (c:SyllabusChunk)-[:SIMILAR]-() RETURN count(c) AS n"
        )
        record = await result.single()
        # compute_similar_edges is never called for syllabus — zero SIMILAR edges
        assert record["n"] == 0
