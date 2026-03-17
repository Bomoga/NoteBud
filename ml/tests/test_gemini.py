import pytest
from ml.services.gemini import GeminiClient

EMBEDDING_DIM = 768


@pytest.fixture
def client():
    return GeminiClient()


def test_missing_api_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(ValueError, match="GEMINI_API_KEY"):
        GeminiClient()


@pytest.mark.skipif(
    os.getenv("GEMINI_API_KEY") is None,
    reason="GEMINI_API_KEY not set; skipping integration test that calls external Gemini API.",
)
def test_generate_embedding(client):
    result = client.generate_embedding("This is a sample study note about biology.")
    assert isinstance(result, list)
    assert len(result) == EMBEDDING_DIM
    assert all(isinstance(v, float) for v in result)


@pytest.mark.skipif(
    os.getenv("GEMINI_API_KEY") is None,
    reason="GEMINI_API_KEY not set; skipping integration test that calls external Gemini API.",
)
def test_generate_response(client):
    result = client.generate_response("What is photosynthesis?")
    assert isinstance(result, str)
    assert len(result) > 0
