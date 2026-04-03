import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from httpx import AsyncClient, ASGITransport

from src.api.main import app
from src.api.routers.notes import get_repo, get_notebook_repo, get_note_chunk_repo
from src.lib.auth.jwt import get_current_user

BASE_URL = "http://testserver"
NOTES_URL = "/api/v1/notebooks/{notebook_id}/notes"
NOTE_URL = "/api/v1/notebooks/{notebook_id}/notes/{note_id}"

OWNER_ID = "user-abc"
OTHER_USER_ID = "user-xyz"
NOTEBOOK_ID = "nb-001"
NOTE_ID = "note-001"

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

_NOTE = {
    "id": NOTE_ID,
    "notebook_id": NOTEBOOK_ID,
    "title": "Lecture 1",
    "content": "Newton's laws",
    "owner_id": OWNER_ID,
    "created_at": _NOW,
    "updated_at": _NOW,
}


def _note_repo(*, create_result=_NOTE, get_result=_NOTE, list_result=None, update_result=_NOTE):
    repo = MagicMock()
    repo.create = AsyncMock(return_value=create_result)
    repo.get_by_id = AsyncMock(return_value=get_result)
    repo.list = AsyncMock(return_value=list_result if list_result is not None else [_NOTE])
    repo.update = AsyncMock(return_value=update_result)
    repo.delete = AsyncMock(return_value=True)
    return repo


def _notebook_repo(*, notebook=_NOTEBOOK):
    repo = MagicMock()
    repo.get_by_id = AsyncMock(return_value=notebook)
    return repo


def _chunk_repo():
    repo = MagicMock()
    repo.delete_by_note = AsyncMock(return_value=None)
    return repo


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as c:
        yield c


def _override(note_repo=None, notebook=_NOTEBOOK, current_user=OWNER_ID):
    app.dependency_overrides[get_repo] = lambda: note_repo or _note_repo()
    app.dependency_overrides[get_notebook_repo] = lambda: _notebook_repo(notebook=notebook)
    app.dependency_overrides[get_note_chunk_repo] = lambda: _chunk_repo()
    app.dependency_overrides[get_current_user] = lambda: current_user


def _clear():
    for dep in (get_repo, get_notebook_repo, get_note_chunk_repo, get_current_user):
        app.dependency_overrides.pop(dep, None)


# ---------------------------------------------------------------------------
# POST /{notebook_id}/notes
# ---------------------------------------------------------------------------


async def test_create_note_owned_notebook_returns_201(client):
    _override()
    try:
        resp = await client.post(
            NOTES_URL.format(notebook_id=NOTEBOOK_ID),
            json={"title": "Lecture 1", "content": "Newton's laws"},
        )
    finally:
        _clear()

    assert resp.status_code == 201
    body = resp.json()
    assert body["id"] == NOTE_ID
    assert body["notebook_id"] == NOTEBOOK_ID


async def test_create_note_unowned_notebook_returns_403(client):
    _override(current_user=OTHER_USER_ID)
    try:
        resp = await client.post(
            NOTES_URL.format(notebook_id=NOTEBOOK_ID),
            json={"title": "Lecture 1", "content": "Newton's laws"},
        )
    finally:
        _clear()

    assert resp.status_code == 403


async def test_create_note_missing_notebook_returns_404(client):
    _override(notebook=None)
    try:
        resp = await client.post(
            NOTES_URL.format(notebook_id="nonexistent"),
            json={"title": "Lecture 1", "content": "Newton's laws"},
        )
    finally:
        _clear()

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /{notebook_id}/notes
# ---------------------------------------------------------------------------


async def test_list_notes_owned_notebook_returns_200(client):
    _override()
    try:
        resp = await client.get(NOTES_URL.format(notebook_id=NOTEBOOK_ID))
    finally:
        _clear()

    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_list_notes_unowned_notebook_returns_403(client):
    _override(current_user=OTHER_USER_ID)
    try:
        resp = await client.get(NOTES_URL.format(notebook_id=NOTEBOOK_ID))
    finally:
        _clear()

    assert resp.status_code == 403


async def test_list_notes_missing_notebook_returns_404(client):
    _override(notebook=None)
    try:
        resp = await client.get(NOTES_URL.format(notebook_id="nonexistent"))
    finally:
        _clear()

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /{notebook_id}/notes/{note_id}
# ---------------------------------------------------------------------------


async def test_get_note_returns_200(client):
    _override()
    try:
        resp = await client.get(NOTE_URL.format(notebook_id=NOTEBOOK_ID, note_id=NOTE_ID))
    finally:
        _clear()

    assert resp.status_code == 200
    assert resp.json()["id"] == NOTE_ID


async def test_get_note_wrong_owner_returns_403(client):
    _override(current_user=OTHER_USER_ID)
    try:
        resp = await client.get(NOTE_URL.format(notebook_id=NOTEBOOK_ID, note_id=NOTE_ID))
    finally:
        _clear()

    assert resp.status_code == 403


async def test_get_note_wrong_notebook_returns_404(client):
    note_in_other_notebook = {**_NOTE, "notebook_id": "other-nb"}
    _override(note_repo=_note_repo(get_result=note_in_other_notebook))
    try:
        resp = await client.get(NOTE_URL.format(notebook_id=NOTEBOOK_ID, note_id=NOTE_ID))
    finally:
        _clear()

    assert resp.status_code == 404


async def test_get_note_not_found_returns_404(client):
    _override(note_repo=_note_repo(get_result=None))
    try:
        resp = await client.get(NOTE_URL.format(notebook_id=NOTEBOOK_ID, note_id="missing"))
    finally:
        _clear()

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /{notebook_id}/notes/{note_id}
# ---------------------------------------------------------------------------


async def test_update_note_owned_returns_200(client):
    _override()
    try:
        resp = await client.patch(
            NOTE_URL.format(notebook_id=NOTEBOOK_ID, note_id=NOTE_ID),
            json={"title": "Updated title"},
        )
    finally:
        _clear()

    assert resp.status_code == 200


async def test_update_note_unowned_returns_403(client):
    _override(current_user=OTHER_USER_ID)
    try:
        resp = await client.patch(
            NOTE_URL.format(notebook_id=NOTEBOOK_ID, note_id=NOTE_ID),
            json={"title": "Hacked"},
        )
    finally:
        _clear()

    assert resp.status_code == 403


async def test_update_note_wrong_notebook_returns_404(client):
    note_in_other_notebook = {**_NOTE, "notebook_id": "other-nb"}
    _override(note_repo=_note_repo(get_result=note_in_other_notebook))
    try:
        resp = await client.patch(
            NOTE_URL.format(notebook_id=NOTEBOOK_ID, note_id=NOTE_ID),
            json={"title": "Cross-notebook update"},
        )
    finally:
        _clear()

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /{notebook_id}/notes/{note_id}
# ---------------------------------------------------------------------------


async def test_delete_note_owned_returns_204(client):
    _override()
    try:
        resp = await client.delete(NOTE_URL.format(notebook_id=NOTEBOOK_ID, note_id=NOTE_ID))
    finally:
        _clear()

    assert resp.status_code == 204


async def test_delete_note_unowned_returns_403(client):
    _override(current_user=OTHER_USER_ID)
    try:
        resp = await client.delete(NOTE_URL.format(notebook_id=NOTEBOOK_ID, note_id=NOTE_ID))
    finally:
        _clear()

    assert resp.status_code == 403


async def test_delete_note_wrong_notebook_returns_404(client):
    note_in_other_notebook = {**_NOTE, "notebook_id": "other-nb"}
    _override(note_repo=_note_repo(get_result=note_in_other_notebook))
    try:
        resp = await client.delete(NOTE_URL.format(notebook_id=NOTEBOOK_ID, note_id=NOTE_ID))
    finally:
        _clear()

    assert resp.status_code == 404


async def test_delete_note_not_found_returns_404(client):
    _override(note_repo=_note_repo(get_result=None))
    try:
        resp = await client.delete(NOTE_URL.format(notebook_id=NOTEBOOK_ID, note_id="missing"))
    finally:
        _clear()

    assert resp.status_code == 404
