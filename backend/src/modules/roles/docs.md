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
  assessments, frameworks, risk, incidents, ITSM and audit programs, plus the
  audit logs (including purging entries). The bootstrap admin account created
  from environment variables gets this role.
- **auditor** - Read-only compliance and audit access. Granted the read
  permissions for organization, users, roles, audit, controls, policies,
  evidence, assessments, frameworks, risk, incidents, ITSM and audit plans.
  An auditor can review the entire compliance posture and export the audit log,
  but cannot change anything.
- **member** - Basic member access. Granted `org:read` only, so a member can
  see the organization's name and settings but has no administrative or
  compliance-editing rights by default.

## Permissions

Permissions are the fixed building blocks seeded into the database. They follow a
`resource:action` naming scheme. The actions are:

- **read** - View/list the resource and its detail.
- **create** - Create new records of the resource.
- **update** - Modify existing records of the resource.
- **delete** - Remove records of the resource.

The full seeded set:

| Permission | Signifies |
| --- | --- |
| `org:read` | View the organization's name and settings. |
| `org:update` | Change the organization's name and settings. |
| `users:read` | List users and view any user's profile. |
| `users:create` | Create users and send invitations. |
| `users:update` | Update users, change roles, activate/deactivate, and generate reset links. |
| `users:delete` | Delete user accounts. |
| `roles:read` | View roles and their attached permissions. |
| `roles:create` | Create new roles. |
| `roles:update` | Edit roles, including which permissions they grant. |
| `roles:delete` | Delete roles that are not assigned to any user. |
| `audit:read` | View and export the audit log. |
| `audit:purge` | Delete audit log entries older than a given age. |
| `controls:read` | View compliance controls. |
| `controls:create` | Create controls. |
| `controls:update` | Update controls. |
| `controls:delete` | Delete controls. |
| `policies:read` | View policies. |
| `policies:create` | Create policies. |
| `policies:update` | Update policies, including publishing. |
| `policies:delete` | Delete policies. |
| `evidence:read` | View evidence and its status. |
| `evidence:create` | Upload/create evidence. |
| `evidence:update` | Update evidence, including accepting or rejecting it. |
| `evidence:delete` | Delete evidence. |
| `evidence:collect` | Configure and trigger automated evidence collectors. |
| `assessments:read` | View assessments and their results. |
| `assessments:create` | Create assessments. |
| `assessments:update` | Update assessments, assign assessors and record results. |
| `assessments:delete` | Delete assessments. |
| `frameworks:read` | View frameworks, their requirements and control mappings. |
| `frameworks:create` | Create frameworks and requirements. |
| `frameworks:update` | Update frameworks, requirements and mappings. |
| `frameworks:delete` | Delete frameworks and requirements. |
| `risk:read` | View the risk register, scenarios, KRIs and treatments. |
| `risk:create` | Create risk entries, scenarios, KRIs and treatments. |
| `risk:update` | Update risk entries, scenarios, KRIs and treatments. |
| `risk:delete` | Delete risk entries, scenarios, KRIs and treatments. |
| `incident:read` | View incidents and their response actions. |
| `incident:create` | Create incidents and response actions. |
| `incident:update` | Update incidents and response actions. |
| `incident:delete` | Delete incidents and response actions. |
| `itsm:read` | View IT assets, changes and capacity plans. |
| `itsm:create` | Create IT assets, changes and capacity plans. |
| `itsm:update` | Update IT assets, changes and capacity plans. |
| `itsm:delete` | Delete IT assets, changes and capacity plans. |
| `auditplan:read` | View audit plans, nonconformities and corrective actions. |
| `auditplan:create` | Create audit plans, nonconformities and corrective actions. |
| `auditplan:update` | Update audit plans, nonconformities and corrective actions. |
| `auditplan:delete` | Delete audit plans, nonconformities and corrective actions. |

New permissions should be added to the `PERMISSIONS` array in
`prisma/seed.js`; the seed connects them to the `admin` role automatically.

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
