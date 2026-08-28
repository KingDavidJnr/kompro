# Assessments Module

## Purpose

Evaluates controls and their supporting evidence. An assessment records the
organization's judgement of a control: satisfied, partially_satisfied,
unsatisfied or needs_review. Results are traceable to the control and to the
specific evidence records that support them.

## How it works

- Every route requires authentication and an assessments:* permission.
- An assessment is tied to exactly one control (controlId). The authenticated
  user is recorded as the assessor by default; this can be overridden by
  supplying assessorId.
- Evidence is linked through the AssessmentEvidence join table, so an
  assessment can reference several pieces of evidence. Supplying evidenceIds
  on create or update replaces the full set of links.
- Deleting a control cascades to its assessments. Deleting evidence cascades
  to its assessment links but keeps the assessment. Deleting a user (assessor)
  clears the assessor link only.
- Listing supports filtering by controlId and result, plus pagination. Results
  are newest first and include an evidence link count.

## API

All responses use the shape `{ "message": string, "data": object }`.

### GET /api/assessments

Lists assessments with optional filtering and pagination. Requires assessments:read.

Query parameters (all optional):
- page (default 1)
- pageSize (default 25, max 100)
- controlId (link filter)
- result (one of the allowed values)

Response 200:
```json
{
  "message": "Assessments retrieved",
  "data": {
    "assessments": [
      {
        "id": "clr...",
        "controlId": "clr...",
        "result": "satisfied",
        "notes": "Verified with screenshot",
        "assessorId": "clr...",
        "assessmentDate": "2026-08-28T00:00:00.000Z",
        "createdAt": "2026-08-28T00:00:00.000Z",
        "updatedAt": "2026-08-28T00:00:00.000Z",
        "control": { "id": "clr...", "title": "MFA for privileged accounts" },
        "assessor": { "id": "clr...", "name": "Admin", "email": "admin@org.com" },
        "_count": { "evidenceLinks": 1 }
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 25
  }
}
```

### GET /api/assessments/:id

Returns one assessment with control, assessor and linked evidence. Requires assessments:read.

Response 200:
```json
{
  "message": "Assessment retrieved",
  "data": {
    "assessment": {
      "id": "clr...",
      "controlId": "clr...",
      "result": "satisfied",
      "notes": "Verified with screenshot",
      "assessorId": "clr...",
      "assessmentDate": "2026-08-28T00:00:00.000Z",
      "createdAt": "2026-08-28T00:00:00.000Z",
      "updatedAt": "2026-08-28T00:00:00.000Z",
      "control": { "id": "clr...", "title": "MFA for privileged accounts" },
      "assessor": { "id": "clr...", "name": "Admin", "email": "admin@org.com" },
      "evidenceLinks": [
        { "assessmentId": "clr...", "evidenceId": "clr...", "evidence": { "id": "clr...", "title": "DB encryption screenshot", "source": "manual" } }
      ]
    }
  }
}
```

Response 404:
```json
{ "message": "Assessment not found" }
```

### POST /api/assessments

Creates an assessment. Requires assessments:create.

Request body:
```json
{
  "controlId": "clr...",
  "result": "satisfied",
  "notes": "Verified with screenshot",
  "evidenceIds": ["clr..."],
  "assessmentDate": "2026-08-28T00:00:00.000Z"
}
```

Response 201:
```json
{
  "message": "Assessment created",
  "data": {
    "assessment": {
      "id": "clr...",
      "controlId": "clr...",
      "result": "satisfied",
      "notes": "Verified with screenshot",
      "assessorId": "clr...",
      "assessmentDate": "2026-08-28T00:00:00.000Z",
      "createdAt": "2026-08-28T00:00:00.000Z",
      "updatedAt": "2026-08-28T00:00:00.000Z",
      "control": { "id": "clr...", "title": "MFA for privileged accounts" },
      "assessor": { "id": "clr...", "name": "Admin", "email": "admin@org.com" },
      "evidenceLinks": [
        { "assessmentId": "clr...", "evidenceId": "clr...", "evidence": { "id": "clr...", "title": "DB encryption screenshot", "source": "manual" } }
      ]
    }
  }
}
```

Response 400 (invalid result):
```json
{ "message": "Invalid result. Allowed: satisfied, partially_satisfied, unsatisfied, needs_review" }
```

### PATCH /api/assessments/:id

Updates an assessment. Requires assessments:update. All fields optional.

Request body:
```json
{
  "result": "needs_review",
  "evidenceIds": []
}
```

Response 200: returns the updated assessment in the same shape as GET.

### DELETE /api/assessments/:id

Deletes an assessment. Requires assessments:delete.

Response 200:
```json
{ "message": "Assessment deleted", "data": {} }
```

Response 404:
```json
{ "message": "Assessment not found" }
```
