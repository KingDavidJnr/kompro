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
- The user's role is returned as a small summary ({ id, name }) and never
  includes the password hash.

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

Response 201:
```json
{
  "message": "User created",
  "data": {
    "user": { "id": "clr...", "email": "jane@org.com", "name": "Jane", "active": true, "roleId": "clr...", "role": { "id": "clr...", "name": "member" }, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z" }
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
