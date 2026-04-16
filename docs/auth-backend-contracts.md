# NoteBud — Auth Backend Contracts

---

## Overview

The backend now enforces JWT-based authentication on all notebook-related routes. There is no third-party auth provider — the backend issues its own tokens via two new endpoints.

The frontend is responsible for:
1. Registering a user (`POST /auth/register`)
2. Logging in to get a token (`POST /auth/token`)
3. Storing the token in the Zustand auth store (`frontend/src/lib/store/auth.ts`)
4. Attaching the token to every subsequent API request via the `Authorization` header

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

## Axios Interceptor

The axios client at `frontend/src/lib/api/client.ts` now includes a full interceptor implementation. Current behavior:

- **Token attachment** — authenticated requests automatically attach `Authorization: Bearer <token>`. The token is read from the Zustand store (`useAuthStore`) and cross-checked against the persisted `localStorage` value; if the two disagree (e.g. stale store state after sign-out) no `Authorization` header is sent.
- **Request cancellation** — every outgoing request is tracked by an `AbortController`. Caller-supplied `AbortSignal` values are composed with the internal controller so both component-level cancellations and logout-initiated aborts work correctly.
- **`401` handling** — non-auth requests that receive a `401` response automatically call `clearSession()` and redirect to `/login`, ensuring auth failures are handled consistently across the app.

Callers should use the shared `apiClient` rather than manually attaching `Authorization` headers. The only exceptions are the two unauthenticated endpoints (`/auth/register` and `/auth/token`), which are excluded from the auth-header logic automatically.

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
