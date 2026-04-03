from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from neo4j import AsyncDriver

from src.lib.auth.jwt import get_current_user
from src.lib.db.neo4j import get_driver
from src.lib.repositories.notebook_repository import NotebookRepository
from src.lib.schemas.chat import ChatRequest
from src.services.rag.graph_rag_service import GraphRAGService

router = APIRouter()


def get_rag_service(driver: AsyncDriver = Depends(get_driver)) -> GraphRAGService:
    return GraphRAGService(driver)


@router.post("/{notebook_id}/chat")
async def chat_notebook(
    notebook_id: str,
    body: ChatRequest,
    driver: AsyncDriver = Depends(get_driver),
    rag_service: GraphRAGService = Depends(get_rag_service),
    current_user: str = Depends(get_current_user),
):
    """Stream a RAG-powered chat answer with citations via SSE."""
    notebook = await NotebookRepository(driver).get_by_id(notebook_id)
    if notebook is None or notebook["owner_id"] != current_user:
        raise HTTPException(status_code=404, detail="Notebook not found")

    return StreamingResponse(
        rag_service.stream_chat(notebook_id, body.query),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
