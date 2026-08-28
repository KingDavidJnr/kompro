# Roles Module

## Purpose

Manages the configurable IAM layer: roles and the permissions attached to
them. Permissions are a fixed set (seeded by the database seed script), while
roles are created and edited by administrators to grant combinations of those
permissions to users.

## How it works

- Permissions are predefined. The seed script creates the initial set such as
  org:read, users:create and roles:update.
- A role connects to one or more permissions by name. When permissions are
  provided on update, the role's permission set is replaced.
- A role cannot be deleted while users are still assigned to it. This prevents
  orphaned users with no usable role.
- All routes require authentication and the matching roles:* permission.

## Default roles

The seed script creates three roles out of the box. They are a starting point:
administrators can rename, edit or delete them and create new ones. Their
intended meaning is:

- **admin** - Full access. Connected to every seeded permission, so it can
  manage users, roles, the organization, controls, policies, evidence,
  assessments, frameworks and audit logs (including purging entries). The
  bootstrap admin account created from environment variables gets this role.
- **auditor** - Read-only compliance and audit access. Granted the read
  permissions for organization, users, roles, audit, controls, policies,
  evidence, assessments and frameworks. An auditor can review the entire
  compliance posture and export the audit log, but cannot change anything.
- **member** - Basic member access. Granted `org:read` only, so a member can
  see the organization's name and settings but has no administrative or
  compliance-editing rights by default.

## API

All responses use the shape `{ "message": string, "data": object }`.

### GET /api/roles

Lists roles with their permissions. Requires roles:read.

Response 200:
```json
{
  "message": "Roles retrieved",
  "data": {
    "roles": [
      {
        "id": "clr...",
        "name": "admin",
        "description": "Full access",
        "permissions": [
          { "id": "clr...", "name": "org:read", "description": "View organization settings" }
        ]
      }
    ]
  }
}
```

### GET /api/roles/permissions

Lists all permission definitions. Requires roles:read.

Response 200:
```json
{
  "message": "Permissions retrieved",
  "data": {
    "permissions": [
      { "id": "clr...", "name": "org:read", "description": "View organization settings" }
    ]
  }
}
```

### GET /api/roles/:id

Returns one role with its permissions. Requires roles:read.

Response 200:
```json
{
  "message": "Role retrieved",
  "data": {
    "role": { "id": "clr...", "name": "auditor", "description": "Read-only access", "permissions": [] }
  }
}
```

Response 404:
```json
{ "message": "Role not found" }
```

### POST /api/roles

Creates a role. Requires roles:create.

Request body:
```json
{
  "name": "reviewer",
  "description": "Can review but not change",
  "permissions": ["org:read", "users:read", "audit:read"]
}
```

Response 201:
```json
{
  "message": "Role created",
  "data": {
    "role": { "id": "clr...", "name": "reviewer", "description": "Can review but not change", "permissions": [] }
  }
}
```

Response 400 (unknown permission):
```json
{ "message": "Unknown permission(s): foo:bar" }
```

### PATCH /api/roles/:id

Updates a role. Requires roles:update. All fields optional. Supplying
permissions replaces the role's permission set.

Request body:
```json
{
  "description": "Updated description",
  "permissions": ["org:read"]
}
```

Response 200:
```json
{
  "message": "Role updated",
  "data": {
    "role": { "id": "clr...", "name": "reviewer", "description": "Updated description", "permissions": [] }
  }
}
```

### DELETE /api/roles/:id

Deletes a role if no user is assigned to it. Requires roles:delete.

Response 200:
```json
{ "message": "Role deleted", "data": {} }
```

Response 400 (role still in use):
```json
{ "message": "Role is assigned to users and cannot be deleted" }
```

Response 404:
```json
{ "message": "Role not found" }
```
