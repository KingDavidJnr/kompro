# Controls Module

## Purpose

Manages the organization's controls: the security, operational, administrative
or compliance objectives it maintains. Controls are framework-agnostic. Later
modules (mappings, frameworks, assessments) build on top of them, but a control
is a first-class record on its own with a title, description, category, owner
and a current implementation status.

## How it works

- Every route requires authentication and a controls:* permission.
- A control stores a status field representing its current state. Allowed
  values are: not_implemented, partial, implemented, needs_review.
- Listing supports filtering by category and status, plus pagination.
- Controls are not tied to any framework. Cross-framework mapping is added by
  a later module.

## API

All responses use the shape `{ "message": string, "data": object }`.

### GET /api/controls

Lists controls with optional filtering and pagination. Requires controls:read.

Query parameters (all optional):
- page (default 1)
- pageSize (default 25, max 100)
- category (exact match)
- status (one of the allowed values)

Response 200:
```json
{
  "message": "Controls retrieved",
  "data": {
    "controls": [
      { "id": "clr...", "title": "MFA for privileged accounts", "description": "Enforce MFA", "category": "Access Control", "status": "implemented", "owner": "Security", "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z" }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 25
  }
}
```

### GET /api/controls/:id

Returns one control. Requires controls:read.

Response 200:
```json
{
  "message": "Control retrieved",
  "data": {
    "control": { "id": "clr...", "title": "MFA for privileged accounts", "description": "Enforce MFA", "category": "Access Control", "status": "implemented", "owner": "Security", "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z" }
  }
}
```

Response 404:
```json
{ "message": "Control not found" }
```

### POST /api/controls

Creates a control. Requires controls:create.

Request body:
```json
{
  "title": "MFA for privileged accounts",
  "description": "Enforce MFA for all admin accounts",
  "category": "Access Control",
  "status": "partial",
  "owner": "Security"
}
```

Response 201:
```json
{
  "message": "Control created",
  "data": {
    "control": { "id": "clr...", "title": "MFA for privileged accounts", "description": "Enforce MFA", "category": "Access Control", "status": "partial", "owner": "Security", "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z" }
  }
}
```

Response 400 (invalid status):
```json
{ "message": "Status must be one of: not_implemented, partial, implemented, needs_review" }
```

### PATCH /api/controls/:id

Updates a control. Requires controls:update. All fields optional.

Request body:
```json
{
  "status": "implemented"
}
```

Response 200:
```json
{
  "message": "Control updated",
  "data": {
    "control": { "id": "clr...", "title": "MFA for privileged accounts", "description": "Enforce MFA", "category": "Access Control", "status": "implemented", "owner": "Security", "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z" }
  }
}
```

### DELETE /api/controls/:id

Deletes a control. Requires controls:delete.

Response 200:
```json
{ "message": "Control deleted", "data": {} }
```

Response 404:
```json
{ "message": "Control not found" }
```
