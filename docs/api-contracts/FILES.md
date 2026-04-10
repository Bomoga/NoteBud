# Notebook files API contract

This document is the **source of truth** for the notebook file upload feature (Sprint S3-style tasks: upload panel, list, status polling). The backend splits responsibilities across two routers; some task write-ups abbreviate paths as `GET /files` — **that is not a real route in this repo**. Use the paths below.

| Concern | Router module | HTTP |
|--------|---------------|------|
| Upload | `backend/src/api/routers/files.py` | `POST /api/v1/files/upload` |
| List (for UI + polling) | `backend/src/api/routers/notebooks.py` | `GET /api/v1/notebooks/{notebook_id}/documents` |

**Frontend today:** `uploadFile` lives in `frontend/src/lib/api/notebooks.ts`; listing lives in `frontend/src/lib/api/documents.ts` as `listDocuments`. A dedicated `lib/api/files.ts` with `uploadFile` + `getFiles` is optional naming—**call the URLs above** regardless of file layout.

---

## Product context (file upload panel)

End-to-end behavior the UI should implement:

- **Input:** Drag-and-drop or file picker; **restrict extensions** client-side to `.pdf`, `.pptx`, `.docx` (and show a clear error otherwise). The upload endpoint does not currently validate MIME/extension; enforcement is a UX requirement until/unless the API adds validation.
- **Upload:** `POST /api/v1/files/upload` with multipart `file` and query `notebook_id`. Use the client’s **upload progress** callback (e.g. axios `onUploadProgress`) for the progress bar.
- **List:** After upload, refresh the list from **`GET /api/v1/notebooks/{notebook_id}/documents`**.
- **Polling:** While **any** document has `status === "processing"`, refetch the list on an interval (e.g. every **3 seconds**). Stop when every item is `ready` or `error` (or the user leaves the view / aborts timers).
- **Mocks:** Should return JSON matching the **upload response** and **list item** shapes in this file so S3-6 / S3-7 work can proceed before S3-3 is deployed.

---

## 1. Upload file to notebook

**POST** `/api/v1/files/upload`  
**Mount:** `/api/v1/files` + `/upload` in `main.py`

**Auth:** Bearer JWT (`get_current_user`)

**Query parameters**

| Name | Required | Description |
|------|----------|-------------|
| `notebook_id` | yes | Target notebook id |
| `source_type` | no | If exactly `syllabus`, stored as syllabus; else filename checked for substring `syllabus` (case-insensitive); otherwise `content` |
| `folder_path` | no | Default `""` |

**Body:** `multipart/form-data` — part name **`file`** (`UploadFile`). Non-empty `filename` required or **400**.

Stored `file_type` in the DB is `content_type` or `"application/octet-stream"`.

**Success (200):**

```json
{
  "status": "processing",
  "filename": "lecture-01.pdf",
  "content_type": "application/pdf",
  "gcs_uri": "gs://…",
  "document_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Errors**

| Code | When |
|------|------|
| `400` | `No file provided.` |
| `401` | JWT missing/invalid |
| `403` | `Not authorized` (not notebook owner) |
| `404` | `Notebook not found` |
| `500` | `Failed to upload file: …` |

`ingest_document` runs as a **background task** after the response is sent.

---

## 2. List files (documents) for a notebook

**GET** `/api/v1/notebooks/{notebook_id}/documents`  
**Implemented in** `notebooks.py` (not `files.py`). Use this for the file list and for **polling** processing status.

**Auth:** Bearer JWT

**Success (200):** Array of `:Document` nodes, ordered by `filename`. Typical shape:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "filename": "lecture-01.pdf",
    "file_type": "application/pdf",
    "source_type": "content",
    "status": "processing",
    "gcs_uri": "gs://…",
    "folder_path": ""
  }
]
```

**`status` values** (from ingestion): `processing` immediately after upload; then **`ready`** or **`error`**.

**Errors**

| Code | When |
|------|------|
| `401` | JWT missing/invalid |
| `403` | Not notebook owner |
| `404` | Notebook not found |

---

## TypeScript shapes (align mocks and clients)

These names match the sprint idea of typed API helpers; **fields must match the JSON above**, not older sketches that used `file_id`, `notebook_id` on upload, or a separate `GET /files` path.

**Upload response** (e.g. `FileUploadResponse`):

```ts
export interface FileUploadResponse {
  status: 'processing';
  filename: string;
  content_type: string;
  gcs_uri: string;
  document_id: string;
}
```

**List row** (e.g. `NotebookFile` / reuse `DocumentResponse` in `documents.ts`):

```ts
export interface NotebookFile {
  id: string;
  filename: string;
  file_type: string;
  source_type: 'content' | 'syllabus';
  status: string; // 'processing' | 'ready' | 'error'
  gcs_uri: string;
  folder_path: string;
}
```

Use `status` for badges: **Processing** (e.g. amber), **Ready** (green), **Error** (red).

---

## Example: upload

```http
POST /api/v1/files/upload?notebook_id=<notebook-uuid> HTTP/1.1
Authorization: Bearer <jwt>
Content-Type: multipart/form-data; boundary=----boundary

------boundary
Content-Disposition: form-data; name="file"; filename="notes.pdf"
Content-Type: application/pdf

<binary>
------boundary--
```
