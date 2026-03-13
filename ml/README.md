# ML Service — NoteBud RAG Pipeline

This package contains the RAG (Retrieval-Augmented Generation) pipeline that powers NoteBud's AI-powered Q&A. It transforms user-uploaded course materials into a searchable knowledge base and generates cited, grounded answers from a student's own notes.

## Modules

### `ingestion/`
Extract raw text and metadata from uploaded files (PDF, DOCX, PPTX) using LlamaIndex document loaders.

### `chunking/`
Split extracted text into 512-token chunks with 64-token overlap, preserving sentence boundaries and positional metadata.

### `embeddings/`
Convert text chunks into 768-dimensional dense vectors using the Gemini `text-embedding-004` model.

### `retrieval/`
Search pgvector for the top-K most semantically relevant chunks by cosine similarity, scoped to a specific notebook.

### `generation/`
Produce natural language answers grounded in retrieved chunks using Gemini 1.5 Flash, with inline citations and groundedness scoring.

## References

- [RAG Architecture](../docs/rag-architecture.md) — Full pipeline specification
- [ML Integration Points](../docs/ml-integration-points.md) — API contracts and backend integration details
