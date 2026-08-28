# Auth Module

## Purpose

Handles authentication for the Kompro backend. Provides user registration,
login, logout and current user lookup. Passwords are hashed with bcrypt and
access is granted via a signed session JWT stored in an httpOnly cookie. A
database-backed session enables instant revocation when a user is disabled.

## How it works

- Registration is public. The first user created becomes an admin. Later users
  receive the member role by default.
- Login verifies the password with bcrypt, creates a Session row and signs a
  JWT containing the user id and session id. The JWT is returned in an
  httpOnly cookie.
- Every protected request runs requireAuth, which verifies the JWT signature
  and confirms the session is still active and the user is active.
- Logout marks the session as revoked.

## API

All responses use the shape `{ "message": string, "data": object }`.

### POST /api/auth/register

Registers a new user.

Request body:
```json
{
  "email": "admin@org.com",
  "password": "sup3rsecret",
  "name": "Admin"
}
```

Responses:

- 201 Created
```json
{
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "clr...",
      "email": "admin@org.com",
      "name": "Admin",
      "active": true,
      "roleId": "clr...",
      "createdAt": "2026-08-28T00:00:00.000Z",
      "updatedAt": "2026-08-28T00:00:00.000Z"
    }
  }
}
```

- 400 Validation failed
```json
{ "message": "Valid email required" }
```

- 409 Resource already exists
```json
{ "message": "Resource already exists" }
```

### POST /api/auth/login

Authenticates a user and sets the session cookie.

Request body:
```json
{
  "email": "admin@org.com",
  "password": "sup3rsecret"
}
```

Responses:

- 200 OK (sets cookie "token")
```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": "clr...",
      "email": "admin@org.com",
      "name": "Admin",
      "active": true,
      "roleId": "clr...",
      "createdAt": "2026-08-28T00:00:00.000Z",
      "updatedAt": "2026-08-28T00:00:00.000Z"
    }
  }
}
```

- 401 Unauthorized
```json
{ "message": "Unauthorized" }
```

### POST /api/auth/accept-invite

Public endpoint used by an invited user to set their password and activate the
account. The token comes from the invitation email link.

Request body:
```json
{
  "token": "one-time-token-from-email",
  "password": "new-secret-password"
}
```

Responses:

- 200 OK
```json
{
  "message": "Invitation accepted. You can now log in.",
  "data": {
    "user": {
      "id": "clr...",
      "email": "jane@org.com",
      "name": "Jane",
      "active": true,
      "roleId": "clr...",
      "createdAt": "2026-08-28T00:00:00.000Z",
      "updatedAt": "2026-08-28T00:00:00.000Z"
    }
  }
}
```

- 400 Validation failed or bad token
```json
{ "message": "Invitation is invalid or already used" }
```

Note: an invitation can only be used once and expires after INVITE_TTL_HOURS
(default 72). Expired or used tokens are rejected.

### POST /api/auth/logout

Revokes the current session. Requires authentication.

Responses:

- 200 OK
```json
{ "message": "Logout successful", "data": {} }
```

- 401 Unauthorized
```json
{ "message": "Unauthorized" }
```

### GET /api/auth/me

Returns the authenticated user. Requires authentication.

Responses:

- 200 OK
```json
{
  "message": "Current user retrieved",
  "data": {
    "user": {
      "id": "clr...",
      "email": "admin@org.com",
      "name": "Admin",
      "active": true,
      "roleId": "clr...",
      "createdAt": "2026-08-28T00:00:00.000Z",
      "updatedAt": "2026-08-28T00:00:00.000Z"
    }
  }
}
```

- 401 Unauthorized
```json
{ "message": "Unauthorized" }
```
