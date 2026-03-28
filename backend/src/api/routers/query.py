from fastapi import APIRouter, Depends, HTTPException
from neo4j import AsyncDriver
from pydantic import BaseModel

from src.lib.auth.jwt import get_current_user
from src.lib.db.neo4j import get_driver
from src.lib.repositories.notebook_repository import NotebookRepository
from src.services.rag.graph_rag_service import GraphRAGService

router = APIRouter()


class QueryRequest(BaseModel):
    query: str


class QueryResponse(BaseModel):
    answer: str
    sources: list[str]


def get_rag_service(driver: AsyncDriver = Depends(get_driver)) -> GraphRAGService:
    return GraphRAGService(driver)


@router.post("/{notebook_id}/query", response_model=QueryResponse)
async def query_notebook(
    notebook_id: str,
    body: QueryRequest,
    driver: AsyncDriver = Depends(get_driver),
    rag_service: GraphRAGService = Depends(get_rag_service),
    current_user: str = Depends(get_current_user),
):
    notebook = await NotebookRepository(driver).get_by_id(notebook_id)
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if notebook["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await rag_service.query(notebook_id, body.query)
    return result
