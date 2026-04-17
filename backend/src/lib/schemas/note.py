from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NoteCreate(BaseModel):
    title: str
    content: str = ""
    folder_path: str = ""


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    folder_path: Optional[str] = None


class NoteRead(BaseModel):
    id: str
    notebook_id: str
    title: str
    content: str
    folder_path: str = ""
    created_at: datetime
    updated_at: datetime
    owner_id: str

    model_config = {"from_attributes": True}
