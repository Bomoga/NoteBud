import os
import tempfile
import uuid
from typing import Optional

import anyio
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
            print("SUCCESS: Found GCS credentials file.")
            self.credentials = service_account.Credentials.from_service_account_file(str(credentials_path))
            self.client = storage.Client(credentials=self.credentials, project=self.credentials.project_id)
        else:
            print("WARNING: GCS credentials file not found.")
            self.client = None
        
    async def upload_file(self, file: UploadFile, folder: str = "uploads") -> Optional[str]:
        if not self.client:
            raise Exception("Storage client not initialized. Check credentials.")

        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        destination_blob_name = f"{folder}/{unique_filename}"

        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(destination_blob_name)

        await anyio.to_thread.run_sync(
            lambda: blob.upload_from_file(file.file, content_type=file.content_type)
        )

        return f"gs://{self.bucket_name}/{destination_blob_name}"

    async def delete_blob(self, gcs_uri: str) -> None:
        """Delete a GCS object by URI. No-ops if the blob does not exist."""
        if not self.client:
            raise Exception("Storage client not initialized. Check credentials.")

        if not gcs_uri.startswith("gs://"):
            raise ValueError(f"Invalid GCS URI: {gcs_uri}")
        without_scheme = gcs_uri[len("gs://"):]
        bucket_name, _, blob_path = without_scheme.partition("/")

        bucket = self.client.bucket(bucket_name)
        blob = bucket.blob(blob_path)
        await anyio.to_thread.run_sync(lambda: blob.delete(if_generation_match=None))

    def download_to_tempfile(self, gcs_uri: str) -> str:
        """Download a GCS object to a local temp file.

        Args:
            gcs_uri: Full GCS URI, e.g. gs://bucket/folder/file.pdf

        Returns:
            Path to the temp file. Caller must delete it when done (os.unlink).
        """
        if not self.client:
            raise Exception("Storage client not initialized. Check credentials.")

        # Parse gs://bucket/path
        if not gcs_uri.startswith("gs://"):
            raise ValueError(f"Invalid GCS URI: {gcs_uri}")
        without_scheme = gcs_uri[len("gs://"):]
        bucket_name, _, blob_path = without_scheme.partition("/")

        ext = os.path.splitext(blob_path)[1] or ""
        tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
        try:
            bucket = self.client.bucket(bucket_name)
            blob = bucket.blob(blob_path)
            blob.download_to_file(tmp)
            tmp.close()
            return tmp.name
        except Exception:
            tmp.close()
            os.unlink(tmp.name)
            raise


storage_service = StorageService()