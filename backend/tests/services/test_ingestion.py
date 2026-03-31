"""Tests for the ingestion pipeline (extract, chunk, embed)."""
import os
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.services.ingestion.ingestion_service import (
    _chunk_text,
    _extract_text,
    _embed_chunks,
    _resolve_extension,
    ingest_document,
)


# ---------------------------------------------------------------------------
# _resolve_extension
# ---------------------------------------------------------------------------

class TestResolveExtension:
    def test_pdf_from_filename(self):
        assert _resolve_extension("gs://b/some-uuid.bin", "lecture.pdf") == ".pdf"

    def test_docx_from_filename(self):
        assert _resolve_extension("gs://b/f", "notes.docx") == ".docx"

    def test_pptx_from_filename(self):
        assert _resolve_extension("gs://b/f", "slides.pptx") == ".pptx"

    def test_falls_back_to_gcs_uri(self):
        assert _resolve_extension("gs://b/folder/file.pdf", "unknown") == ".pdf"

    def test_raises_for_unsupported(self):
        with pytest.raises(ValueError, match="UNSUPPORTED_FILE_TYPE"):
            _resolve_extension("gs://b/f.txt", "readme.txt")


# ---------------------------------------------------------------------------
# _chunk_text
# ---------------------------------------------------------------------------

class TestChunkText:
    def test_single_short_page_becomes_one_chunk(self):
        pages = [
            {
                "text": "This is a short paragraph about biology.",
                "page_number": "1",
                "slide_number": None,
                "source_file": "test.pdf",
            }
        ]
        chunks = _chunk_text(pages)
        assert len(chunks) >= 1
        assert chunks[0]["position"] == 0
        assert chunks[0]["source_file"] == "test.pdf"
        assert chunks[0]["page_number"] == "1"

    def test_positions_are_sequential_across_pages(self):
        pages = [
            {
                "text": "Page one content. " * 50,
                "page_number": "1",
                "slide_number": None,
                "source_file": "test.pdf",
            },
            {
                "text": "Page two content. " * 50,
                "page_number": "2",
                "slide_number": None,
                "source_file": "test.pdf",
            },
        ]
        chunks = _chunk_text(pages)
        positions = [c["position"] for c in chunks]
        assert positions == list(range(len(chunks)))

    def test_metadata_preserved(self):
        pages = [
            {
                "text": "Slide content about math.",
                "page_number": None,
                "slide_number": 3,
                "source_file": "lecture.pptx",
            }
        ]
        chunks = _chunk_text(pages)
        assert chunks[0]["slide_number"] == 3
        assert chunks[0]["source_file"] == "lecture.pptx"


# ---------------------------------------------------------------------------
# _extract_text (with mocked GCS)
# ---------------------------------------------------------------------------

class TestExtractText:
    @pytest.mark.asyncio
    async def test_pdf_extraction(self, tmp_path):
        """Test that _extract_text dispatches to PDFReader and returns pages."""
        fake_docs = [
            MagicMock(text="Page one text.", metadata={"page_label": "1"}),
            MagicMock(text="Page two text.", metadata={"page_label": "2"}),
        ]

        with (
            patch(
                "src.services.ingestion.ingestion_service.storage_service"
            ) as mock_storage,
            patch(
                "src.services.ingestion.ingestion_service.PDFReader"
            ) as mock_reader_cls,
        ):
            mock_storage.download_to_tempfile.return_value = str(
                tmp_path / "test.pdf"
            )
            mock_reader_cls.return_value.load_data.return_value = fake_docs
            # Create the temp file so os.unlink doesn't fail
            (tmp_path / "test.pdf").touch()

            pages = await _extract_text("gs://bucket/test.pdf", "lecture.pdf")

        assert len(pages) == 2
        assert pages[0]["text"] == "Page one text."
        assert pages[0]["page_number"] == "1"
        assert pages[0]["source_file"] == "lecture.pdf"

    @pytest.mark.asyncio
    async def test_extraction_fails_on_empty_text(self, tmp_path):
        """Extraction should raise if all pages are empty."""
        fake_docs = [MagicMock(text="   ", metadata={})]

        with (
            patch(
                "src.services.ingestion.ingestion_service.storage_service"
            ) as mock_storage,
            patch(
                "src.services.ingestion.ingestion_service.PDFReader"
            ) as mock_reader_cls,
        ):
            mock_storage.download_to_tempfile.return_value = str(
                tmp_path / "empty.pdf"
            )
            mock_reader_cls.return_value.load_data.return_value = fake_docs
            (tmp_path / "empty.pdf").touch()

            with pytest.raises(ValueError, match="EXTRACTION_FAILED"):
                await _extract_text("gs://bucket/empty.pdf", "empty.pdf")

    @pytest.mark.asyncio
    async def test_pptx_extraction_assigns_slide_numbers(self, tmp_path):
        fake_docs = [
            MagicMock(text="Slide 1 text."),
            MagicMock(text="Slide 2 text."),
        ]

        with (
            patch(
                "src.services.ingestion.ingestion_service.storage_service"
            ) as mock_storage,
            patch(
                "src.services.ingestion.ingestion_service.PptxReader"
            ) as mock_reader_cls,
        ):
            mock_storage.download_to_tempfile.return_value = str(
                tmp_path / "deck.pptx"
            )
            mock_reader_cls.return_value.load_data.return_value = fake_docs
            (tmp_path / "deck.pptx").touch()

            pages = await _extract_text("gs://bucket/deck.pptx", "deck.pptx")

        assert pages[0]["slide_number"] == 1
        assert pages[1]["slide_number"] == 2


# ---------------------------------------------------------------------------
# _embed_chunks (with mocked Gemini)
# ---------------------------------------------------------------------------

class TestEmbedChunks:
    @pytest.mark.asyncio
    async def test_attaches_embeddings(self):
        fake_embedding = [0.1] * 768
        fake_response = MagicMock()
        fake_response.embeddings = [MagicMock(values=fake_embedding)]

        fake_client = MagicMock()
        fake_client.models.embed_content.return_value = fake_response

        chunks = [
            {"text": "hello world", "position": 0},
            {"text": "test chunk", "position": 1},
        ]

        with patch(
            "src.services.ingestion.ingestion_service._get_genai_client",
            return_value=fake_client,
        ):
            result = await _embed_chunks(chunks)

        assert len(result) == 2
        assert result[0]["embedding"] == fake_embedding
        assert result[1]["embedding"] == fake_embedding
        assert fake_client.models.embed_content.call_count == 2


# ---------------------------------------------------------------------------
# ingest_document (end-to-end with mocks)
# ---------------------------------------------------------------------------

class TestIngestDocument:
    @pytest.mark.asyncio
    async def test_success_sets_status_ready(self):
        """On successful ingestion, document status should become 'ready'."""
        mock_driver = MagicMock()
        fake_pages = [
            {
                "text": "Some document text for testing purposes.",
                "page_number": "1",
                "slide_number": None,
                "source_file": "test.pdf",
            }
        ]
        fake_embedding = [0.1] * 768

        with (
            patch(
                "src.services.ingestion.ingestion_service._extract_text",
                return_value=fake_pages,
            ),
            patch(
                "src.services.ingestion.ingestion_service._embed_chunks",
                side_effect=lambda chunks: [
                    {**c, "embedding": fake_embedding} for c in chunks
                ],
            ),
            patch(
                "src.services.ingestion.ingestion_service.store_chunks",
                return_value=["chunk-1"],
            ) as mock_store,
            patch(
                "src.services.ingestion.ingestion_service.DocumentRepository"
            ) as mock_repo_cls,
        ):
            mock_repo = MagicMock()
            mock_repo.update_status = AsyncMock()
            mock_repo_cls.return_value = mock_repo

            await ingest_document(
                driver=mock_driver,
                document_id="doc-1",
                gcs_uri="gs://bucket/test.pdf",
                source_type="content",
                filename="test.pdf",
            )

            mock_repo.update_status.assert_called_once_with("doc-1", "ready")
            mock_store.assert_called_once()

    @pytest.mark.asyncio
    async def test_failure_sets_status_error(self):
        """On ingestion failure, document status should become 'error'."""
        mock_driver = MagicMock()

        with (
            patch(
                "src.services.ingestion.ingestion_service._extract_text",
                side_effect=ValueError("EXTRACTION_FAILED"),
            ),
            patch(
                "src.services.ingestion.ingestion_service.DocumentRepository"
            ) as mock_repo_cls,
        ):
            mock_repo = MagicMock()
            mock_repo.update_status = AsyncMock()
            mock_repo_cls.return_value = mock_repo

            await ingest_document(
                driver=mock_driver,
                document_id="doc-1",
                gcs_uri="gs://bucket/bad.pdf",
                source_type="content",
                filename="bad.pdf",
            )

            mock_repo.update_status.assert_called_once_with("doc-1", "error")
