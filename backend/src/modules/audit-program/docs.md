# Audit Program

Manages internal/external audit plans, the nonconformities found during audits,
and the corrective actions used to close them. This is distinct from the
immutable `AuditLog` trail. All routes require authentication and the matching
`auditplan:*` permission; every mutation is recorded in the audit trail.

## Endpoints

Base path: `/api/audit-program`

| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| GET | `/` | `auditplan:read` | List audit plans (`status` filter). |
| GET | `/:id` | `auditplan:read` | Get a plan with its nonconformities and actions. |
| POST | `/` | `auditplan:create` | Create an audit plan. |
| PATCH | `/:id` | `auditplan:update` | Update an audit plan. |
| DELETE | `/:id` | `auditplan:delete` | Delete an audit plan. |
| POST | `/:id/nonconformities` | `auditplan:create` | Add a nonconformity. |
| PATCH | `/:id/nonconformities/:nid` | `auditplan:update` | Update a nonconformity. |
| DELETE | `/:id/nonconformities/:nid` | `auditplan:delete` | Delete a nonconformity. |
| POST | `/:id/nonconformities/:nid/corrective-actions` | `auditplan:create` | Add a corrective action. |
| PATCH | `/:id/nonconformities/:nid/corrective-actions/:cid` | `auditplan:update` | Update a corrective action. |
| DELETE | `/:id/nonconformities/:nid/corrective-actions/:cid` | `auditplan:delete` | Delete a corrective action. |

## Models

- `AuditPlan` — audit scope and status (`planned`/`in_progress`/`complete`).
- `Nonconformity` — finding (`severity`, `status`).
- `CorrectiveAction` — remediation item owned by a user with a due date.
