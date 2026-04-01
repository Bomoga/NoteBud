"""
Background ingestion pipeline: GCS file -> extract -> chunk -> embed -> Neo4j graph.

Called as a FastAPI BackgroundTask after file upload.
"""
import logging
import os
import time
from pathlib import Path

from google import genai
from google.genai import errors as genai_errors
from llama_index.core import Document
from llama_index.core.node_parser import SentenceSplitter
from llama_index.readers.file import DocxReader, PDFReader, PptxReader
from neo4j import AsyncDriver

from src.lib.config.settings import settings
from src.lib.repositories.document_repository import DocumentRepository
from src.lib.storage.gcs import storage_service
from src.services.vector_store.vector_store_service import store_chunks

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 768
_CHUNK_SIZE = 512
_CHUNK_OVERLAP = 64
_EMBED_MAX_RETRIES = 3
_EMBED_BACKOFF_BASE = 1  # seconds

_splitter = SentenceSplitter(chunk_size=_CHUNK_SIZE, chunk_overlap=_CHUNK_OVERLAP)


# ---------------------------------------------------------------------------
# Step 1 — Extract text from GCS file
# ---------------------------------------------------------------------------

def _resolve_extension(gcs_uri: str, filename: str) -> str:
    """Determine file extension from filename, falling back to GCS URI."""
    ext = Path(filename).suffix.lower()
    if ext in (".pdf", ".docx", ".pptx"):
        return ext
    ext = Path(gcs_uri).suffix.lower()
    if ext in (".pdf", ".docx", ".pptx"):
        return ext
    raise ValueError(f"UNSUPPORTED_FILE_TYPE: cannot determine type from '{filename}'")


async def _extract_text(gcs_uri: str, filename: str) -> list[dict]:
    """Download file from GCS, extract text using LlamaIndex readers.

    Returns a list of dicts with keys: text, page_number, slide_number, source_file.
    """
    ext = _resolve_extension(gcs_uri, filename)
    tmp_path = storage_service.download_to_tempfile(gcs_uri)

    try:
        if ext == ".pdf":
            reader = PDFReader()
            documents = reader.load_data(file=Path(tmp_path))
            pages = [
                {
                    "text": doc.text,
                    "page_number": doc.metadata.get("page_label"),
                    "slide_number": None,
                    "source_file": filename,
                }
                for doc in documents
                if doc.text.strip()
            ]
        elif ext == ".docx":
            reader = DocxReader()
            documents = reader.load_data(file=Path(tmp_path))
            pages = [
                {
                    "text": doc.text,
                    "page_number": None,
                    "slide_number": None,
                    "source_file": filename,
                }
                for doc in documents
                if doc.text.strip()
            ]
        elif ext == ".pptx":
            reader = PptxReader()
            documents = reader.load_data(file=Path(tmp_path))
            pages = [
                {
                    "text": doc.text,
                    "page_number": None,
                    "slide_number": idx + 1,
                    "source_file": filename,
                }
                for idx, doc in enumerate(documents)
                if doc.text.strip()
            ]
        else:
            raise ValueError(f"UNSUPPORTED_FILE_TYPE: {ext}")

        if not pages:
            raise ValueError(
                "EXTRACTION_FAILED: no text could be extracted from the file"
            )

        return pages
    finally:
        os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# Step 2 — Chunk text
# ---------------------------------------------------------------------------

def _chunk_text(pages: list[dict]) -> list[dict]:
    """Split page-level text into 512-token chunks with 64-token overlap.

    Input:  list of {text, page_number, slide_number, source_file}
    Output: list of {text, position, page_number, slide_number, source_file}
    """
    chunks: list[dict] = []
    position = 0

    for page in pages:
        nodes = _splitter.get_nodes_from_documents(
            [Document(text=page["text"])]
        )
        for node in nodes:
            chunks.append({
                "text": node.text,
                "position": position,
                "page_number": page.get("page_number"),
                "slide_number": page.get("slide_number"),
                "source_file": page["source_file"],
            })
            position += 1

    return chunks


# ---------------------------------------------------------------------------
# Step 3 — Embed chunks via Gemini API
# ---------------------------------------------------------------------------

def _get_genai_client() -> genai.Client:
    """Initialize and return a Gemini API client."""
    api_key = settings.gemini_api_key
    if not api_key:
        raise EnvironmentError(
            "GEMINI_API_KEY is not set — required for embedding generation"
        )
    return genai.Client(api_key=api_key)


def _embed_single(client: genai.Client, text: str) -> list[float]:
    """Generate an embedding for a single text with retry on transient errors."""
    for attempt in range(_EMBED_MAX_RETRIES):
        try:
            response = client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=text,
                config={"output_dimensionality": EMBEDDING_DIMENSIONS},
            )
            return response.embeddings[0].values
        except (genai_errors.ServerError, genai_errors.ClientError) as e:
            is_retryable = (
                isinstance(e, genai_errors.ServerError)
                or "429" in str(e)
            )
            if is_retryable and attempt < _EMBED_MAX_RETRIES - 1:
                wait = _EMBED_BACKOFF_BASE * (2 ** attempt)
                logger.warning(
                    "Gemini transient error (attempt %d/%d), retrying in %ds: %s",
                    attempt + 1, _EMBED_MAX_RETRIES, wait, e,
                )
                time.sleep(wait)
                continue
            raise RuntimeError(f"EMBEDDING_FAILED: {e}") from e
    raise RuntimeError("EMBEDDING_FAILED: max retries exceeded")


async def _embed_chunks(chunks: list[dict]) -> list[dict]:
    """Attach 768-dim Gemini embeddings to each chunk."""
    client = _get_genai_client()

    for chunk in chunks:
        chunk["embedding"] = _embed_single(client, chunk["text"])

    return chunks


# ---------------------------------------------------------------------------
# Pipeline entry-point — called as a FastAPI BackgroundTask
# ---------------------------------------------------------------------------

async def ingest_document(
    driver: AsyncDriver,
    document_id: str,
    gcs_uri: str,
    source_type: str,
    filename: str,
) -> None:
    """Run the full ingestion pipeline for a single document.

    1. Extract text from GCS file
    2. Chunk the text
    3. Embed chunks via Gemini
    4. store_chunks() -> Neo4j graph
    5. compute_similar_edges() (called by store_chunks for content)
    6. Update document status to 'ready'
    """
    doc_repo = DocumentRepository(driver)

    logger.info(
        "Ingestion started — document_id=%s gcs_uri=%s source_type=%s",
        document_id, gcs_uri, source_type,
    )
    try:
        pages = await _extract_text(gcs_uri, filename)
        chunks = _chunk_text(pages)
        chunks = await _embed_chunks(chunks)
        chunk_ids = await store_chunks(
            driver=driver,
            chunks=chunks,
            document_id=document_id,
            source_type=source_type,
        )
        await doc_repo.update_status(document_id, "ready")
        logger.info(
            "Ingestion complete — document_id=%s chunks_stored=%d",
            document_id, len(chunk_ids),
        )
    except Exception:
        logger.exception(
            "Ingestion failed — document_id=%s gcs_uri=%s", document_id, gcs_uri
        )
        try:
            await doc_repo.update_status(document_id, "error")
        except Exception:
            logger.exception(
                "Failed to update document status to error — document_id=%s",
                document_id,
            )
