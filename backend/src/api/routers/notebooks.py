import io
import logging

import anyio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from neo4j import AsyncDriver

from src.lib.auth.jwt import get_current_user
from src.lib.db.neo4j import get_driver
from src.lib.repositories.document_repository import DocumentRepository
from src.lib.repositories.notebook_repository import NotebookRepository
from src.lib.repositories.user_repository import UserRepository
from src.lib.repositories.notebook_link_repository import NotebookLinkRepository
from src.lib.schemas.document import DocumentUpdate
from src.lib.schemas.notebook import NotebookCreate, NotebookRead, NotebookUpdate
from src.lib.schemas.notebook_link import (
    NotebookLinkCreate,
    NotebookLinksResponse,
    SimilarNotebookRead,
)
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


@router.patch("/{notebook_id}/documents/{document_id}", status_code=200)
async def patch_notebook_document_endpoint(
    notebook_id: str,
    document_id: str,
    data: DocumentUpdate,
    repo: NotebookRepository = Depends(get_repo),
    driver: AsyncDriver = Depends(get_driver),
    current_user: str = Depends(get_current_user),
):
    existing = await repo.get_by_id(notebook_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if existing["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    doc_repo = DocumentRepository(driver)
    # Verify document belongs to this notebook
    docs = await doc_repo.list_by_notebook(notebook_id)
    if not any(d["id"] == document_id for d in docs):
        raise HTTPException(status_code=404, detail="Document not found in notebook")
    updates = data.model_dump(exclude_unset=True)
    result = await doc_repo.update(document_id, updates)
    if result is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return result


@router.post("/{notebook_id}/links", status_code=201)
async def create_notebook_link_endpoint(
    notebook_id: str,
    data: NotebookLinkCreate,
    repo: NotebookRepository = Depends(get_repo),
    driver: AsyncDriver = Depends(get_driver),
    current_user: str = Depends(get_current_user),
):
    existing = await repo.get_by_id(notebook_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if existing["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    if data.to_notebook_id == notebook_id:
        raise HTTPException(status_code=400, detail="Cannot link a notebook to itself")
    target = await repo.get_by_id(data.to_notebook_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target notebook not found")
    link_repo = NotebookLinkRepository(driver)
    result = await link_repo.create(notebook_id, data.to_notebook_id, data.link_type)
    if result is None:
        raise HTTPException(status_code=500, detail="Failed to create link")
    return result


@router.get("/{notebook_id}/links", response_model=NotebookLinksResponse, status_code=200)
async def list_notebook_links_endpoint(
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
    link_repo = NotebookLinkRepository(driver)
    outbound = await link_repo.list_outbound(notebook_id)
    inbound = await link_repo.list_inbound(notebook_id)
    return {"outbound": outbound, "inbound": inbound}


@router.delete("/{notebook_id}/links/{link_id}", status_code=204)
async def delete_notebook_link_endpoint(
    notebook_id: str,
    link_id: str,
    repo: NotebookRepository = Depends(get_repo),
    driver: AsyncDriver = Depends(get_driver),
    current_user: str = Depends(get_current_user),
):
    existing = await repo.get_by_id(notebook_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if existing["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    link_repo = NotebookLinkRepository(driver)
    deleted = await link_repo.delete(link_id, notebook_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Link not found")


@router.get("/{notebook_id}/similar", response_model=list[SimilarNotebookRead], status_code=200)
async def similar_notebooks_endpoint(
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
    link_repo = NotebookLinkRepository(driver)
    return await link_repo.find_similar(notebook_id, current_user)


_ALLOWED_BANNER_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.post("/{notebook_id}/banner", response_model=NotebookRead, status_code=200)
async def upload_notebook_banner(
    notebook_id: str,
    file: UploadFile = File(...),
    repo: NotebookRepository = Depends(get_repo),
    current_user: str = Depends(get_current_user),
):
    existing = await repo.get_by_id(notebook_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if existing["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    if file.content_type not in _ALLOWED_BANNER_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported image type. Use JPEG, PNG, WebP, or GIF.")

    # Delete old banner if present
    old_uri = existing.get("banner_gcs_uri")
    if old_uri:
        try:
            await storage_service.delete_blob(old_uri)
        except Exception:
            logger.warning("Could not delete old banner blob %s", old_uri)

    gcs_uri = await storage_service.upload_file(file, folder=f"notebook_banners/{notebook_id}")
    updated = await repo.update(notebook_id, NotebookUpdate(banner_gcs_uri=gcs_uri))
    if updated is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return updated


@router.delete("/{notebook_id}/banner", response_model=NotebookRead, status_code=200)
async def delete_notebook_banner(
    notebook_id: str,
    repo: NotebookRepository = Depends(get_repo),
    current_user: str = Depends(get_current_user),
):
    existing = await repo.get_by_id(notebook_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if existing["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    old_uri = existing.get("banner_gcs_uri")
    if old_uri:
        try:
            await storage_service.delete_blob(old_uri)
        except Exception:
            logger.warning("Could not delete banner blob %s", old_uri)
    updated = await repo.update(notebook_id, NotebookUpdate(banner_gcs_uri=None))
    if updated is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return updated


@router.get("/{notebook_id}/banner")
async def get_notebook_banner(
    notebook_id: str,
    repo: NotebookRepository = Depends(get_repo),
):
    # No auth required — notebook_id UUID is unguessable and banners are non-sensitive.
    existing = await repo.get_by_id(notebook_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    gcs_uri = existing.get("banner_gcs_uri")
    if not gcs_uri:
        raise HTTPException(status_code=404, detail="No banner set")

    without_scheme = gcs_uri[len("gs://"):]
    bucket_name, _, blob_path = without_scheme.partition("/")
    bucket = storage_service.client.bucket(bucket_name)
    blob = bucket.blob(blob_path)

    data = await anyio.to_thread.run_sync(blob.download_as_bytes)
    content_type = blob.content_type or "image/jpeg"
    return StreamingResponse(
        io.BytesIO(data),
        media_type=content_type,
        headers={"Cache-Control": "private, max-age=3600"},
    )


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
    banner_uri = existing.get("banner_gcs_uri")
    await repo.delete(notebook_id)

    for uri in gcs_uris + ([banner_uri] if banner_uri else []):
        try:
            await storage_service.delete_blob(uri)
        except Exception:
            logger.exception("Failed to delete GCS blob %s — orphaned object may remain", uri)
