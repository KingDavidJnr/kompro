# Risk Management

Manages the organization's risk register and treatment activities. All routes
require authentication and the matching `risk:*` permission. Every mutation is
recorded in the audit trail.

## Endpoints

Base path: `/api/risks`

| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| GET | `/` | `risk:read` | List risks (filters: `status`, `category`, `page`, `pageSize`). |
| GET | `/:id` | `risk:read` | Get a risk with its scenarios, KRIs and treatments. |
| POST | `/` | `risk:create` | Create a risk. `score` is computed as `likelihood * impact`. |
| PATCH | `/:id` | `risk:update` | Update a risk (recomputes `score` when likelihood/impact change). |
| DELETE | `/:id` | `risk:delete` | Delete a risk and its children. |
| GET | `/:id/scenarios` | `risk:read` | List risk scenarios. |
| POST | `/:id/scenarios` | `risk:create` | Add a risk scenario. |
| DELETE | `/:id/scenarios/:sid` | `risk:delete` | Delete a scenario. |
| GET | `/:id/kris` | `risk:read` | List key risk indicators. |
| POST | `/:id/kris` | `risk:create` | Add a KRI. `status` is auto-set (`ok`/`warning`/`breach`) from `threshold` vs `currentValue`. |
| PATCH | `/:id/kris/:kid` | `risk:update` | Update a KRI (recomputes `status`). |
| DELETE | `/:id/kris/:kid` | `risk:delete` | Delete a KRI. |
| GET | `/:id/treatments` | `risk:read` | List treatment plans. |
| POST | `/:id/treatments` | `risk:create` | Add a treatment plan. |
| PATCH | `/:id/treatments/:tid` | `risk:update` | Update a treatment plan. |
| DELETE | `/:id/treatments/:tid` | `risk:delete` | Delete a treatment plan. |

## Models

- `Risk` — register entry (`likelihood`, `impact`, `score`, `tolerance`, `status`, `owner`).
- `RiskScenario` — scenario-based likelihood/impact with inherent and residual scores.
- `Kri` — measurable indicator with threshold and breach logic.
- `RiskTreatment` — remediation plan (`status`, `owner`, `dueDate`).
