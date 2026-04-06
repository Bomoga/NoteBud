from typing import Optional

from pydantic import BaseModel


class DocumentUpdate(BaseModel):
    folder_path: Optional[str] = None
