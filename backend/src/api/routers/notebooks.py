import logging

from fastapi import APIRouter, Depends, HTTPException
from neo4j import AsyncDriver

from src.lib.auth.jwt import get_current_user
from src.lib.db.neo4j import get_driver
from src.lib.repositories.document_repository import DocumentRepository
from src.lib.repositories.notebook_repository import NotebookRepository
from src.lib.repositories.user_repository import UserRepository
from src.lib.schemas.notebook import NotebookCreate, NotebookRead, NotebookUpdate
from src.lib.storage.gcs import storage_service

logger = logging.getLogger(__name__)

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
    current_user: str = Depends(get_current_user),
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
    updated = await repo.update(notebook_id, data)
    if updated is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return updated


@router.get("/{notebook_id}/documents", status_code=200)
async def list_notebook_documents_endpoint(
    notebook_id: str,
    repo: NotebookRepository = Depends(get_repo),
    driver: AsyncDriver = Depends(get_driver),
    current_user: str = Depends(get_current_user),
):
    existing = await repo.get_by_id(notebook_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if existing["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await DocumentRepository(driver).list_by_notebook(notebook_id)


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

    gcs_uris = await repo.get_document_uris(notebook_id)
    await repo.delete(notebook_id)

    for uri in gcs_uris:
        try:
            await storage_service.delete_blob(uri)
        except Exception:
            logger.exception("Failed to delete GCS blob %s — orphaned object may remain", uri)
