# Users Module

## Purpose

Lets administrators manage the people who can access this Kompro deployment.
Supports listing, viewing, creating, updating and deleting users, and assigns
each user a role from the IAM system.

## How it works

- Every route requires a valid session (requireAuth) and a users:* permission.
- Passwords are hashed with bcrypt on create and on password update.
- Disabling a user (active = false) or deleting them revokes access instantly:
  requireAuth re-checks the user and their session on every request, so the
  next call fails even if an old JWT is still present.
- Creating a user with a password makes the account active immediately. Creating
  a user without a password sends an invitation email containing a one-time link
  (see the Invitations section). The new account stays inactive until the invite
  is accepted, so the invited person cannot log in beforehand.
- The user's role is returned as a small summary ({ id, name }) and never
  includes the password hash.
- User creation is audited as the "invite" action and deletion as "remove".

## Notifications

All of these emails are best-effort: if SMTP is not configured, or the user has
no email address, the notification is skipped silently and the action still
succeeds.

- Account removed (`DELETE`): the former account email is sent `sendUserRemoved`.
- Deactivated / reactivated: the affected user is emailed about the change.
- Role changed (PATCH with a new `roleId`): the affected user is emailed about
  their new role.
- Password changed (PATCH with a new `password`): the affected user is emailed a
  "your password was changed" notice.

## API

All responses use the shape `{ "message": string, "data": object }`.

### GET /api/users

Lists users with pagination. Requires users:read.

Query parameters (optional):
- page (default 1)
- pageSize (default 25, max 100)

Response 200:
```json
{
  "message": "Users retrieved",
  "data": {
    "users": [
      { "id": "clr...", "email": "admin@org.com", "name": "Admin", "active": true, "roleId": "clr...", "role": { "id": "clr...", "name": "admin" }, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z" }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 25
  }
}
```

### GET /api/users/:id

Returns one user. Requires users:read.

Response 200:
```json
{
  "message": "User retrieved",
  "data": {
    "user": { "id": "clr...", "email": "admin@org.com", "name": "Admin", "active": true, "roleId": "clr...", "role": { "id": "clr...", "name": "admin" }, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z" }
  }
}
```

Response 404:
```json
{ "message": "User not found" }
```

### POST /api/users

Creates a user. Requires users:create.

Request body:
```json
{
  "email": "jane@org.com",
  "password": "sup3rsecret",
  "name": "Jane",
  "roleId": "clr...",
  "active": true
}
```

If a password is supplied the account is created active and the response
message is "User created". If no password is supplied the user is invited by
email and the response message is "User invited" with an inactive user.

Response 201 (direct creation):
```json
{
  "message": "User created",
  "data": {
    "user": { "id": "clr...", "email": "jane@org.com", "name": "Jane", "active": true, "roleId": "clr...", "role": { "id": "clr...", "name": "member" }, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z" }
  }
}
```

Response 201 (invitation, no password, SMTP configured):
```json
{
  "message": "User invited",
  "data": {
    "user": { "id": "clr...", "email": "jane@org.com", "name": "Jane", "active": false, "roleId": "clr...", "role": { "id": "clr...", "name": "member" }, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z" }
  }
}
```

Response 201 (invitation, no password, SMTP NOT configured):
```json
{
  "message": "User invited",
  "data": {
    "user": { "id": "clr...", "email": "jane@org.com", "name": "Jane", "active": false, "roleId": "clr...", "role": { "id": "clr...", "name": "member" }, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z" },
    "inviteUrl": "http://localhost:5173/accept-invite?token=one-time-token"
  }
}
```

Response 400:
```json
{ "message": "Valid email required" }
```

Response 409 (email already exists):
```json
{ "message": "Resource already exists" }
```

### PATCH /api/users/:id

Updates a user. Requires users:update. All body fields are optional.

Request body:
```json
{
  "name": "Jane Doe",
  "active": false,
  "roleId": "clr..."
}
```

Response 200:
```json
{
  "message": "User updated",
  "data": {
    "user": { "id": "clr...", "email": "jane@org.com", "name": "Jane Doe", "active": false, "roleId": "clr...", "role": { "id": "clr...", "name": "member" }, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z" }
  }
}
```

### DELETE /api/users/:id

Deletes a user. Requires users:delete.

Response 200:
```json
{ "message": "User deleted", "data": {} }
```

Response 404:
```json
{ "message": "User not found" }
```

### POST /api/users/:id/deactivate

Disables a user and immediately revokes all of their active sessions. Requires
users:update. The account cannot log in afterwards; re-enable with reactivate.

Response 200:
```json
{ "message": "User deactivated", "data": { "user": { "id": "clr...", "active": false } } }
```

### POST /api/users/:id/reactivate

Re-enables a previously disabled user. Requires users:update.

Response 200:
```json
{ "message": "User reactivated", "data": { "user": { "id": "clr...", "active": true } } }
```

### DELETE /api/users/:id

Deletes a user. Requires users:delete. The last administrator cannot be
deleted; attempting to do so returns 400:

```json
{ "message": "Cannot delete the last admin" }
```

### POST /api/users/:id/resend-invite

Re-sends the invitation email for a user who has not yet accepted. Requires
users:create. The user must still be inactive (already-active users cannot be
re-invited). Any outstanding invite for that user is invalidated first.

When SMTP is configured the email is sent and the response is:

Response 200:
```json
{ "message": "Invitation resent", "data": {} }
```

When SMTP is NOT configured the new invitation link is returned in the response
so the admin can forward it manually:

Response 200:
```json
{
  "message": "Invitation link generated",
  "data": { "inviteUrl": "http://localhost:5173/accept-invite?token=one-time-token" }
}
```

Response 400 (already active):
```json
{ "message": "User is already active" }
```

Response 404:
```json
{ "message": "User not found" }
```

### Accepting an invitation

The invited person opens the link emailed to them, which points at
`/accept-invite?token=...` on the frontend. The frontend calls the public
endpoint below to set a password and activate the account.

`POST /api/auth/accept-invite`

Request body:
```json
{
  "token": "one-time-token-from-email",
  "password": "new-secret-password"
}
```

Response 200:
```json
{
  "message": "Invitation accepted. You can now log in.",
  "data": {
    "user": { "id": "clr...", "email": "jane@org.com", "name": "Jane", "active": true, "roleId": "clr...", "role": { "id": "clr...", "name": "member" }, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z" }
  }
}
```

Response 400 (invalid, used or expired token):
```json
{ "message": "Invitation is invalid or already used" }
```

Note: SMTP is optional. When SMTP_HOST is set, invitation emails are sent
automatically. When it is not set, the API still creates the invited (inactive)
account and returns the invitation link in `inviteUrl` so the admin can send it
manually. The link expires after INVITE_TTL_HOURS (default 72).
