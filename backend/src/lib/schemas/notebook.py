from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class NotebookCreate(BaseModel):
    title: str
    course_code: str = "UC"
    description: Optional[str] = None
    semester: str = "Spring 2026"

class NotebookUpdate(BaseModel):
    title: Optional[str] = None
    course_code: Optional[str] = None
    description: Optional[str] = None
    semester: Optional[str] = None
    banner_gcs_uri: Optional[str] = None

class NotebookRead(BaseModel):
    id: str
    title: str
    course_code: str
    description: Optional[str] = None
    semester: str = "Spring 2026"
    banner_gcs_uri: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    owner_id: Optional[str] = None

    model_config = {"from_attributes": True}

