import os
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


def test_generate_embedding(client):
    result = client.generate_embedding("This is a sample study note about biology.")
    assert isinstance(result, list)
    assert len(result) == EMBEDDING_DIM
    assert all(isinstance(v, float) for v in result)


def test_generate_response(client):
    result = client.generate_response("What is photosynthesis?")
    assert isinstance(result, str)
    assert len(result) > 0
