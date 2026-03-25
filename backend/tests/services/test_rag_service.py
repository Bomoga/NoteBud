"""
Tests for GraphRAGService cross-notebook retrieval.

GraphRAGService is a stub until S3-18 (ML team).  Tests that depend on the
real query() implementation are marked xfail — the graph setup and assertion
structure are written now so the ML team can un-xfail them in S3-18.

Graph topology seeded per test:
    Notebook A  -[:FOR_COURSE]->  Course CALC2
    Notebook B  -[:FOR_COURSE]->  Course CALC1
    CALC1  -[:PREREQUISITE_OF]->  CALC2

    Notebook A has 2 ContentChunk nodes (via Document)
    Notebook B has 2 ContentChunk nodes (via Document)
    One SIMILAR edge crosses: chunk_a0 -[:SIMILAR]-> chunk_b0

Isolated Notebook C has no FOR_COURSE edge and no Course relationship.
"""
import uuid
import pytest

from src.services.rag.graph_rag_service import GraphRAGService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_notebook_with_chunks(driver, title: str, course_code: str, n_chunks: int = 2):
    """Create Notebook → Document → n ContentChunk nodes. Return notebook dict + chunk id list."""
    from src.lib.schemas.notebook import NotebookCreate
    from src.lib.repositories.notebook_repository import NotebookRepository
    from src.lib.repositories.document_repository import DocumentRepository

    nb = await NotebookRepository(driver).create(NotebookCreate(title=title, course_code=course_code))
    doc_id = str(uuid.uuid4())
    doc_repo = DocumentRepository(driver)
    await doc_repo.create(id=doc_id, gcs_uri=f"gs://t/{doc_id}", filename="f.pdf", file_type="application/pdf")
    await doc_repo.link_to_notebook(doc_id=doc_id, notebook_id=nb["id"])

    chunk_ids = []
    async with driver.session() as session:
        for i in range(n_chunks):
            cid = str(uuid.uuid4())
            chunk_ids.append(cid)
            await session.run(
                """
                MATCH (d:Document {id: $doc_id})
                CREATE (c:Chunk:ContentChunk {id: $id, text: $text, embedding: $emb, position: $pos, document_id: $doc_id})
                CREATE (d)-[:HAS_CHUNK]->(c)
                """,
                doc_id=doc_id, id=cid, text=f"{title} chunk {i}",
                emb=[0.1] * 768, pos=i,
            )
    return nb, chunk_ids


async def _link_notebook_to_course(driver, notebook_id: str, course_code: str):
    async with driver.session() as session:
        await session.run(
            "MATCH (nb:Notebook {id: $nb_id}), (c:Course {code: $code}) MERGE (nb)-[:FOR_COURSE]->(c)",
            nb_id=notebook_id, code=course_code,
        )


# ---------------------------------------------------------------------------
# Fixture: synthetic cross-notebook graph
# ---------------------------------------------------------------------------

@pytest.fixture
async def cross_notebook_graph(neo4j_driver):
    from src.lib.repositories.course_repository import CourseRepository

    course_repo = CourseRepository(neo4j_driver)
    await course_repo.create_or_merge("CALC1", "Calculus 1")
    await course_repo.create_or_merge("CALC2", "Calculus 2")
    await course_repo.add_prerequisite(from_code="CALC1", to_code="CALC2")

    nb_a, chunks_a = await _create_notebook_with_chunks(neo4j_driver, "NB-A", "CALC2")
    nb_b, chunks_b = await _create_notebook_with_chunks(neo4j_driver, "NB-B", "CALC1")

    await _link_notebook_to_course(neo4j_driver, nb_a["id"], "CALC2")
    await _link_notebook_to_course(neo4j_driver, nb_b["id"], "CALC1")

    # Cross-notebook SIMILAR edge
    async with neo4j_driver.session() as session:
        await session.run(
            "MATCH (a:ContentChunk {id: $a}), (b:ContentChunk {id: $b}) MERGE (a)-[:SIMILAR]->(b)",
            a=chunks_a[0], b=chunks_b[0],
        )

    return {"nb_a": nb_a, "nb_b": nb_b, "chunks_a": chunks_a, "chunks_b": chunks_b}


# ---------------------------------------------------------------------------
# xfail tests — structure written now; un-xfail when S3-18 lands
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.xfail(reason="GraphRAGService.query() stub — pending S3-18 ML implementation", strict=False)
async def test_rag_returns_context_from_both_notebooks(neo4j_driver, cross_notebook_graph):
    """When two notebooks share a course relationship, query on NB-A should
    include context chunks from NB-B (connected via SIMILAR + PREREQUISITE_OF)."""
    svc = GraphRAGService(neo4j_driver)
    result = await svc.query(cross_notebook_graph["nb_a"]["id"], "test query")

    assert result["answer"] != "RAG service pending ML implementation", (
        "Real answer expected once S3-18 is implemented"
    )
    assert len(result["sources"]) > 0, "Sources should include cross-notebook chunks"


@pytest.mark.asyncio
@pytest.mark.xfail(reason="GraphRAGService.query() stub — pending S3-18 ML implementation", strict=False)
async def test_isolated_notebook_gets_no_cross_notebook_context(neo4j_driver):
    """A notebook with no FOR_COURSE edge should never receive cross-notebook context."""
    nb_isolated, _ = await _create_notebook_with_chunks(neo4j_driver, "Isolated NB", "ISOLATED101")
    # Intentionally do NOT link to any Course node

    svc = GraphRAGService(neo4j_driver)
    result = await svc.query(nb_isolated["id"], "test query")

    assert result["answer"] != "RAG service pending ML implementation"
    for source in result.get("sources", []):
        assert "Isolated NB" in source or source == nb_isolated["id"], (
            "Isolated notebook must not receive chunks from other notebooks"
        )


@pytest.mark.asyncio
async def test_syllabus_chunks_never_in_retrieval_context(neo4j_driver):
    """SyllabusChunk nodes must never appear in RAG context regardless of graph topology."""
    # Create a SyllabusChunk and verify it is not labelled ContentChunk
    syl_id = str(uuid.uuid4())
    async with neo4j_driver.session() as session:
        await session.run(
            "CREATE (c:Chunk:SyllabusChunk {id: $id, text: 'syllabus text', embedding: $emb, position: 0})",
            id=syl_id, emb=[0.1] * 768,
        )
        # Confirm it is NOT a ContentChunk
        result = await session.run(
            "MATCH (c:SyllabusChunk {id: $id}) WHERE NOT c:ContentChunk RETURN count(c) AS n",
            id=syl_id,
        )
        record = await result.single()
        assert record["n"] == 1, "SyllabusChunk must not carry the ContentChunk label"

        # Confirm it does not appear in the ContentChunk vector index scope
        result = await session.run(
            "MATCH (c:ContentChunk {id: $id}) RETURN count(c) AS n",
            id=syl_id,
        )
        record = await result.single()
        assert record["n"] == 0, "SyllabusChunk must be invisible to ContentChunk queries"
