from pydantic import BaseModel


class ChatRequest(BaseModel):
    query: str


class Citation(BaseModel):
    chunk_id: str
    filename: str
    snippet: str
