"""
Note ingestion pipeline: markdown content -> chunk -> embed -> Neo4j NoteChunk nodes.

Called as a FastAPI BackgroundTask after a note's content is created or updated.
"""
import logging
import re

from neo4j import AsyncDriver
from llama_index.core import Document
from llama_index.core.node_parser import SentenceSplitter

from src.lib.repositories.note_chunk_repository import NoteChunkRepository
from src.services.ingestion.ingestion_service import _embed_chunks
from src.services.vector_store.vector_store_service import compute_note_similar_edges

logger = logging.getLogger(__name__)

_CHUNK_SIZE = 512
_CHUNK_OVERLAP = 64

_splitter = SentenceSplitter(chunk_size=_CHUNK_SIZE, chunk_overlap=_CHUNK_OVERLAP)

# Strips markdown syntax that degrades embedding quality:
# headers (#), bold/italic (* _ ~), inline code (`), links/images ([text](url))
_MD_STRIP_RE = re.compile(
    r"!\[.*?\]\(.*?\)"   # images
    r"|\[.*?\]\(.*?\)"   # links
    r"|```.*?```"         # fenced code blocks
    r"|`[^`]*`"           # inline code
    r"|#{1,6}\s?"         # headers
    r"|[*_~]{1,3}"        # bold / italic / strikethrough
    r"|\|",               # table pipes
    re.DOTALL,
)


def _strip_markdown(text: str) -> str:
    """Remove markdown syntax, leaving plain prose suitable for embedding."""
    stripped = _MD_STRIP_RE.sub(" ", text)
    # Collapse excess whitespace
    return re.sub(r"\s{2,}", " ", stripped).strip()


def _chunk_note(content: str) -> list[dict]:
    """Split stripped note text into 512-token chunks with 64-token overlap.

    Returns list of {text, position}.
    """
    plain = _strip_markdown(content)
    if not plain:
        return []

    nodes = _splitter.get_nodes_from_documents([Document(text=plain)])
    return [
        {"text": node.text, "position": idx}
        for idx, node in enumerate(nodes)
    ]


async def ingest_note(
    driver: AsyncDriver,
    note_id: str,
    note_title: str,
    content: str,
    notebook_id: str,
) -> None:
    """Run the full ingestion pipeline for a single note.

    1. Strip markdown and chunk the content
    2. Embed chunks via Gemini
    3. Delete stale NoteChunks for this note
    4. Store new NoteChunk nodes with NEXT edges
    5. Compute SIMILAR edges to ContentChunks and other NoteChunks
    """
    logger.info(
        "Note ingestion started — note_id=%s notebook_id=%s", note_id, notebook_id
    )

    try:
        chunks = _chunk_note(content)

        if not chunks:
            logger.info(
                "Note ingestion skipped — no text after stripping — note_id=%s", note_id
            )
            return

        chunks = await _embed_chunks(chunks)

        repo = NoteChunkRepository(driver)
        await repo.delete_by_note(note_id)
        chunk_ids = await repo.create_chunks(note_id, note_title, chunks)

        await compute_note_similar_edges(driver, chunk_ids, notebook_id)

        logger.info(
            "Note ingestion complete — note_id=%s chunks_stored=%d",
            note_id, len(chunk_ids),
        )
    except Exception:
        logger.exception(
            "Note ingestion failed — note_id=%s notebook_id=%s", note_id, notebook_id
        )
