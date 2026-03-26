from fastapi import APIRouter, Depends, HTTPException
from neo4j import AsyncDriver

from src.lib.db.neo4j import get_driver
from src.lib.repositories.notebook_repository import NotebookRepository
from src.lib.schemas.notebook import NotebookCreate, NotebookRead, NotebookUpdate

router = APIRouter()


def get_repo(driver: AsyncDriver = Depends(get_driver)) -> NotebookRepository:
    return NotebookRepository(driver)


@router.post("", response_model=NotebookRead, status_code=201)
async def create_notebook_endpoint(
    data: NotebookCreate,
    repo: NotebookRepository = Depends(get_repo),
):
    return await repo.create(data)


@router.get("", response_model=list[NotebookRead], status_code=200)
async def list_notebooks_endpoint(
    repo: NotebookRepository = Depends(get_repo),
):
    return await repo.list()


@router.get("/{notebook_id}", response_model=NotebookRead, status_code=200)
async def get_notebook_endpoint(
    notebook_id: str,
    repo: NotebookRepository = Depends(get_repo),
):
    notebook = await repo.get_by_id(notebook_id)
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return notebook


@router.patch("/{notebook_id}", response_model=NotebookRead, status_code=200)
async def update_notebook_endpoint(
    notebook_id: str,
    data: NotebookUpdate,
    repo: NotebookRepository = Depends(get_repo),
):
    notebook = await repo.update(notebook_id, data)
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return notebook


@router.delete("/{notebook_id}", status_code=204)
async def delete_notebook_endpoint(
    notebook_id: str,
    repo: NotebookRepository = Depends(get_repo),
):
    deleted = await repo.delete(notebook_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Notebook not found")
