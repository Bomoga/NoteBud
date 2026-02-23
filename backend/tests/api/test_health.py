import pytest
from httpx import AsyncClient, ASGITransport
from src.api.main import app

@pytest.mark.asyncio
async def test_health_check_returns_200():
    transport = ASGITransport(app = app)

    async with AsyncClient(transport = transport, base_url = "http://testserver") as client:
        response = await client.get("/api/v1/health")

    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "online"
    assert data["database"] == "connected"
    assert "message" in data