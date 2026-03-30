import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock

from src.api.main import app
from src.api.routers.auth import get_user_repo
from src.lib.auth.password import pwd_context

BASE_URL = "http://testserver"
REGISTER_URL = "/api/v1/auth/register"
TOKEN_URL = "/api/v1/auth/token"


def _repo(*, existing_user=None, create_result=None, create_raises=None):
    """Factory for a lightweight mock UserRepository."""
    repo = MagicMock()
    repo.get_by_username = AsyncMock(return_value=existing_user)
    if create_raises is not None:
        repo.create_user = AsyncMock(side_effect=create_raises)
    else:
        repo.create_user = AsyncMock(
            return_value=create_result or {"id": "mock-uuid", "username": "alice"}
        )
    return repo


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as c:
        yield c


# ---------------------------------------------------------------------------
# POST /api/v1/auth/register
# ---------------------------------------------------------------------------


async def test_register_success(client):
    mock = _repo(create_result={"id": "some-uuid", "username": "alice"})
    app.dependency_overrides[get_user_repo] = lambda: mock
    try:
        resp = await client.post(
            REGISTER_URL, json={"username": "alice", "password": "Secret12"}
        )
    finally:
        app.dependency_overrides.pop(get_user_repo, None)

    assert resp.status_code == 201
    body = resp.json()
    assert body["username"] == "alice"
    assert "id" in body


async def test_register_empty_username_returns_422(client):
    mock = _repo()
    app.dependency_overrides[get_user_repo] = lambda: mock
    try:
        resp = await client.post(REGISTER_URL, json={"username": "", "password": "Secret12"})
    finally:
        app.dependency_overrides.pop(get_user_repo, None)

    assert resp.status_code == 422


async def test_register_whitespace_username_returns_422(client):
    mock = _repo()
    app.dependency_overrides[get_user_repo] = lambda: mock
    try:
        resp = await client.post(REGISTER_URL, json={"username": "   ", "password": "Secret12"})
    finally:
        app.dependency_overrides.pop(get_user_repo, None)

    assert resp.status_code == 422


async def test_register_empty_password_returns_422(client):
    mock = _repo()
    app.dependency_overrides[get_user_repo] = lambda: mock
    try:
        resp = await client.post(REGISTER_URL, json={"username": "alice", "password": ""})
    finally:
        app.dependency_overrides.pop(get_user_repo, None)

    assert resp.status_code == 422


async def test_register_whitespace_password_returns_422(client):
    mock = _repo()
    app.dependency_overrides[get_user_repo] = lambda: mock
    try:
        resp = await client.post(REGISTER_URL, json={"username": "alice", "password": "   "})
    finally:
        app.dependency_overrides.pop(get_user_repo, None)

    assert resp.status_code == 422


async def test_register_weak_password_returns_422(client):
    mock = _repo()
    app.dependency_overrides[get_user_repo] = lambda: mock
    try:
        resp = await client.post(
            REGISTER_URL, json={"username": "alice", "password": "short1"}
        )
    finally:
        app.dependency_overrides.pop(get_user_repo, None)

    assert resp.status_code == 422


async def test_register_invalid_username_chars_returns_422(client):
    mock = _repo()
    app.dependency_overrides[get_user_repo] = lambda: mock
    try:
        resp = await client.post(
            REGISTER_URL, json={"username": "alice@home", "password": "Secret12"}
        )
    finally:
        app.dependency_overrides.pop(get_user_repo, None)

    assert resp.status_code == 422


async def test_register_duplicate_username_returns_409(client):
    mock = _repo(create_raises=ValueError("Username 'alice' is already taken."))
    app.dependency_overrides[get_user_repo] = lambda: mock
    try:
        resp = await client.post(
            REGISTER_URL, json={"username": "alice", "password": "Secret12"}
        )
    finally:
        app.dependency_overrides.pop(get_user_repo, None)

    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# POST /api/v1/auth/token
# ---------------------------------------------------------------------------


async def test_token_success(client):
    hashed = pwd_context.hash("s3cr3t")
    user = {"id": "some-uuid", "username": "alice", "hashed_password": hashed}
    mock = _repo(existing_user=user)
    app.dependency_overrides[get_user_repo] = lambda: mock
    try:
        resp = await client.post(TOKEN_URL, json={"username": "alice", "password": "s3cr3t"})
    finally:
        app.dependency_overrides.pop(get_user_repo, None)

    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


async def test_token_wrong_password_returns_401(client):
    hashed = pwd_context.hash("s3cr3t")
    user = {"id": "some-uuid", "username": "alice", "hashed_password": hashed}
    mock = _repo(existing_user=user)
    app.dependency_overrides[get_user_repo] = lambda: mock
    try:
        resp = await client.post(TOKEN_URL, json={"username": "alice", "password": "wrong"})
    finally:
        app.dependency_overrides.pop(get_user_repo, None)

    assert resp.status_code == 401


async def test_token_unknown_user_returns_401(client):
    mock = _repo(existing_user=None)
    app.dependency_overrides[get_user_repo] = lambda: mock
    try:
        resp = await client.post(TOKEN_URL, json={"username": "nobody", "password": "s3cr3t"})
    finally:
        app.dependency_overrides.pop(get_user_repo, None)

    assert resp.status_code == 401
