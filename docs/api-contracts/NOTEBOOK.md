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
