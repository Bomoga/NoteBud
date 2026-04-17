import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from neo4j import AsyncDriver

from src.lib.auth.jwt import get_current_user
from src.lib.db.neo4j import get_driver
from src.lib.repositories.document_repository import DocumentRepository
from src.lib.repositories.notebook_repository import NotebookRepository
from src.lib.storage.gcs import storage_service
from src.services.ingestion.ingestion_service import ingest_document

router = APIRouter()


def _detect_source_type(filename: str, override: str | None) -> str:
    """Return 'syllabus' if the filename contains 'syllabus' (case-insensitive)
    or if the caller passed ?source_type=syllabus.  Otherwise 'content'.
    """
    if override == "syllabus":
        return "syllabus"
    if "syllabus" in filename.lower():
        return "syllabus"
    return "content"


@router.post("/upload")
async def upload_document(
    notebook_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    driver: AsyncDriver = Depends(get_driver),
    source_type: str | None = Query(default=None),
    folder_path: str = Query(default=""),
    current_user: str = Depends(get_current_user),
):
    notebook = await NotebookRepository(driver).get_by_id(notebook_id)
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if notebook["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    try:
        gcs_uri = await storage_service.upload_file(file, folder="notebook_materials")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

    document_id = str(uuid.uuid4())
    file_type = file.content_type or "application/octet-stream"
    detected_source_type = _detect_source_type(file.filename, source_type)

    doc_repo = DocumentRepository(driver)
    await doc_repo.create(
        id=document_id,
        gcs_uri=gcs_uri,
        filename=file.filename,
        file_type=file_type,
        source_type=detected_source_type,
        folder_path=folder_path,
    )
    await doc_repo.link_to_notebook(doc_id=document_id, notebook_id=notebook_id)

    background_tasks.add_task(
        ingest_document,
        driver=driver,
        document_id=document_id,
        gcs_uri=gcs_uri,
        source_type=detected_source_type,
        filename=file.filename,
    )

    return {
        "status": "processing",
        "filename": file.filename,
        "content_type": file_type,
        "gcs_uri": gcs_uri,
        "document_id": document_id,
    }
