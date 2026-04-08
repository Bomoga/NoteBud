from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional
from enum import Enum


class EventType(str, Enum):
    due_date = "due_date"
    exam = "exam"
    holiday = "holiday"
    other = "other"


class CalendarEventCreate(BaseModel):
    title: str
    date: date
    event_type: EventType = EventType.other
    description: Optional[str] = None
    notebook_id: Optional[str] = None


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[date] = None
    event_type: Optional[EventType] = None
    description: Optional[str] = None
    notebook_id: Optional[str] = None


class CalendarEventRead(BaseModel):
    id: str
    title: str
    date: date
    event_type: EventType
    description: Optional[str] = None
    notebook_id: Optional[str] = None
    owner_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
