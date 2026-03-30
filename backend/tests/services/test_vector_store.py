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


# ---------------------------------------------------------------------------
# SIMILAR edges (S3-16b)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_compute_similar_edges_creates_edges_for_identical_embeddings(neo4j_driver):
        """Two ContentChunk nodes with identical embeddings score 1.0 >= 0.80,
            so exactly one undirected SIMILAR edge must exist between them after
                store_chunks() is called for both documents.
                    """
        from src.lib.schemas.notebook import NotebookCreate
        from src.lib.repositories.notebook_repository import NotebookRepository
        from src.lib.repositories.document_repository import DocumentRepository

    nb = await NotebookRepository(neo4j_driver).create(
                NotebookCreate(title="Similar NB", course_code="SIM101")
    )

    doc_id_a = str(uuid.uuid4())
    doc_id_b = str(uuid.uuid4())
    for doc_id, uri, fname in [
                (doc_id_a, "gs://t/sim_a", "sim_a.pdf"),
                (doc_id_b, "gs://t/sim_b", "sim_b.pdf"),
    ]:
                await DocumentRepository(neo4j_driver).create(
                                id=doc_id, gcs_uri=uri, filename=fname, file_type="application/pdf"
                )
                await DocumentRepository(neo4j_driver).link_to_notebook(
                                doc_id=doc_id, notebook_id=nb["id"]
                )

    # Store first chunk (doc A) — no neighbours yet, so no edges.
    await store_chunks(neo4j_driver, _make_chunks(1, "sim"), doc_id_a, source_type="content")

    # Store second chunk (doc B) with the same embedding — should now find the
    # first chunk as a neighbour with score 1.0 and create a SIMILAR edge.
    await store_chunks(neo4j_driver, _make_chunks(1, "sim"), doc_id_b, source_type="content")

    async with neo4j_driver.session() as session:
                result = await session.run(
                                "MATCH (a:ContentChunk)-[:SIMILAR]-(b:ContentChunk) RETURN count(DISTINCT [a,b]) AS n"
                )
                record = await result.single()
                # At least one SIMILAR edge must have been created.
        assert record["n"] >= 1


@pytest.mark.asyncio
async def test_compute_similar_edges_not_called_for_syllabus(neo4j_driver):
        """Syllabus chunks must never acquire SIMILAR edges regardless of embedding
            similarity — this is enforced by store_chunks() gating on source_type.
                """
        from src.lib.schemas.notebook import NotebookCreate
        from src.lib.repositories.notebook_repository import NotebookRepository
        from src.lib.repositories.document_repository import DocumentRepository

    nb = await NotebookRepository(neo4j_driver).create(
                NotebookCreate(title="Syl Guard NB", course_code="SYL201")
    )
    doc_id = str(uuid.uuid4())
    await DocumentRepository(neo4j_driver).create(
                id=doc_id, gcs_uri="gs://t/sylg", filename="sylg.pdf", file_type="application/pdf"
    )
    await DocumentRepository(neo4j_driver).link_to_notebook(
                doc_id=doc_id, notebook_id=nb["id"]
    )

    # Store two syllabus chunks with identical embeddings.
    await store_chunks(neo4j_driver, _make_chunks(2, "syl"), doc_id, source_type="syllabus")

    async with neo4j_driver.session() as session:
                result = await session.run(
                                "MATCH (c:SyllabusChunk)-[:SIMILAR]-() RETURN count(c) AS n"
                )
                record = await result.single()
                assert record["n"] == 0
