import os
import uuid
from typing import Optional
from fastapi import UploadFile
from google.cloud import storage
from google.oauth2 import service_account
from src.lib.config.settings import settings
from pathlib import Path

class StorageService:
    def __init__(self):
        self.bucket_name = settings.GCS_BUCKET_NAME

        # Determine credentials path from settings or environment, with a generic fallback.
        credentials_path_str = getattr(settings, "GCS_CREDENTIALS_PATH", None) or os.getenv("GCS_CREDENTIALS_PATH")

        if credentials_path_str:
            credentials_path = Path(credentials_path_str)
        else:
            # Fallback to a default location in the current working directory.
            credentials_path = Path.cwd() / "service-account-key.json"
        if credentials_path.exists():
            print(f"SUCCESS: Found credentials at {credentials_path}")
            self.credentials = service_account.Credentials.from_service_account_file(str(credentials_path))
            self.client = storage.Client(credentials=self.credentials, project=self.credentials.project_id)
        else:
            print(f"WARNING: Could not find credentials at {credentials_path}")
            self.client = None
        
    async def upload_file(self, file: UploadFile, folder: str = "uploads") -> Optional[str]:
        if not self.client:
            raise Exception("Storage client not initialized. Check credentials.")

        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        destination_blob_name = f"{folder}/{unique_filename}"

        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(destination_blob_name)

        blob.upload_from_file(file.file, content_type=file.content_type)

        return f"gs://{self.bucket_name}/{destination_blob_name}"

storage_service = StorageService()