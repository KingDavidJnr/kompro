# Evidence Module

## Purpose

Manages evidence: the records that support the state of a control or policy.
Evidence may come from documentation, policies, manual submissions,
integrations, automated checks or infrastructure. It is retained as compliance
history and can be linked to a control and/or a policy. Deleting a linked
control or policy keeps the evidence but clears the link.

## How it works

- Every route requires authentication and an evidence:* permission.
- A piece of evidence has a title, description, source, free text content and
  an optional attached file. The file is stored by a pluggable driver: when
  S3_BUCKET and S3_REGION are set the file goes to S3-compatible storage,
  otherwise it is written to the local UPLOAD_DIR on the server. The stored
  reference is kept in `filePath` as a driver-prefixed key ("local:" or "s3:").
- The source must be one of: documentation, policy, manual, integration,
  automated_check, infrastructure, other.
- Evidence may be linked to a control and/or a policy by id. The API confirms
  the linked record exists. If the linked control or policy is later deleted,
  the link is set to null rather than deleting the evidence.
- Creating evidence accepts an optional multipart file field named "file"
  (capped at MAX_UPLOAD_MB, default 10 MB). When no file is sent the evidence
  is stored as metadata only.
- Listing supports filtering by controlId, policyId and source, plus
  pagination. Evidence is returned newest first.
- Every evidence record has a `status` of `submitted` (the default when a user
  uploads), `accepted` or `rejected`. The uploader is recorded in
  `uploadedById`. When an admin sets the status to `accepted` or `rejected`, the
  uploader is emailed via `notifyEvidenceStatus`.

## Notifications

- `POST /api/evidence/request` lets an admin request evidence from a specific
  user. It creates a `status: "requested"` placeholder (owned by the requested
  user) and emails that user. The recipient then uploads the real file.

## API

All responses use the shape `{ "message": string, "data": object }`.

### GET /api/evidence

Lists evidence with optional filtering and pagination. Requires evidence:read.

Query parameters (all optional):
- page (default 1)
- pageSize (default 25, max 100)
- controlId (link filter)
- policyId (link filter)
- source (exact match)

Response 200:
```json
{
  "message": "Evidence retrieved",
  "data": {
    "evidence": [
      { "id": "clr...", "title": "DB encryption screenshot", "description": "Proof of encryption", "source": "manual", "content": null, "filePath": "/files/shot.png", "collectedAt": "2026-08-20T00:00:00.000Z", "controlId": "clr...", "policyId": null, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z", "control": { "id": "clr...", "title": "MFA for privileged accounts" }, "policy": null }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 25
  }
}
```

### GET /api/evidence/:id

Returns one evidence record. Requires evidence:read.

Response 200:
```json
{
  "message": "Evidence retrieved",
  "data": {
    "evidence": { "id": "clr...", "title": "DB encryption screenshot", "description": "Proof of encryption", "source": "manual", "content": null, "filePath": "/files/shot.png", "collectedAt": "2026-08-20T00:00:00.000Z", "controlId": "clr...", "policyId": null, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z", "control": { "id": "clr...", "title": "MFA for privileged accounts" }, "policy": null }
  }
}
```

Response 404:
```json
{ "message": "Evidence not found" }
```

### POST /api/evidence

Creates evidence. Requires evidence:create. Send as `multipart/form-data`.
The text fields are sent as form fields and the optional file as the `file`
part.

Form fields:
- title (required)
- description (optional)
- source (optional, one of the allowed values)
- content (optional free text)
- collectedAt (optional ISO date)
- controlId (optional)
- policyId (optional)

Response 201 (with an uploaded file, local storage):
```json
{
  "message": "Evidence created",
  "data": {
    "evidence": { "id": "clr...", "title": "DB encryption screenshot", "description": "Proof of encryption", "source": "manual", "content": null, "filePath": "local:uuid-shot.png", "mimeType": "image/png", "collectedAt": "2026-08-20T00:00:00.000Z", "controlId": "clr...", "policyId": null, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z", "control": { "id": "clr...", "title": "MFA for privileged accounts" }, "policy": null }
  }
}
```

Response 400 (unknown linked control):
```json
{ "message": "Linked control not found" }
```

### GET /api/evidence/:id/file

Downloads the attached file for an evidence record. Requires evidence:read.
The response is the raw file bytes with the correct Content-Type header. When
the evidence has no file the response is 404.

Response 200 (file stream):
```
Content-Type: image/png

<binary file data>
```

Response 404:
```json
{ "message": "This evidence has no file attached" }
```

### POST /api/evidence/request

Requests evidence from a user. Requires evidence:create. The requesting admin
supplies a title (and optional description/source) plus the
`requestedFromUserId`. Kompro creates a `status: "requested"` evidence record
owned by that user and emails them a request to upload it.

Request body:
```json
{
  "title": "Please provide the firewall configuration export",
  "requestedFromUserId": "clr..."
}
```

Response 201:
```json
{
  "message": "Evidence requested",
  "data": {
    "evidence": { "id": "clr...", "title": "Please provide the firewall configuration export", "status": "requested", "source": "request", "uploadedById": "clr...", "controlId": null, "policyId": null }
  }
}
```

Response 404 (unknown recipient):
```json
{ "message": "Recipient not found" }
```

### PATCH /api/evidence/:id

Updates evidence. Requires evidence:update. All fields optional.

Request body:
```json
{
  "source": "automated_check",
  "status": "accepted"
}
```

Setting `status` to `accepted` or `rejected` emails the uploader
(`notifyEvidenceStatus`).

Response 200:
```json
{
  "message": "Evidence updated",
  "data": {
    "evidence": { "id": "clr...", "title": "DB encryption screenshot", "description": "Proof of encryption", "source": "automated_check", "content": null, "filePath": "/files/shot.png", "collectedAt": "2026-08-20T00:00:00.000Z", "controlId": "clr...", "policyId": null, "createdAt": "2026-08-28T00:00:00.000Z", "updatedAt": "2026-08-28T00:00:00.000Z", "control": { "id": "clr...", "title": "MFA for privileged accounts" }, "policy": null }
  }
}
```

### DELETE /api/evidence/:id

Deletes evidence. Requires evidence:delete.

Response 200:
```json
{ "message": "Evidence deleted", "data": {} }
```

Response 404:
```json
{ "message": "Evidence not found" }
```

## Automated evidence collectors

Kompro can collect evidence automatically instead of waiting for a manual
upload. A collector is a configuration (`CollectorConfig`) that names a
connector `type`, a `cadenceMinutes` recurrence, and `params` (plus encrypted
`secrets` for connectors that need credentials). An in-process runner started
with the server evaluates enabled collectors whose `nextRunAt` is due and
ingests their output.

- All collector routes require `evidence:collect` (admin).
- Each run is recorded in the audit trail (`action: "collect"`,
  `entity: "evidence"`) with the number of items added and its status, so
  collection is fully attributable. On failure the error is recorded and the
  admins are emailed via the existing notification service.
- Collected evidence is written with `source: "automated_check"` and
  `collectedAt` set to the run time. Connectors map their output to a `controlId`
  / `policyId` when identifiers are present.

### Connector types

- **sql** - Runs a read-only query against Kompro's own PostgreSQL database
  (the existing Prisma connection, so it needs no external credentials) and
  turns each row into an evidence item. `params`:
  - `sql` (required) - the query text.
  - `titleColumn` (default `title`) - column used for the evidence title.
  - `descriptionColumn` (default `description`).
  - `controlIdColumn` / `policyIdColumn` - column(s) whose values are a Control
    / Policy id to link (optional).
  - `defaultTitle` - fallback title when the title column is null.
  - `includeRowJson` - store the full row as the evidence content.

- **file** - Reads files already on the server's filesystem (e.g. reports
  dropped into a folder by an external job) and turns each into an evidence
  item. Needs no secrets. `params`:
  - `path` (required) - directory or single file path.
  - `pattern` (default `*`) - glob filter in directory mode.
  - `titleFrom` - `filename` (default) or `content` (first line).
  - `description`, `maxBytes` (default 100000), `controlId`, `policyId`.

- **http** - The generic REST collector. One connector covers virtually every
  integration (GitHub, GitLab, Okta/Entra, AWS, Azure, GCP, Jira, ServiceNow,
  Snyk, SonarQube, KnowBe4, SecurityScorecard, Datadog, Cloudflare, Kubernetes,
  backup, and any other API). An integration is just a configuration, not new
  code. `params`:
  - `method` (default `GET`), `url` (supports `{{secret.*}}`/`{{param.*}}`).
  - `headers` (values support interpolation).
  - `body` (optional, for POST/PUT).
  - `auth` - one of:
    - `{ type: 'apiKey', header?, prefix?, value: '{{secret.token}}' }`
    - `{ type: 'bearer', value: '{{secret.token}}', prefix? }`
    - `{ type: 'oauth2', tokenUrl, clientId, clientSecret, scope? }` (adds `Bearer`)
    - `{ type: 'aws', service, region, accessKeyId, secretAccessKey }` (SigV4)
  - `itemsPath` - dot-path to the response array (omit for a single object).
  - `mapping` - dot-paths (or literal `{{...}}`) for `title`, `description`,
    `content`, `controlId`, `policyId`, `id`.
  - `defaultTitle` - fallback title.

  Secrets live in the encrypted `secrets` column of the CollectorConfig row and
  are interpolated via `{{secret.KEY}}` - never stored in environment
  variables. `{{param.KEY}}` interpolates from `params`.

### Example collector configurations

These are pasted into `params` (and `secrets`) when creating a collector. They
demonstrate that "all" integrations are configuration of the `http` collector.

**GitHub - passing Actions runs (apiKey)**
```json
{
  "params": {
    "method": "GET",
    "url": "https://api.github.com/repos/{{param.owner}}/{{param.repo}}/actions/runs?per_page=50",
    "headers": { "Accept": "application/vnd.github+json" },
    "auth": { "type": "apiKey", "header": "Authorization", "prefix": "Bearer ", "value": "{{secret.githubToken}}" },
    "itemsPath": "workflow_runs",
    "mapping": { "title": "name", "description": "head_commit.message", "id": "id" }
  },
  "secrets": { "githubToken": "<from 1Password>" }
}
```

**GitLab - pipeline security gate (bearer)**
```json
{
  "params": {
    "method": "GET",
    "url": "https://gitlab.com/api/v4/projects/{{param.projectId}}/pipelines?status=success&per_page=50",
    "auth": { "type": "bearer", "value": "{{secret.gitlabToken}}" },
    "itemsPath": "pipelines",
    "mapping": { "title": "id", "description": "ref" }
  }
}
```

**Okta / Entra ID - MFA coverage (oauth2)**
```json
{
  "params": {
    "method": "GET",
    "url": "https://{{param.subdomain}}.okta.com/api/v1/users?limit=50",
    "auth": {
      "type": "oauth2",
      "tokenUrl": "https://{{param.subdomain}}.okta.com/oauth2/v1/token",
      "clientId": "{{secret.clientId}}",
      "clientSecret": "{{secret.clientSecret}}",
      "scope": "okta.users.read"
    },
    "itemsPath": "users",
    "mapping": { "title": "profile.email", "description": "profile.login" }
  }
}
```

**AWS - Config / Security Hub findings (SigV4)**
```json
{
  "params": {
    "method": "POST",
    "url": "https://securityhub.us-east-1.amazonaws.com/accounts/{{param.accountId}}/findings",
    "auth": {
      "type": "aws",
      "service": "securityhub",
      "region": "us-east-1",
      "accessKeyId": "{{secret.accessKeyId}}",
      "secretAccessKey": "{{secret.secretAccessKey}}"
    },
    "itemsPath": "findings",
    "mapping": { "title": "Title", "description": "Description", "id": "Id" }
  }
}
```

**Azure / Microsoft Graph - secure score (oauth2)**
```json
{
  "params": {
    "method": "GET",
    "url": "https://graph.microsoft.com/v1.0/security/secureScores",
    "auth": {
      "type": "oauth2",
      "tokenUrl": "https://login.microsoftonline.com/{{param.tenantId}}/oauth2/v2.0/token",
      "clientId": "{{secret.clientId}}",
      "clientSecret": "{{secret.clientSecret}}",
      "scope": "https://graph.microsoft.com/.default"
    },
    "itemsPath": "value",
    "mapping": { "title": "name", "description": "description" }
  }
}
```

**Jira / ServiceNow - closed security tickets (apiKey / bearer)**
```json
{
  "params": {
    "method": "GET",
    "url": "https://{{param.site}}.atlassian.net/rest/api/3/search?jql=project={{param.project}}%20AND%20type=Security",
    "auth": { "type": "apiKey", "header": "Authorization", "prefix": "Basic ", "value": "{{secret.jiraBasic}}" },
    "itemsPath": "issues",
    "mapping": { "title": "key", "description": "fields.summary" }
  }
}
```

**Snyk / SonarQube / Trivy - vulnerability counts (bearer)**
```json
{
  "params": {
    "method": "GET",
    "url": "https://{{param.host}}/api/projects/{{param.project}}/issues?types=VULNERABILITY&statuses=OPEN",
    "auth": { "type": "bearer", "value": "{{secret.sonarToken}}" },
    "itemsPath": "issues",
    "mapping": { "title": "message", "description": "rule" }
  }
}
```

**KnowBe4 / Mimecast / M365 - phishing training (apiKey)**
```json
{
  "params": {
    "method": "GET",
    "url": "https://us.api.knowbe4.com/v1/recipients?per_page=50",
    "headers": { "Authorization": "Bearer {{secret.kb4Token}}" },
    "itemsPath": "data",
    "mapping": { "title": "email", "description": "training_enrollment_status" }
  }
}
```

**SecurityScorecard / UpGuard / BitSight - vendor risk (bearer)**
```json
{
  "params": {
    "method": "GET",
    "url": "https://api.securityscorecard.io/ratings/{{param.domain}}/history",
    "auth": { "type": "bearer", "value": "{{secret.sscToken}}" },
    "itemsPath": "entries",
    "mapping": { "title": "date", "description": "score" }
  }
}
```

**Datadog / Splunk / Elastic - uptime & alerts (apiKey)**
```json
{
  "params": {
    "method": "GET",
    "url": "https://api.datadoghq.com/api/v1/monitor",
    "headers": { "DD-API-KEY": "{{secret.ddKey}}", "DD-APPLICATION-KEY": "{{secret.ddApp}}" },
    "itemsPath": "monitors",
    "mapping": { "title": "name", "description": "overall_state" }
  }
}
```

**Cloudflare - WAF / TLS config (bearer)**
```json
{
  "params": {
    "method": "GET",
    "url": "https://api.cloudflare.com/client/v4/zones/{{param.zoneId}}/settings",
    "auth": { "type": "bearer", "value": "{{secret.cfToken}}" },
    "itemsPath": "result",
    "mapping": { "title": "id", "description": "value" }
  }
}
```

**Kubernetes / Terraform - config drift (bearer / file)**
```json
{
  "params": {
    "method": "GET",
    "url": "https://{{param.cluster}}/apis/policy/v1beta1/podsecuritypolicies",
    "auth": { "type": "bearer", "value": "{{secret.k8sToken}}" },
    "itemsPath": "items",
    "mapping": { "title": "metadata.name" }
  }
}
```

**Veeam / backup - last successful backup (file or http)**
```json
{
  "params": {
    "path": "/var/compliance/backups/",
    "pattern": "*.json",
    "titleFrom": "filename"
  }
}
```

### GET /api/evidence/collectors

Lists all collector configurations with their last-run status. Requires
evidence:collect.

Response 200:
```json
{
  "message": "Collectors retrieved",
  "data": {
    "collectors": [
      { "id": "clr...", "name": "Stale controls", "type": "sql", "enabled": true, "cadenceMinutes": 360, "lastRunAt": "2026-08-29T00:00:00.000Z", "lastStatus": "success", "nextRunAt": "2026-08-29T12:00:00.000Z" }
    ]
  }
}
```

### POST /api/evidence/collectors

Creates a collector. Requires evidence:collect.

Request body:
```json
{
  "name": "Stale controls",
  "type": "sql",
  "enabled": true,
  "cadenceMinutes": 360,
  "params": { "sql": "SELECT id, title FROM \"Control\" WHERE \"updatedAt\" < now() - interval '90 days'", "titleColumn": "title", "controlIdColumn": "id", "defaultTitle": "Stale control" }
}
```

Response 201:
```json
{ "message": "Collector created", "data": { "collector": { "id": "clr...", "name": "Stale controls", "type": "sql", "enabled": true } } }
```

### POST /api/evidence/collectors/:id/run

Triggers an immediate run of a collector. Requires evidence:collect.

Response 200:
```json
{ "message": "Collector run complete", "data": { "status": "success", "added": 3 } }
```

