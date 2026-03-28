from fastapi import APIRouter, Depends, HTTPException
from neo4j import AsyncDriver

from src.lib.auth.jwt import get_current_user
from src.lib.db.neo4j import get_driver
from src.lib.repositories.notebook_repository import NotebookRepository
from src.lib.repositories.user_repository import UserRepository
from src.lib.schemas.notebook import NotebookCreate, NotebookRead, NotebookUpdate

router = APIRouter()


def get_repo(driver: AsyncDriver = Depends(get_driver)) -> NotebookRepository:
    return NotebookRepository(driver)


def get_user_repo(driver: AsyncDriver = Depends(get_driver)) -> UserRepository:
    return UserRepository(driver)


@router.post("", response_model=NotebookRead, status_code=201)
async def create_notebook_endpoint(
    data: NotebookCreate,
    repo: NotebookRepository = Depends(get_repo),
    user_repo: UserRepository = Depends(get_user_repo),
    current_user: str = Depends(get_current_user),
):
    await user_repo.create_or_get(current_user)
    return await repo.create(data, owner_id=current_user)


@router.get("", response_model=list[NotebookRead], status_code=200)
async def list_notebooks_endpoint(
    repo: NotebookRepository = Depends(get_repo),
    current_user: str = Depends(get_current_user),
):
    return await repo.list(owner_id=current_user)


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
    current_user: str = Depends(get_current_user),
):
    existing = await repo.get_by_id(notebook_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if existing["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await repo.update(notebook_id, data)


@router.delete("/{notebook_id}", status_code=204)
async def delete_notebook_endpoint(
    notebook_id: str,
    repo: NotebookRepository = Depends(get_repo),
    current_user: str = Depends(get_current_user),
):
    existing = await repo.get_by_id(notebook_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if existing["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    await repo.delete(notebook_id)
