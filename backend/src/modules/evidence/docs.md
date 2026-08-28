# Evidence Module

## Purpose

Manages evidence: the records that support the state of a control or policy.
Evidence may come from documentation, policies, manual submissions,
integrations, automated checks or infrastructure. It is retained as compliance
history and can be linked to a control and/or a policy. Deleting a linked
control or policy keeps the evidence but clears the link.

## How it works

- Every route requires authentication and an evidence:* permission.
- A piece of evidence has a title, description, source, free text content and
  an optional filePath reference (file upload is handled elsewhere).
- The source must be one of: documentation, policy, manual, integration,
  automated_check, infrastructure, other.
- Evidence may be linked to a control and/or a policy by id. The API confirms
  the linked record exists. If the linked control or policy is later deleted,
  the link is set to null rather than deleting the evidence.
- Listing supports filtering by controlId, policyId and source, plus
  pagination. Evidence is returned newest first.

## API

All responses use the shape `{ "message": string, "data": object }`.

### GET /api/evidence

Lists evidence with optional filtering and pagination. Requires evidence:read.

Query parameters (all optional):
- page (default 1)
- pageSize (default 25, max 100)
- controlId (link filter)
- policyId (link filter)
- source (exact match)

Response 200:
```json
{
  "message": "Evidence retrieved",
  "data": {
    "evidence": [
      { "id": "clr...", "title": "DB encryption screenshot", "description": "Proof of encryption", "source": "manual", "content": null, "filePath": "/files/shot.png", "collectedAt": "2026-08-20T00:00:00.000Z", "controlId": "clr...", "policyId": null, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z", "control": { "id": "clr...", "title": "MFA for privileged accounts" }, "policy": null }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 25
  }
}
```

### GET /api/evidence/:id

Returns one evidence record. Requires evidence:read.

Response 200:
```json
{
  "message": "Evidence retrieved",
  "data": {
    "evidence": { "id": "clr...", "title": "DB encryption screenshot", "description": "Proof of encryption", "source": "manual", "content": null, "filePath": "/files/shot.png", "collectedAt": "2026-08-20T00:00:00.000Z", "controlId": "clr...", "policyId": null, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z", "control": { "id": "clr...", "title": "MFA for privileged accounts" }, "policy": null }
  }
}
```

Response 404:
```json
{ "message": "Evidence not found" }
```

### POST /api/evidence

Creates evidence. Requires evidence:create.

Request body:
```json
{
  "title": "DB encryption screenshot",
  "description": "Proof of encryption",
  "source": "manual",
  "filePath": "/files/shot.png",
  "collectedAt": "2026-08-20T00:00:00.000Z",
  "controlId": "clr...",
  "policyId": null
}
```

Response 201:
```json
{
  "message": "Evidence created",
  "data": {
    "evidence": { "id": "clr...", "title": "DB encryption screenshot", "description": "Proof of encryption", "source": "manual", "content": null, "filePath": "/files/shot.png", "collectedAt": "2026-08-20T00:00:00.000Z", "controlId": "clr...", "policyId": null, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z", "control": { "id": "clr...", "title": "MFA for privileged accounts" }, "policy": null }
  }
}
```

Response 400 (unknown linked control):
```json
{ "message": "Linked control not found" }
```

### PATCH /api/evidence/:id

Updates evidence. Requires evidence:update. All fields optional.

Request body:
```json
{
  "source": "automated_check"
}
```

Response 200:
```json
{
  "message": "Evidence updated",
  "data": {
    "evidence": { "id": "clr...", "title": "DB encryption screenshot", "description": "Proof of encryption", "source": "automated_check", "content": null, "filePath": "/files/shot.png", "collectedAt": "2026-08-20T00:00:00.000Z", "controlId": "clr...", "policyId": null, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z", "control": { "id": "clr...", "title": "MFA for privileged accounts" }, "policy": null }
  }
}
```

### DELETE /api/evidence/:id

Deletes evidence. Requires evidence:delete.

Response 200:
```json
{ "message": "Evidence deleted", "data": {} }
```

Response 404:
```json
{ "message": "Evidence not found" }
```
