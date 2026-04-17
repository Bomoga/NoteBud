"""
API tests for POST /api/v1/notebooks/{notebook_id}/chat.

Uses dependency overrides and monkeypatching (same pattern as test_notes.py)
so no real Neo4j or Gemini calls are made.
"""
import json
from datetime import datetime, timezone
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

from src.api.main import app
from src.api.routers.chat import get_rag_service
from src.lib.auth.jwt import get_current_user
from src.lib.db.neo4j import get_driver

BASE_URL = "http://testserver"
CHAT_URL = "/api/v1/notebooks/{notebook_id}/chat"

OWNER_ID = "user-abc"
OTHER_USER_ID = "user-xyz"
NOTEBOOK_ID = "nb-001"

_NOW = datetime(2024, 1, 1, tzinfo=timezone.utc)

_NOTEBOOK = {
    "id": NOTEBOOK_ID,
    "title": "Physics",
    "course_code": "PHYS101",
    "description": "",
    "owner_id": OWNER_ID,
    "created_at": _NOW,
    "updated_at": _NOW,
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _rag_service_with_stream(events: list[str]):
    """Return a mock GraphRAGService whose stream_chat yields the given events."""

    async def _stream(notebook_id: str, query_text: str) -> AsyncGenerator[str, None]:
        for event in events:
            yield event

    svc = MagicMock()
    svc.stream_chat = _stream
    return svc


def _token_event(text: str) -> str:
    return f"data: {json.dumps({'token': text})}\n\n"


def _done_event(citations=None, low_confidence=False) -> str:
    return f"data: {json.dumps({'done': True, 'citations': citations or [], 'low_confidence': low_confidence})}\n\n"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as c:
        yield c


@pytest.fixture
def override_deps(monkeypatch):
    """Patch NotebookRepository as imported in the chat router and provide
    control over the RAG service via dependency overrides."""

    def _setup(notebook=_NOTEBOOK, current_user=OWNER_ID, rag_events=None):
        # Patch NotebookRepository as seen by the chat router
        mock_repo_instance = MagicMock()
        mock_repo_instance.get_by_id = AsyncMock(return_value=notebook)
        monkeypatch.setattr(
            "src.api.routers.chat.NotebookRepository",
            lambda _driver: mock_repo_instance,
        )

        # Override auth
        app.dependency_overrides[get_current_user] = lambda: current_user

        # Override driver (so no real Neo4j connection is attempted)
        app.dependency_overrides[get_driver] = lambda: MagicMock()

        # Override RAG service
        if rag_events is not None:
            svc = _rag_service_with_stream(rag_events)
            app.dependency_overrides[get_rag_service] = lambda: svc

    return _setup


@pytest.fixture(autouse=True)
def _cleanup_overrides():
    yield
    for dep in (get_current_user, get_rag_service, get_driver):
        app.dependency_overrides.pop(dep, None)


# ---------------------------------------------------------------------------
# Auth tests
# ---------------------------------------------------------------------------


async def test_chat_no_auth_returns_401(client):
    resp = await client.post(
        CHAT_URL.format(notebook_id=NOTEBOOK_ID),
        json={"query": "hello"},
    )
    assert resp.status_code == 401


async def test_chat_not_found_notebook_returns_404(client, override_deps):
    override_deps(notebook=None)
    resp = await client.post(
        CHAT_URL.format(notebook_id="nonexistent"),
        json={"query": "hello"},
    )
    assert resp.status_code == 404


async def test_chat_other_owner_returns_404(client, override_deps):
    """Notebook exists but belongs to a different user → 404 (no existence leak)."""
    override_deps(notebook=_NOTEBOOK, current_user=OTHER_USER_ID)
    resp = await client.post(
        CHAT_URL.format(notebook_id=NOTEBOOK_ID),
        json={"query": "hello"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# SSE streaming tests
# ---------------------------------------------------------------------------


async def test_chat_streams_token_events(client, override_deps):
    events = [
        _token_event("Hello"),
        _token_event(" world"),
        _done_event(citations=[], low_confidence=False),
    ]
    override_deps(rag_events=events)

    resp = await client.post(
        CHAT_URL.format(notebook_id=NOTEBOOK_ID),
        json={"query": "What is this?"},
    )

    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]
    body = resp.text
    assert 'data: {"token": "Hello"}' in body
    assert 'data: {"token": " world"}' in body
    assert '"done": true' in body


async def test_chat_final_event_contains_citations(client, override_deps):
    citation = {"chunk_id": "c1", "filename": "notes.pdf", "snippet": "...", "source_type": "document"}
    events = [
        _token_event("Answer [Source 1]"),
        _done_event(citations=[citation], low_confidence=False),
    ]
    override_deps(rag_events=events)

    resp = await client.post(
        CHAT_URL.format(notebook_id=NOTEBOOK_ID),
        json={"query": "Explain?"},
    )

    assert resp.status_code == 200
    body = resp.text
    done_lines = [
        line[len("data: "):] for line in body.splitlines() if line.startswith("data: ")
    ]
    done_payload = next(
        (json.loads(p) for p in done_lines if json.loads(p).get("done")),
        None,
    )
    assert done_payload is not None
    assert done_payload["done"] is True
    assert done_payload["citations"] == [citation]
    assert done_payload["low_confidence"] is False


async def test_chat_low_confidence_flag(client, override_deps):
    events = [
        _token_event("Uncertain answer"),
        _done_event(citations=[], low_confidence=True),
    ]
    override_deps(rag_events=events)

    resp = await client.post(
        CHAT_URL.format(notebook_id=NOTEBOOK_ID),
        json={"query": "Obscure question"},
    )

    assert resp.status_code == 200
    body = resp.text
    done_lines = [
        json.loads(line[len("data: "):])
        for line in body.splitlines()
        if line.startswith("data: ")
    ]
    done_payload = next((p for p in done_lines if p.get("done")), None)
    assert done_payload is not None
    assert done_payload["low_confidence"] is True

