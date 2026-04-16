import io
import logging

import anyio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from neo4j import AsyncDriver

from src.lib.auth.jwt import get_current_user
from src.lib.db.neo4j import get_driver
from src.lib.repositories.user_repository import UserRepository
from src.lib.storage.gcs import storage_service

logger = logging.getLogger(__name__)
router = APIRouter()

_ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def get_user_repo(driver: AsyncDriver = Depends(get_driver)) -> UserRepository:
    return UserRepository(driver)


@router.post("/me/avatar", status_code=200)
async def upload_avatar(
    file: UploadFile = File(...),
    repo: UserRepository = Depends(get_user_repo),
    current_user: str = Depends(get_current_user),
):
    if file.content_type not in _ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported image type. Use JPEG, PNG, WebP, or GIF.")

    user = await repo.get_by_id(current_user)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete old avatar blob if present
    old_uri = user.get("avatar_gcs_uri")
    if old_uri:
        try:
            await storage_service.delete_blob(old_uri)
        except Exception:
            logger.warning("Could not delete old avatar blob %s", old_uri)

    gcs_uri = await storage_service.upload_file(file, folder=f"user_avatars/{current_user}")
    await repo.set_avatar_uri(current_user, gcs_uri)
    return {"avatar_gcs_uri": gcs_uri}


@router.delete("/me/avatar", status_code=200)
async def delete_avatar(
    repo: UserRepository = Depends(get_user_repo),
    current_user: str = Depends(get_current_user),
):
    user = await repo.get_by_id(current_user)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    old_uri = user.get("avatar_gcs_uri")
    if old_uri:
        try:
            await storage_service.delete_blob(old_uri)
        except Exception:
            logger.warning("Could not delete avatar blob %s", old_uri)

    await repo.set_avatar_uri(current_user, None)
    return {"avatar_gcs_uri": None}


@router.get("/me/avatar")
async def get_avatar(
    repo: UserRepository = Depends(get_user_repo),
    current_user: str = Depends(get_current_user),
):
    user = await repo.get_by_id(current_user)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    gcs_uri = user.get("avatar_gcs_uri")
    if not gcs_uri:
        raise HTTPException(status_code=404, detail="No avatar set")

    if not storage_service.client:
        raise HTTPException(status_code=500, detail="Storage service is not configured")

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
