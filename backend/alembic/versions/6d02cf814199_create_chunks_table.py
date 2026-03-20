"""create chunks table

Revision ID: 6d02cf814199
Revises: e3a33d52b7cf
Create Date: 2026-03-18 12:42:20.688963

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '6d02cf814199'
down_revision: Union[str, Sequence[str], None] = 'e3a33d52b7cf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "chunks",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("notebook_id", sa.Integer,
                  sa.ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_id", sa.Integer, nullable=True),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("embedding", Vector(768), nullable=False),
        sa.Column("metadata", sa.dialects.postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()")),
    )

    op.create_index("ix_chunks_notebook_id", "chunks", ["notebook_id"])

    op.execute("""
        CREATE INDEX ix_chunks_embedding_hnsw
        ON chunks
        USING hnsw (embedding vector_cosine_ops)
    """)


def downgrade() -> None:
    op.drop_index("ix_chunks_embedding_hnsw", table_name="chunks")
    op.drop_index("ix_chunks_notebook_id", table_name="chunks")
    op.drop_table("chunks")
