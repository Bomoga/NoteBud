import numpy as np
import pytest

from src.services.vector_store.vector_store_service import store_chunks, similarity_search


async def test_store_chunks_inserts_records(db_session):
    nb_id1, _ = db_session.test_notebook_ids
    chunks = [
        {"notebook_id": nb_id1, "file_id": 1, "text": "Chunk one",
         "metadata": {"source_file": "test.pdf", "page_number": 1}},
        {"notebook_id": nb_id1, "file_id": 1, "text": "Chunk two",
         "metadata": {"source_file": "test.pdf", "page_number": 2}},
    ]
    embeddings = [np.random.rand(768).tolist() for _ in range(2)]

    ids = await store_chunks(db_session, chunks, embeddings)

    assert len(ids) == 2
    assert all(isinstance(id_, str) for id_ in ids)


async def test_store_chunks_raises_on_length_mismatch(db_session):
    nb_id1, _ = db_session.test_notebook_ids
    chunks = [{"notebook_id": nb_id1, "text": "chunk"}]
    embeddings = []

    with pytest.raises(ValueError):
        await store_chunks(db_session, chunks, embeddings)


async def test_similarity_search_returns_similar_chunks(db_session):
    nb_id1, _ = db_session.test_notebook_ids

    # Base vector: unit vector along first dimension
    base = np.zeros(768).tolist()
    base[0] = 1.0

    # Similar: close to base
    similar = np.zeros(768).tolist()
    similar[0] = 0.95
    similar[1] = 0.05

    # Dissimilar: orthogonal to base
    dissimilar = np.zeros(768).tolist()
    dissimilar[500] = 1.0

    chunks = [
        {"notebook_id": nb_id1, "file_id": 1, "text": "Similar chunk", "metadata": {}},
        {"notebook_id": nb_id1, "file_id": 1, "text": "Dissimilar chunk", "metadata": {}},
    ]
    embeddings = [similar, dissimilar]

    await store_chunks(db_session, chunks, embeddings)
    results = await similarity_search(db_session, base, notebook_id=nb_id1, top_k=5)

    assert len(results) >= 1
    assert results[0]["text"] == "Similar chunk"
    assert results[0]["similarity_score"] >= 0.70


async def test_similarity_search_scoped_to_notebook(db_session):
    nb_id1, nb_id2 = db_session.test_notebook_ids
    embedding = np.random.rand(768).tolist()

    chunks = [
        {"notebook_id": nb_id1, "file_id": 1, "text": "Notebook 1 chunk", "metadata": {}},
        {"notebook_id": nb_id2, "file_id": 2, "text": "Notebook 2 chunk", "metadata": {}},
    ]
    embeddings = [embedding, embedding]

    await store_chunks(db_session, chunks, embeddings)
    results = await similarity_search(db_session, embedding, notebook_id=nb_id1, top_k=5)

    for r in results:
        assert r["text"] == "Notebook 1 chunk"


async def test_similarity_search_respects_top_k(db_session):
    nb_id1, _ = db_session.test_notebook_ids
    embedding = np.random.rand(768).tolist()

    chunks = [
        {"notebook_id": nb_id1, "text": f"Chunk {i}", "metadata": {}}
        for i in range(10)
    ]
    embeddings = [embedding for _ in range(10)]

    await store_chunks(db_session, chunks, embeddings)
    results = await similarity_search(db_session, embedding, notebook_id=nb_id1, top_k=3)

    assert len(results) <= 3
