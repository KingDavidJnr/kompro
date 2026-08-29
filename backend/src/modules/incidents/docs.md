# Incident Management

Tracks security and operational incidents and their response actions. All
routes require authentication and the matching `incident:*` permission; every
mutation is recorded in the audit trail.

## Endpoints

Base path: `/api/incidents`

| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| GET | `/` | `incident:read` | List incidents (filters: `status`, `severity`, `page`, `pageSize`). |
| GET | `/:id` | `incident:read` | Get an incident with its response actions. |
| POST | `/` | `incident:create` | Create an incident. |
| PATCH | `/:id` | `incident:update` | Update an incident. Setting `status: resolved` stamps `resolvedAt`. |
| DELETE | `/:id` | `incident:delete` | Delete an incident and its actions. |
| GET | `/:id/actions` | `incident:read` | List response actions. |
| POST | `/:id/actions` | `incident:create` | Add a response action. |
| PATCH | `/:id/actions/:aid` | `incident:update` | Update an action (setting `status: done` stamps `doneAt`). |
| DELETE | `/:id/actions/:aid` | `incident:delete` | Delete an action. |

## Models

- `Incident` — severity, classification, status, owner, occurred/resolved timestamps, lessons learned.
- `IncidentAction` — response workflow item with owner, due date and completion.
