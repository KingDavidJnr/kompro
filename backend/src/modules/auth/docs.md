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
- Every successful login writes an `audit` entry (action `login`). If the login
  comes from an IP that has never been seen for that account before, the user is
  emailed a "new sign-in" alert via `sendNotification` (see `isNewLoginIp`).
- Completing a password reset (`/reset-password`) emails the account a
  "your password was changed" notice, and revokes all other sessions.

## Notifications

- New sign-in from a new IP: alert sent to the account email, listing the time
  and the new IP.
- Password changed via reset: confirmation sent to the account email.

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

### POST /api/auth/forgot-password

Public endpoint to start a password reset. Rate limited per email address
(not per IP) to protect shared corporate networks.

Request body:
```json
{ "email": "jane@org.com" }
```

Responses:

- 200 OK (always a generic message to avoid account enumeration)

  The response is identical whether or not the account exists, and it never
  includes the reset token or link.

```json
{ "message": "If that account exists, a reset link has been sent." }
```

  When SMTP is not configured the link cannot be emailed, so it is written to
  the server log (for example `[password-reset] SMTP not configured. Manual
  reset link for jane@org.com: http://localhost:5173/reset-password?token=...`)
  for a self-hosted operator to deliver out of band. It is never returned to the
  caller, so guessing an email cannot yield a usable reset link.

### POST /api/auth/reset-password

Public endpoint to set a new password using the token from the reset link.
All active sessions for the account are revoked so the reset forces re-login.

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
  "message": "Password has been reset. You can now log in.",
  "data": { "user": { "id": "clr...", "email": "jane@org.com", "active": true } }
}
```

- 400 Bad or expired token
```json
{ "message": "Reset link has expired" }
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
