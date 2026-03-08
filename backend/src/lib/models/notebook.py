from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from src.lib.db.session import Base

class Notebook(Base):
    __table_name__ = "notebooks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    owner_id = Column(Integer, nullable=True)