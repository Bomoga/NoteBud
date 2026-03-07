# Notebook API Contract 

## 1. Create Notebook
**POST** `/api/notebooks`
**Auth:** Bearer JWT token

**Request Body**
```json
{
    "name": "string",
    "course_code": "string"
}
```

**Success response (201):**
```json
{
    "notebook_id": "uuid",
    "name": "string",
    "course_code": "string",
    "created_at": "ISO 8601 timestamp"
}
```

**Errors:**
- `400` - missing name 
- `401` - not authenticated
 
---

## 2. Get ALL Notebooks
**GET** `api/notebooks`
**Auth:** Bearer JWT token

**Success Response (200):**
```json
[
  {
    "notebook_id": "uuid",
    "name": "string",
    "course_code": "string",
    "created_at": "ISO 8601 timestamp"
  }
]
```

**Errors:**
- `401` — not authenticated
## 3. Upload File to Notebook
**POST** `/api/notebooks/{notebook_id}/files`
**Auth:** Bearer JWT token

**Request Body (multipart/form-data):**
```json
{
  "file": "binary",
  "filename": "string",
  "file_type": "pdf | docx | pptx"
}
```

**Success Response (201):**
```json
{"file_id": "uuid",
  "notebook_id": "uuid",
  "filename": "string",
  "file_type": "string",
  "upload_time": "ISO 8601 timestamp",
  "status": "processing | ready | error"
}
```

**Errors:**
- `400` — invalid file type or file too large
- `401` — not authenticated
- `404` — notebook not found
