# IT Service Management (ITSM)

Manages configuration/asset records, change requests and capacity planning.
All routes require authentication and the matching `itsm:*` permission; every
mutation is recorded in the audit trail.

## Endpoints

Base path: `/api/itsm`

### Assets
| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| GET | `/assets` | `itsm:read` | List assets (`type`, `status` filters). |
| GET | `/assets/:id` | `itsm:read` | Get an asset with its changes. |
| POST | `/assets` | `itsm:create` | Create an asset. |
| PATCH | `/assets/:id` | `itsm:update` | Update an asset. |
| DELETE | `/assets/:id` | `itsm:delete` | Delete an asset. |

### Changes
| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| GET | `/changes` | `itsm:read` | List changes (`status` filter). |
| POST | `/changes` | `itsm:create` | Create a change (optional `assetId`). |
| PATCH | `/changes/:id` | `itsm:update` | Update a change. |
| DELETE | `/changes/:id` | `itsm:delete` | Delete a change. |

### Capacity Plans
| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| GET | `/capacity` | `itsm:read` | List capacity plans. |
| POST | `/capacity` | `itsm:create` | Create a capacity plan. |
| PATCH | `/capacity/:id` | `itsm:update` | Update a capacity plan. |
| DELETE | `/capacity/:id` | `itsm:delete` | Delete a capacity plan. |

## Models

- `Asset` — configuration item (type, owner, location, status, purchase/warranty dates).
- `Change` — change request linked to an asset (`status`: requested/approved/implemented/closed/rejected).
- `CapacityPlan` — resource capacity tracking with current/planned values.
