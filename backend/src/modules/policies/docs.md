# Policies Module

## Purpose

Manages the organization's policies: the rules and requirements it establishes
for itself. A policy holds human-readable content plus an optional structured
"rules" field for machine-evaluable policy-as-code. Linking policies to
controls and frameworks is handled by a later mapping module; this module owns
the policy records.

## How it works

- Every route requires authentication and a policies:* permission.
- A policy has a lifecycle status: draft, active, retired.
- The "rules" field is a JSON value. It is stored now and evaluated later by
  the policy-as-code engine; the API accepts any JSON object or array there.
- Listing supports filtering by status and pagination.

## Notifications

- When a policy transitions to `active` (on create with `status: "active"`, or
  on update from a non-active status to `active`), every active user is emailed
  once via `notifyPolicyPublished`. Recipients are delivered as a single BCC
  batch to avoid leaking addresses. If SMTP is not configured the notification is
  skipped silently.

## API

All responses use the shape `{ "message": string, "data": object }`.

### GET /api/policies

Lists policies with optional filtering and pagination. Requires policies:read.

Query parameters (all optional):
- page (default 1)
- pageSize (default 25, max 100)
- status (one of the allowed values)

Response 200:
```json
{
  "message": "Policies retrieved",
  "data": {
    "policies": [
      { "id": "clr...", "title": "Data Encryption Policy", "description": "Encryption at rest and in transit", "content": "All databases must use encryption at rest.", "status": "active", "rules": null, "owner": "Security", "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z" }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 25
  }
}
```

### GET /api/policies/:id

Returns one policy. Requires policies:read.

Response 200:
```json
{
  "message": "Policy retrieved",
  "data": {
    "policy": { "id": "clr...", "title": "Data Encryption Policy", "description": "Encryption at rest and in transit", "content": "All databases must use encryption at rest.", "status": "active", "rules": null, "owner": "Security", "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z" }
  }
}
```

Response 404:
```json
{ "message": "Policy not found" }
```

### POST /api/policies

Creates a policy. Requires policies:create.

Request body:
```json
{
  "title": "Data Encryption Policy",
  "description": "Encryption at rest and in transit",
  "content": "All databases must use encryption at rest.",
  "status": "draft",
  "rules": { "scope": { "resource": "database" }, "rules": [{ "encryption_at_rest": "required" }] },
  "owner": "Security"
}
```

Response 201:
```json
{
  "message": "Policy created",
  "data": {
    "policy": { "id": "clr...", "title": "Data Encryption Policy", "description": "Encryption at rest and in transit", "content": "All databases must use encryption at rest.", "status": "draft", "rules": { "scope": { "resource": "database" }, "rules": [{ "encryption_at_rest": "required" }] }, "owner": "Security", "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z" }
  }
}
```

Response 400 (invalid status):
```json
{ "message": "Status must be one of: draft, active, retired" }
```

### PATCH /api/policies/:id

Updates a policy. Requires policies:update. All fields optional.

Request body:
```json
{
  "status": "active"
}
```

Response 200:
```json
{
  "message": "Policy updated",
  "data": {
    "policy": { "id": "clr...", "title": "Data Encryption Policy", "description": "Encryption at rest and in transit", "content": "All databases must use encryption at rest.", "status": "active", "rules": null, "owner": "Security", "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z" }
  }
}
```

### DELETE /api/policies/:id

Deletes a policy. Requires policies:delete.

Response 200:
```json
{ "message": "Policy deleted", "data": {} }
```

Response 404:
```json
{ "message": "Policy not found" }
```

## Policy Lifecycle

In addition to the CRUD above, a policy supports versioning, change requests,
reviews and exceptions. These sub-resources all reuse the `policies:*` permissions.

### GET /api/policies/:id/versions
Lists version snapshots for a policy. Requires policies:read.

### POST /api/policies/:id/versions
Snapshots the current content into a new version and increments the policy's
`version` counter. Requires policies:create. Body: `{ "content": string, "status": string }` (both optional).

Response 201:
```json
{ "message": "Policy version created", "data": { "version": { "id": "...", "policyId": "...", "version": 2, "content": "...", "status": "draft" } } }
```

### GET /api/policies/:id/change-requests
Lists change requests. Requires policies:read.

### POST /api/policies/:id/change-requests
Creates a change request. Requires policies:create. Body: `{ "reason": string, "proposedContent": string, "requestedById": string }`.

### PATCH /api/policies/:id/change-requests/:crid
Updates a change request (e.g. approve/reject). Requires policies:update. Body: `{ "status": string, "reason": string, "proposedContent": string }`.

### GET /api/policies/:id/reviews
Lists scheduled reviews. Requires policies:read.

### POST /api/policies/:id/reviews
Schedules a review. Requires policies:create. Body: `{ "reviewerId": string, "dueDate": string, "notes": string, "status": string }`.

### PATCH /api/policies/:id/reviews/:rid
Updates a review (e.g. complete it). Requires policies:update.

### GET /api/policies/:id/exceptions
Lists exceptions (waivers). Requires policies:read.

### POST /api/policies/:id/exceptions
Creates an exception. Requires policies:create. Body: `{ "reason": string, "grantedById": string, "expiresAt": string }`.

### PATCH /api/policies/:id/exceptions/:eid
Updates an exception (e.g. revoke it). Requires policies:update.
