# Auth API Contract

## 1. Register
**POST** `api/auth/register`
**Auth:** None

**Request Body:** 
 ```json 
{
    "email": "string",
    "password": "string",
    "full_name": "string"
}
```

***Success Response (201):**
```json
{
    "user_id": "uuid",
    "email": "string",
    "full_name": "string",
    "created_at": "ISO 8601 timestamp"
}
```

**Errors:**
- `400` - missing fields or invalid email format
- `409` - email already registered

---
## 2.Login
**POST** `/api/auth/login`
**Auth:** None

**Request Body:**
```json
{
    "email": "string",
    "password": "string"
}
```

**Success Response (200):**
```json
{
    "access_token": "string",
    "token_type": "bearer",
    "user_id": "uuid",
    "full_time": "string"
}
```

**Errors:**
- `401` - wrong email or password
- `400` - missing fields

---

## 3. Logout
**POST** `api/auth/logout`
**Auth:** Bearer JWT token

**Request Body:** None

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```
**Errors:**
- `401` — invalid or expired token
