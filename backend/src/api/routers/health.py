from fastapi import APIRouter
from src.lib.db.neo4j import get_driver

router = APIRouter()


@router.get("/health")
async def health_check():
    try:
        driver = get_driver()
        await driver.verify_connectivity()
        return {
            "status": "online",
            "database": "connected",
            "message": "backend systems ready",
        }
    except Exception as e:
        return {
            "status": "online",
            "database": "disconnected",
            "error": str(e),
        }
