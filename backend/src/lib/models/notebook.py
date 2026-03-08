from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from src.lib.db.session import Base

class Notebook(Base):
    __tablename__ = "notebooks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # NOTE: `owner_id` is intentionally nullable and not yet constrained by a ForeignKey.
    # Orphaned notebooks are currently allowed; tighten this in a future migration if needed.
    owner_id = Column(Integer, nullable=True)