from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class NotebookCreate(BaseModel):
    title: str
    description: Optional[str] = None

class NotebookRead(BaseModel):
    id: int
    title: str
    course_code: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    owner_id: Optional[str] = None

    model_config = {"from_attributes": True}

