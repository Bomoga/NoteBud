from fastapi import APIRouter, UploadFile, File, HTTPException
from src.lib.storage.gcs import storage_service

router = APIRouter()

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code = 400, detail = "No file provided.")

    try:
        gcs_uri = await storage_service.upload_file(file, folder = "notebook_materials")
        return {
            "status": "success",
            "filename": file.filename,
            "content_type": file.content_type,
            "gcs_uri": gcs_uri
        }

    except Exception as e:
        raise HTTPException(status_code = 500, detail = f"Failed to upload file: {str(e)}")