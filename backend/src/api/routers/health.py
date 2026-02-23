from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from src.lib.db.session import get_db

router = APIRouter()

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT 1"))
        return {
            "status": "online",
            "database": "connected",
            "message": "backend systems ready"
        }
    except Exception as e:
        return {
            "status": "online",
            "database": "disconnected",
            "error": str(e)
        }