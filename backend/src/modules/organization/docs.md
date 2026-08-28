# Organization Module

## Purpose

Manages the single organization record for a self-hosted Kompro deployment.
Because each deployment serves one organization, there is exactly one
Organization row. Editing it at runtime avoids changing environment variables
and redeploying.

## How it works

- GET /api/org/settings returns the first Organization row ordered by
  creation time.
- PATCH /api/org/settings creates the row if missing, otherwise updates the
  provided fields (name, displayName, settings). The settings field is a JSON
  value for deployment-specific configuration such as the auth mode.

## API

All responses use the shape `{ "message": string, "data": object }`.

### GET /api/org/settings

Returns the organization settings. Requires authentication.

Responses:

- 200 OK
```json
{
  "message": "Organization settings retrieved",
  "data": {
    "organization": {
      "id": "clr...",
      "name": "My Organization",
      "displayName": "Acme Compliance",
      "settings": { "authMode": "all" },
      "createdAt": "2026-08-28T00:00:00.000Z",
      "updatedAt": "2026-08-28T00:00:00.000Z"
    }
  }
}
```

- 401 Unauthorized
```json
{ "message": "Unauthorized" }
```

- 404 Not found
```json
{ "message": "Organization not configured" }
```

### PATCH /api/org/settings

Updates the organization. Requires authentication and the "org:update"
permission.

Request body (all fields optional):
```json
{
  "name": "Acme Corp",
  "displayName": "Acme Compliance",
  "settings": { "authMode": "all" }
}
```

Responses:

- 200 OK
```json
{
  "message": "Organization settings updated",
  "data": {
    "organization": {
      "id": "clr...",
      "name": "Acme Corp",
      "displayName": "Acme Compliance",
      "settings": { "authMode": "all" },
      "createdAt": "2026-08-28T00:00:00.000Z",
      "updatedAt": "2026-08-28T00:00:00.000Z"
    }
  }
}
```

- 401 Unauthorized
```json
{ "message": "Unauthorized" }
```

- 403 Forbidden
```json
{ "message": "Forbidden" }
```
