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
  an optional attached file. The file is stored by a pluggable driver: when
  S3_BUCKET and S3_REGION are set the file goes to S3-compatible storage,
  otherwise it is written to the local UPLOAD_DIR on the server. The stored
  reference is kept in `filePath` as a driver-prefixed key ("local:" or "s3:").
- The source must be one of: documentation, policy, manual, integration,
  automated_check, infrastructure, other.
- Evidence may be linked to a control and/or a policy by id. The API confirms
  the linked record exists. If the linked control or policy is later deleted,
  the link is set to null rather than deleting the evidence.
- Creating evidence accepts an optional multipart file field named "file"
  (capped at MAX_UPLOAD_MB, default 10 MB). When no file is sent the evidence
  is stored as metadata only.
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

Creates evidence. Requires evidence:create. Send as `multipart/form-data`.
The text fields are sent as form fields and the optional file as the `file`
part.

Form fields:
- title (required)
- description (optional)
- source (optional, one of the allowed values)
- content (optional free text)
- collectedAt (optional ISO date)
- controlId (optional)
- policyId (optional)

Response 201 (with an uploaded file, local storage):
```json
{
  "message": "Evidence created",
  "data": {
    "evidence": { "id": "clr...", "title": "DB encryption screenshot", "description": "Proof of encryption", "source": "manual", "content": null, "filePath": "local:uuid-shot.png", "mimeType": "image/png", "collectedAt": "2026-08-20T00:00:00.000Z", "controlId": "clr...", "policyId": null, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z", "control": { "id": "clr...", "title": "MFA for privileged accounts" }, "policy": null }
  }
}
```

Response 400 (unknown linked control):
```json
{ "message": "Linked control not found" }
```

### GET /api/evidence/:id/file

Downloads the attached file for an evidence record. Requires evidence:read.
The response is the raw file bytes with the correct Content-Type header. When
the evidence has no file the response is 404.

Response 200 (file stream):
```
Content-Type: image/png

<binary file data>
```

Response 404:
```json
{ "message": "This evidence has no file attached" }
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
