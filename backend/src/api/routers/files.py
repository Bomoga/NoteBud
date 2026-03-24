import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from neo4j import AsyncDriver

from src.lib.db.neo4j import get_driver
from src.lib.repositories.document_repository import DocumentRepository
from src.lib.storage.gcs import storage_service

router = APIRouter()


@router.post("/upload")
async def upload_document(
    notebook_id: str,
    file: UploadFile = File(...),
    driver: AsyncDriver = Depends(get_driver),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    try:
        gcs_uri = await storage_service.upload_file(file, folder="notebook_materials")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

    document_id = str(uuid.uuid4())
    file_type = file.content_type or "application/octet-stream"

    doc_repo = DocumentRepository(driver)
    await doc_repo.create(
        id=document_id,
        gcs_uri=gcs_uri,
        filename=file.filename,
        file_type=file_type,
    )
    await doc_repo.link_to_notebook(doc_id=document_id, notebook_id=notebook_id)

    return {
        "status": "success",
        "filename": file.filename,
        "content_type": file_type,
        "gcs_uri": gcs_uri,
        "document_id": document_id,
    }
