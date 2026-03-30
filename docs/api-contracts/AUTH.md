# Auth API Contract

All paths are under **`/api/v1/auth`**. The live OpenAPI spec is served at **`/api/v1/openapi.json`**.

Authentication for protected routes uses a **Bearer JWT** in the `Authorization` header. The frontend stores the access token (Zustand + `localStorage`) and attaches it via Axios; see `frontend/src/lib/api/client.ts`.

---

## Username and password rules (registration)

These rules apply to **`POST /api/v1/auth/register`** and are mirrored in **`frontend/src/lib/authPolicy.ts`** for client-side validation and UI copy.

| Field | Rules |
|--------|--------|
| **Username** | After trimming: **3–32** characters. Allowed characters: **letters**, **digits**, **`_`**, **`-`** only. |
| **Password** | **8–128** characters. Must contain **at least one letter** (**A–Z** or **a–z**) and **at least one digit** (**0–9**). |

**Login** (`POST /api/v1/auth/token`) accepts any **non-empty** password so existing users are not locked out if rules change later.

---

## 1. Register

**POST** `/api/v1/auth/register`  
**Auth:** None

**Request body (JSON):**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success (201):**

```json
{
  "id": "uuid",
  "username": "string"
}
```

**Errors:**

| Status | Condition |
|--------|-----------|
| **422** | Validation failed (username/password do not meet the rules above). Response body follows FastAPI/Pydantic `detail` format. |
| **409** | Username already taken. |

---

## 2. Login (access token)

**POST** `/api/v1/auth/token`  
**Auth:** None  

*(Contract drafts may have referred to `/auth/login`; the implemented route is **`/auth/token`**.)*

**Request body (JSON):**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success (200):**

```json
{
  "access_token": "string",
  "token_type": "bearer"
}
```

The access token is a **JWT** (HS256). Claims used by the product today include:

- **`sub`** — user id (UUID string)
- **`username`** — display name for the UI
- **`exp`** — expiry (default: 24 hours from issuance)

The response does **not** embed `user_id` or profile fields separately; clients may read **`sub`** / **`username`** from the JWT payload if needed (verification of the signature is server-side only).

**Errors:**

| Status | Condition |
|--------|-----------|
| **422** | Missing or empty username/password (after trim for username). |
| **401** | Unknown username or wrong password. |

---

## 3. Logout

**Status:** There is **no** dedicated logout endpoint in the API yet.

Clients should **clear the stored access token** and stop sending `Authorization`. The frontend implements this via **`useAuthStore`** (e.g. NavBar “Sign out”).

A future **`POST /api/v1/auth/logout`** could invalidate refresh tokens or sessions if the product adds server-side session management.

---

## Example (curl)

Register:

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"student1","password":"Secret12"}'
```

Login:

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"username":"student1","password":"Secret12"}'
```

Call a protected route:

```bash
TOKEN="<paste access_token>"
curl -s http://localhost:8000/api/v1/notebooks \
  -H "Authorization: Bearer $TOKEN"
```

---

## Frontend routes (reference)

| Route | Purpose |
|--------|---------|
| `/login` | Sign in |
| `/register` | Create account (shows the same username/password requirements as this doc) |

---

## Changelog (vs. earlier draft)

- Identifiers are **`username` + `password`**, not email / `full_name`.
- Login path is **`POST /auth/token`**, not `/auth/login`.
- Register response returns **`id`** and **`username`**, not `user_id` / email.
- Validation errors use **422** with Pydantic `detail`, not generic **400** for field rules.
- Logout is **client-side** until a server endpoint exists.
