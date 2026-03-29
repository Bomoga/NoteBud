# NoteBud — Auth Backend Contracts

> Written for the frontend developer implementing the login page.
> Last updated: 2026-03-29
> Backend branch: `auth-backend-fix`

---

## Overview

The backend now enforces JWT-based authentication on all notebook-related routes. There is no third-party auth provider — the backend issues its own tokens via two new endpoints.

The frontend is responsible for:
1. Registering a user (`POST /auth/register`)
2. Logging in to get a token (`POST /auth/token`)
3. Storing the token in the Zustand auth store (`frontend/src/lib/store/auth.ts`)
4. Attaching the token to every subsequent API request via the `Authorization` header

---

## Base URL

```
http://localhost:8000/api/v1        ← development
https://staging-api.notebud.com/api/v1  ← staging
```

The frontend axios client (`frontend/src/lib/api/client.ts`) already sets this via `NEXT_PUBLIC_API_URL`.

---

## Auth Endpoints

### `POST /api/v1/auth/register`

Creates a new user account.

**Request body:**
```json
{
  "username": "bomoga",
  "password": "notesarecool"
}
```

**Success — `201 Created`:**
```json
{
  "id": "aeaf2e7f-0db4-4a60-acdf-7d1f1624eef3",
  "username": "bomoga"
}
```

**Error responses:**

| Status | Detail | When |
|--------|--------|------|
| `400` | `"Username and password are required."` | Empty username or password |
| `409` | `"Username 'bomoga' is already taken."` | Duplicate username |

---

### `POST /api/v1/auth/token`

Verifies credentials and returns a signed JWT.

**Request body:**
```json
{
  "username": "bomoga",
  "password": "notesarecool"
}
```

**Success — `200 OK`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error responses:**

| Status | Detail | When |
|--------|--------|------|
| `401` | `"Invalid username or password"` | Wrong credentials or unknown user |

---

## Token Format

- Algorithm: **HS256**
- Claims:
  - `sub` — the user's UUID (`id` from register response)
  - `exp` — expiry timestamp (24 hours from issue)
- The token is opaque to the frontend — just store and forward it.

---

## Using the Token

Every protected request must include:

```
Authorization: Bearer <access_token>
```

**All notebook routes are protected.** Missing or invalid token responses:

| Status | Detail | When |
|--------|--------|------|
| `401` | `"Not authenticated"` | No `Authorization` header |
| `401` | `"Token has expired"` | Token older than 24 hours |
| `401` | `"Invalid token"` | Malformed or tampered token |
| `403` | `"Not authorized"` | Valid token but wrong owner for that resource |

---

## Zustand Auth Store

Already created at `frontend/src/lib/store/auth.ts`. Shape:

```typescript
interface AuthState {
  token: string | null;
  userId: string | null;
  username: string | null;
  setSession: (token: string, userId: string, username: string) => void;
  clearSession: () => void;
}
```

- Persisted to `localStorage` under key `notebud-auth` via Zustand `persist` middleware.
- After a successful `POST /auth/token`, call:
  ```typescript
  useAuthStore.getState().setSession(access_token, id, username)
  ```
- On logout, call `clearSession()`.

---

## Login Page Implementation Checklist

1. **Register form** — `POST /auth/register` with `{ username, password }`
   - Show 409 error as "Username already taken"
   - On success, redirect to login or auto-login

2. **Login form** — `POST /auth/token` with `{ username, password }`
   - On success:
     - Call `setSession(access_token, userId, username)` from the auth store
     - Redirect to `/backpack`
   - On 401: show "Invalid username or password"

3. **Token persistence** — already handled by Zustand `persist` (survives page refresh)

4. **Logout** — call `clearSession()`, redirect to `/login`

---

## Axios Interceptor (pending S5-40)

The axios client at `frontend/src/lib/api/client.ts` has a TODO on line 14 to attach the token. Once S5-40 is implemented it will read from the Zustand store automatically:

```typescript
// client.ts line 14 — to be implemented in S5-40
const token = useAuthStore.getState().token;
if (token) config.headers.Authorization = `Bearer ${token}`;
```

Until S5-40 is done, you can manually set the header in individual requests for testing, but the login page itself only calls the two unauthenticated auth endpoints so this isn't blocking.

---

## Protected Routes Summary

| Method | Route | Auth required | Ownership check |
|--------|-------|--------------|-----------------|
| `POST` | `/notebooks` | Yes | Sets `owner_id` |
| `GET` | `/notebooks` | Yes | Returns only caller's notebooks |
| `GET` | `/notebooks/{id}` | Yes | No ownership check |
| `PATCH` | `/notebooks/{id}` | Yes | 403 if not owner |
| `DELETE` | `/notebooks/{id}` | Yes | 403 if not owner |
| `POST` | `/files/upload` | Yes | 403 if not owner |
| `POST` | `/notebooks/{id}/tags` | Yes | 403 if not owner |
| `DELETE` | `/notebooks/{id}/tags/{tag}` | Yes | 403 if not owner |
| `POST` | `/notebooks/{id}/query` | Yes | 403 if not owner |
| `GET` | `/courses` | No | — |
| `GET` | `/health` | No | — |
| `POST` | `/auth/register` | No | — |
| `POST` | `/auth/token` | No | — |
