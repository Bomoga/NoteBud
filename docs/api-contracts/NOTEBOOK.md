# Notebook API Contract 

## 1. Create Notebook
**POST** `/api/v1/notebooks`
**Auth:** Bearer JWT token

**Request Body**
```json
{
    "title": "string",
    "course_code": "string"
}
```

**Success response (201):**
```json
{
    "id": "integer",
    "title": "string",
    "course_code": "string",
    "description": "string",
    "created_at": "datetime",
    "updated_at": "datetime",
    "owner_id": "integer"
}
```

**Errors:**
- `400` - missing name 
- `401` - not authenticated
 
---

## 2. Get ALL Notebooks
**GET** `/api/v1/notebooks`
**Auth:** Bearer JWT token

**Success Response (200):**
```json
[
  {
    "id": "integer",
    "title": "string",
    "course_code": "string",
    "description": "string",
    "created_at": "datetime",
    "updated_at": "datetime",
    "owner_id": "integer"
  }
]
```

**Errors:**
- `401` — not authenticated
## 3. Upload File to Notebook
**POST** `/api/v1/notebooks/{id}/files`
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
{
  "file_id": "uuid",
  "notebook_id": "integer",
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
