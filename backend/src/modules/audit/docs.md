# Audit Module

## Purpose

The audit module records every change made to the system so administrators can
review who did what and when. Each mutating API action (create, update, delete)
across users, roles, controls, policies, evidence, assessments, frameworks,
requirements, mappings and organization settings writes an audit entry. The
entry captures the actor, the action, the affected entity, and the before and
after state.

Audit records are append only. They are never updated or deleted through the
API. This gives a tamper evident history of configuration changes.

## How It Works

When a controller performs a mutation it calls
`auditService.recordFromRequest(req, { action, entity, entityId, before, after })`.
The service reads the authenticated user from `req.user` to set the actor, reads
the source IP from `req.ip`, and stores a redacted copy of the request. Only
public user fields are stored. The full request body and headers are not
persisted.

The `before` and `after` fields are the entity state as returned by the service
layer. For creates `before` is `null`. For deletes `after` is `null`. The stored
JSON is large enough for normal records but very large payloads are truncated to
protect the column.

Audit entries are written best effort. If auditing fails the error is logged via
`console.error` but the original mutation result is still returned to the client.
This prevents the audit system from blocking normal operations.

## API

All routes require the `audit:read` permission.

### List audit entries

`GET /api/audit`

Query parameters (all optional):

- `page` - Page number, starts at 1. Default 1.
- `pageSize` - Items per page, max 100. Default 20.
- `entity` - Filter by entity type, for example `user` or `control`.
- `entityId` - Filter by a specific entity id.
- `actorId` - Filter by the user who performed the action.
- `action` - Filter by action, for example `create`, `update`, `delete`.
- `from` - ISO date, only entries on or after this time.
- `to` - ISO date, only entries on or before this time.

Sample request:

```
GET /api/audit?entity=user&action=update&page=1&pageSize=20
```

Sample response:

```json
{
  "message": "Audit entries retrieved",
  "data": {
    "entries": [
      {
        "id": "clx001audit0000000001",
        "action": "update",
        "entity": "user",
        "entityId": "clx001user0000000001",
        "actorId": "clx001user0000000000",
        "actor": { "id": "clx001user0000000000", "email": "admin@example.com", "name": "Admin" },
        "before": { "active": true },
        "after": { "active": false },
        "ip": "127.0.0.1",
        "createdAt": "2026-08-28T10:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

### Get a single audit entry

`GET /api/audit/:id`

Sample response:

```json
{
  "message": "Audit entry retrieved",
  "data": {
    "entry": {
      "id": "clx001audit0000000001",
      "action": "update",
      "entity": "user",
      "entityId": "clx001user0000000001",
      "actorId": "clx001user0000000000",
      "actor": { "id": "clx001user0000000000", "email": "admin@example.com", "name": "Admin" },
      "before": { "active": true },
      "after": { "active": false },
      "ip": "127.0.0.1",
      "createdAt": "2026-08-28T10:00:00.000Z"
    }
  }
}
```

## Notes

- Audit entries are read only. There is no create, update or delete endpoint.
- Deleting or disabling a user does not remove their existing audit entries. The
  actor snapshot is stored inline so history remains readable.
- The `actor` field may be `null` for entries created by system actions that
  have no authenticated user.
- Action names follow the entity domain. For users the actions are `create`
  (self registration), `invite` (admin invited or resent an invite) and `remove`
  (account deleted). Other entities use `create`, `update` and `delete`.
