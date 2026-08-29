# Frameworks and Mappings Module

## Purpose

Manages compliance frameworks and the cross-framework mappings that make
Kompro framework-agnostic. A framework is a collection of requirements. A
mapping links a requirement to one or more organizational controls, so a
single control can satisfy requirements across several frameworks. The
organization's controls and assessments are the source of truth; a framework's
status is derived from the latest assessment of each mapped control.

## How it works

- Frameworks are CRUD-managed at /api/frameworks. They ship seeded (ISO 27001,
  SOC 2, GDPR) but are disabled until an admin enables them.
- Each bundled framework ships with its current, authoritative requirement
  catalog already seeded: ISO/IEC 27001:2022 Annex A (93 controls across the
  organizational, people, physical and technological themes), the AICPA 2017
  Trust Services Criteria (Security Common Criteria CC1-CC9 plus the
  Availability, Confidentiality, Processing Integrity and Privacy criteria) and
  the core GDPR articles. Mappings to your own controls are still added per
  organization via /api/requirements/:id/mappings. Readiness (see
  /api/frameworks/:id/readiness) is therefore measurable as soon as you map
  controls and assess them.
- Requirements belong to a framework and are managed at /api/requirements.
- Mappings connect a requirement to a control. Creating or deleting a mapping
  uses frameworks:update. Mappings are unique per (requirement, control) pair.
- GET /api/frameworks/:id/status derives each requirement's status from the
  latest assessment of its mapped controls, and a framework-level status from
  those results. The aggregation precedence (worst wins) is:
  unsatisfied, then needs_review, then partially_satisfied, then satisfied.
  A requirement with no mapped controls reports "not_mapped".

## API

All responses use the shape `{ "message": string, "data": object }`.

### GET /api/frameworks

Lists frameworks. Optional ?enabled=true|false. Requires frameworks:read.

Response 200:
```json
{
  "message": "Frameworks retrieved",
  "data": {
    "frameworks": [
      { "id": "clr...", "name": "ISO 27001", "description": "Information security management system standard", "enabled": false, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z", "_count": { "requirements": 0 } }
    ]
  }
}
```

### POST /api/frameworks

Creates a framework. Requires frameworks:create.

Request body:
```json
{ "name": "ISO 27001", "description": "ISMS standard", "enabled": false }
```

Response 201: returns the created framework.

### GET /api/frameworks/:id

Returns a framework with its requirements and control mappings. Requires frameworks:read.

Response 200:
```json
{
  "message": "Framework retrieved",
  "data": {
    "framework": {
      "id": "clr...",
      "name": "ISO 27001",
      "description": "ISMS standard",
      "enabled": true,
      "requirements": [
        {
          "id": "clr...",
          "frameworkId": "clr...",
          "code": "A.5.1",
          "title": "Information security policies",
          "description": null,
          "controlMappings": [
            { "requirementId": "clr...", "controlId": "clr...", "notes": null, "control": { "id": "clr...", "title": "MFA for privileged accounts", "status": "implemented" } }
          ]
        }
      ]
    }
  }
}
```

### GET /api/frameworks/:id/status

Derives status from mapped controls' latest assessments. Requires frameworks:read.

Response 200:
```json
{
  "message": "Framework status derived",
  "data": {
    "framework": { "id": "clr...", "name": "ISO 27001", "enabled": true },
    "status": "satisfied",
    "requirements": [
      {
        "requirement": { "id": "clr...", "code": "A.5.1", "title": "Information security policies" },
        "mappedControls": [
          { "id": "clr...", "title": "MFA for privileged accounts", "controlStatus": "implemented", "latestAssessment": "satisfied" }
        ],
        "status": "satisfied"
      }
    ]
  }
}
```

### GET /api/frameworks/:id/readiness

Computes compliance readiness for a framework. Requires frameworks:read. It
returns an overall readiness percentage (fully satisfied requirements divided
by total requirements), a status breakdown, and a list of gaps - the
requirements that are not satisfied - each with its linked controls and their
latest assessment result. A requirement is "satisfied" only when every mapped
control's latest assessment is `satisfied`.

Status values per requirement:

- `satisfied` - all mapped controls assessed and satisfied.
- `partially_satisfied` - at least one mapped control satisfied and at least one
  not (partial, unsatisfied, needs_review or unassessed).
- `unsatisfied` - at least one mapped control is unsatisfied.
- `needs_review` - no unsatisfied control but at least one needs review.
- `unassessed` - mapped controls exist but at least one has no assessment.
- `unmapped` - the requirement has no mapped controls.

Response 200:
```json
{
  "message": "Framework readiness computed",
  "data": {
    "framework": { "id": "clr...", "name": "ISO 27001", "enabled": true },
    "totalRequirements": 4,
    "satisfied": 1,
    "readinessPercent": 25,
    "breakdown": {
      "satisfied": 1,
      "partially_satisfied": 0,
      "unsatisfied": 1,
      "needs_review": 0,
      "unassessed": 1,
      "unmapped": 1
    },
    "gaps": [
      {
        "requirement": { "id": "clr...", "code": "A.2", "title": "Access control", "description": "..." },
        "status": "unsatisfied",
        "controls": [
          { "id": "clr...", "title": "MFA", "latestResult": "unsatisfied", "assessedAt": "2026-08-28T10:00:00.000Z" }
        ]
      }
    ]
  }
}
```

### PATCH /api/frameworks/:id

Updates a framework (name, description, enabled). Requires frameworks:update.

### DELETE /api/frameworks/:id

Deletes a framework (cascades requirements and mappings). Requires frameworks:delete.

Response 200:
```json
{ "message": "Framework deleted", "data": {} }
```

### POST /api/requirements

Creates a requirement under a framework. Requires frameworks:create.

Request body:
```json
{ "frameworkId": "clr...", "code": "A.5.1", "title": "Information security policies", "description": "Documented policies" }
```

Response 201: returns the created requirement.

### PATCH /api/requirements/:id

Updates a requirement (code, title, description). Requires frameworks:update.

### DELETE /api/requirements/:id

Deletes a requirement (cascades its mappings). Requires frameworks:delete.

### POST /api/requirements/:requirementId/mappings

Maps a requirement to a control. Requires frameworks:update.

Request body:
```json
{ "controlId": "clr...", "notes": "Primary control for this requirement" }
```

Response 201: returns the mapping.

### DELETE /api/requirements/:requirementId/mappings/:controlId

Removes a mapping. Requires frameworks:update.

Response 200:
```json
{ "message": "Mapping deleted", "data": {} }
```

### Common errors

- 400 "Framework not found" / "Control not found" when a linked record is missing.
- 404 "Framework not found" / "Requirement not found".
- 409 "Resource already exists" when creating a framework with a duplicate name.
