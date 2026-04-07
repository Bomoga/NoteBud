from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

LinkType = Literal["prerequisite", "related-to"]


class NotebookLinkCreate(BaseModel):
    to_notebook_id: str
    link_type: LinkType


class NotebookLinkRead(BaseModel):
    id: str
    from_notebook_id: str
    to_notebook_id: str
    to_notebook_title: str
    to_notebook_course_code: str
    link_type: str
    created_at: datetime


class NotebookLinkInbound(BaseModel):
    id: str
    from_notebook_id: str
    from_notebook_title: str
    from_notebook_course_code: str
    to_notebook_id: str
    link_type: str
    created_at: datetime


class SimilarNotebookRead(BaseModel):
    notebook_id: str
    title: str
    course_code: str
    avg_score: float
    hit_count: int


class NotebookLinksResponse(BaseModel):
    outbound: list[NotebookLinkRead]
    inbound: list[NotebookLinkInbound]
