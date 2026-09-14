# Kompro Product Guide

Kompro is an open-source compliance, governance, risk, and control (GRC) platform. It helps organizations manage security frameworks, track controls, collect evidence, run assessments, handle risks and incidents, and maintain a full audit trail of all activities.

This guide covers every feature in the product, how they relate to each other, and how to configure the system from end to end.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Compliance](#3-compliance)
   - [Frameworks](#31-frameworks)
   - [Controls](#32-controls)
   - [Policies](#33-policies)
   - [Evidence](#34-evidence)
   - [Assessments](#35-assessments)
4. [GRC](#4-grc)
   - [Risk Management](#41-risk-management)
   - [Incidents](#42-incidents)
   - [ITSM (IT Service Management)](#43-itsm-it-service-management)
5. [Integrations (Automated Evidence Collection)](#5-integrations-automated-evidence-collection)
   - [SQL Collectors](#51-sql-collectors)
   - [HTTP/REST Collectors](#52-httprest-collectors)
   - [File Collectors](#53-file-collectors)
   - [Scheduling and Runs](#54-scheduling-and-runs)
6. [Audit Program](#6-audit-program)
7. [Audit Logs](#7-audit-logs)
8. [Organization Settings](#8-organization-settings)
9. [Trust Portal](#9-trust-portal)
10. [General UI Behavior](#10-general-ui-behavior)
11. [User Management](#11-user-management)
12. [Roles and Permissions](#12-roles-and-permissions)
13. [Authentication](#13-authentication)
14. [How Everything Connects](#14-how-everything-connects)
15. [Environment Configuration](#15-environment-configuration)

---

## 1. Getting Started

When you first set up Kompro, the system creates a single organization and seeds three default roles: **admin**, **auditor**, and **member**. The first user to register is automatically assigned the admin role.

The recommended setup order is:

1. Register your admin account
2. Configure organization settings (name, display name)
3. Seed the framework catalog (ISO 27001, SOC 2, GDPR)
4. Define your controls
5. Map controls to framework requirements
6. Attach evidence to controls
7. Run assessments against controls
8. Set up automated evidence collectors (integrations)
9. Invite team members and assign roles

---

## 2. Dashboard

The dashboard is the landing page and provides a real-time snapshot of your compliance program.

### Readiness Score

The central metric is a **compliance readiness score** from 0 to 100, computed from four equally weighted components (25% each):

| Component | What It Measures |
|-----------|-----------------|
| Framework adoption | Percentage of frameworks that are enabled |
| Control implementation | Percentage of controls with status "implemented" |
| Evidence coverage | Percentage of controls that have at least one linked evidence record |
| Assessment pass rate | Percentage of assessments with result "satisfied" |

Each component is displayed as a progress bar alongside the overall score.

Score color thresholds:
- 75 or above: green
- 50 to 74: amber
- Below 50: red

### Stat Cards

Six summary cards link to their respective pages:

- Frameworks (total count)
- Controls (total count)
- Policies (total count)
- Evidence (total count)
- Open risks (total count)
- Incidents (total count)

### Recent Activity

Displays the last 6 audit log entries showing what action was taken, on which entity, by whom, and when. Links to the full audit log page.

### Program Health

Three mini progress bars showing:
- Evidence collected
- Controls defined
- Open incidents

---

## 3. Compliance

The compliance section contains the core modules for managing your security and compliance posture.

### 3.1 Frameworks

Frameworks represent compliance standards (like ISO 27001, SOC 2, or GDPR) that your organization needs to adhere to. Each framework contains a set of requirements, and those requirements are mapped to your organization's controls.

#### Creating a Framework

Click **New framework** and fill in:

| Field | Required | Description |
|-------|----------|-------------|
| Name | Yes | Must be unique across your organization |
| Description | No | What this framework covers |
| Version | No | Version identifier (e.g., "2.0", "2022") |

After creation, the framework appears in the list with an **Enabled** toggle. Enable a framework to include it in your readiness calculations.

#### Seeding the Catalog

Click **Seed catalog** to load the three built-in framework catalogs with all their requirements:

- **ISO 27001:2022** with 93 Annex A controls (A.5.1 through A.8.34), organized across Organizational, People, Physical, and Technological themes
- **SOC 2** with 27 Trust Services Criteria (CC1 through CC9, A1, C1, PI1, P1 through P8), covering Security, Availability, Confidentiality, Processing Integrity, and Privacy
- **GDPR** with 39 articles (Art.5 through Art.49), covering Principles, Transparency, Rights, Controller/Processor obligations, Security, DPO, and International Transfers

Seeding is idempotent. Running it again will only add missing requirements; it will not overwrite or duplicate existing ones.

#### Managing Requirements

Click the **Requirements** button on any framework to view, add, or delete its requirements.

Each requirement has:

| Field | Required | Description |
|-------|----------|-------------|
| Code | No | Identifier like "A.5.1" or "CC1" |
| Title | Yes | Short name of the requirement |
| Description | No | Full text of the requirement |

#### Mapping Controls to Requirements

On the framework detail page, each requirement has a **Map control** button. Click it to open a searchable control picker and select a control to link. The control appears immediately without a page refresh. Click the X next to any mapped control to remove the mapping.

- One control can satisfy requirements across multiple frameworks
- One requirement can be satisfied by multiple controls
- Mappings can include optional notes explaining how the control satisfies the requirement

#### Filtering and Searching Requirements

The requirements list on the framework detail page supports client-side filtering with no extra API calls:

- **Search box** in the requirements section header -- searches requirement code, title, and description instantly as you type
- **Status filter** -- click any segment on the breakdown bar or any legend item to filter requirements to that status only. Click again to clear. An active filter highlights the selected status and shows a "Clear filter" link.

When a filter is active, the prioritised gaps section is hidden (since you are already viewing a filtered subset).

#### Framework Detail Page

Clicking into a framework shows:

**Summary cards:**
- **Readiness percentage** of requirements that are fully satisfied (based on assessment results, not control status)
- **Evidence coverage** showing what percentage of mapped controls have evidence attached
- **Gap count** showing requirements that are not fully satisfied, with a status breakdown

**Status breakdown bar** showing proportions of each requirement status:

| Requirement Status | Meaning |
|-------------------|---------|
| Satisfied | All mapped controls have a "satisfied" latest assessment |
| Partially satisfied | At least one mapped control has a "partially_satisfied" assessment |
| Needs review | At least one mapped control needs review |
| Unsatisfied | At least one mapped control has an "unsatisfied" assessment |
| Unassessed | Controls are mapped but some have no assessment at all |
| Unmapped | No controls are mapped to this requirement |

**Requirements list** showing each requirement with its mapped controls, their implementation status, latest assessment result, and evidence count. Each requirement has a **Map control** button to add mappings and an X button on each mapped control to remove them. All changes reflect instantly without a page reload.

**Prioritized gaps** listing requirements that are not satisfied, ordered for remediation. Hidden when a search or status filter is active.

#### Framework Table Columns

| Column | Description |
|--------|-------------|
| Name | Framework name (links to detail page) |
| Description | Short description |
| Version | Version identifier |
| Requirements | Count of requirements in this framework |
| Enabled | Toggle to include/exclude from readiness calculations |

---

### 3.2 Controls

Controls are your organization's security, operational, and compliance measures. They are framework-agnostic by design. You define controls based on what your organization actually does, then map them to framework requirements afterward.

#### Creating a Control

Click **New control** and fill in:

| Field | Required | Description |
|-------|----------|-------------|
| Name | Yes | Title of the control |
| Description | No | What the control does |
| Category | No | Free-text grouping (e.g., "Access Control", "Network Security", "Data Protection") |
| Status | No | Defaults to "not_implemented" |

#### Control Statuses

| Status | Meaning |
|--------|---------|
| not_implemented | Defined but not yet put into practice (default) |
| partial | Partially implemented |
| implemented | Fully implemented and operational |
| needs_review | Requires re-evaluation |

There is no enforced state machine. You can transition between any statuses freely. All status changes are recorded in the audit log.

#### Searching and Filtering

The controls list supports:

- **Search** by name or category (case-insensitive)
- **Filter** by exact category
- **Filter** by exact status
- **Pagination** with configurable page size (default 25, max 100)

#### How Controls Connect to Other Features

Controls are the central object in Kompro's compliance model:

- **Frameworks**: Controls are mapped to framework requirements via mappings. This is how you prove framework coverage.
- **Evidence**: Evidence records can be linked to a control to prove it is implemented.
- **Assessments**: Each assessment evaluates exactly one control and produces a result (satisfied, unsatisfied, etc.).
- **Dashboard**: The count of implemented controls and controls with evidence feed the readiness score.

---

### 3.3 Policies

Policies are your organization's formal documents that define rules, standards, and procedures. Kompro supports a full policy lifecycle including a rich text editor, file attachments with inline preview, user-controlled versioning, change requests, reviews, and exceptions.

#### Creating a Policy

Click **New policy** and fill in the creation modal:

| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | Policy name |
| Description | No | Short summary shown in the policies list |
| Initial version | Yes | Your version label (e.g., "1.0", "2.1.3", "Draft A") |
| Status | No | Defaults to "draft" |
| Owner | No | Searchable user picker |

After clicking **Create**, you are taken directly to the policy detail page where you can add content, upload a document, and manage the full lifecycle.

#### Policy Statuses

| Status | Meaning |
|--------|---------|
| draft | Being written or revised |
| active | Published and in effect |
| retired | No longer in effect |

When a policy transitions to **active** (either on creation or update), all active users in the organization receive an email notification.

#### Policy Detail Page

The detail page is organized into five tabs:

**Content tab:**
- Title, Description, Status, and Owner fields
- A **Markdown editor** for writing policy content with formatting. The editor is collapsed by default -- click it to expand. The toolbar supports: Bold, Italic, H1, H2, Horizontal rule, Unordered list, Ordered list, Blockquote, Inline code. An Edit/Preview toggle renders the Markdown live. A Collapse button minimizes the editor again.
- A **Document attachment** section for uploading PDF, Word, or text files. Supports drag-and-drop or click-to-browse. When a PDF is attached, it renders inline in the page. Non-PDF files show a download link. The Download button fetches the file with authentication. Replace file or Remove file buttons manage the attachment.
- A **Save changes** button that saves metadata and content together.

**Versions tab:**
- Lists all version snapshots in reverse order showing version label, status, timestamp, and the rendered Markdown content
- A version label input (e.g., "1.0", "2.1.3") and **Save as version** button to snapshot the current content at any time
- Versioning is entirely user-controlled. No automatic snapshots are created.
- Version labels are free-form strings, not auto-incremented integers. The policy's current version badge in the header updates to match the last saved version label.

**Change Requests tab:**
- For tracking proposed modifications to the policy
- Fields: Reason, Proposed content
- Status defaults to "requested"

**Reviews tab:**
- For scheduling and tracking periodic policy reviews
- Fields: Due date, Notes, Status (pending/complete)

**Exceptions tab:**
- For documenting approved departures from the policy
- Fields: Reason, Expiration date
- Status defaults to "active"

#### How Policies Connect to Other Features

- **Evidence**: Evidence records can be linked to one or more policies. A single piece of evidence (e.g., a document) can prove adherence to multiple policies simultaneously.
- **Dashboard**: Policy count is displayed as a stat card.
- **Trust Portal**: Active policy titles and descriptions can be exposed on the public trust portal.

---

### 3.4 Evidence

Evidence records are the proof that your controls are implemented and your policies are being followed. Evidence can be documents, screenshots, PDFs, images, logs, or any artifact that demonstrates compliance.

#### Creating Evidence

Click **Add evidence** and fill in the modal:

| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | Descriptive name for the evidence |
| Description | No | Additional context |
| Source | No | Where the evidence came from (see sources below) |
| File attachment | No | Drag-and-drop or browse to upload an image, PDF, Word doc, or text file |
| Content/Notes | No | Text content or notes |
| Controls | No | Multi-select: link to one or more controls |
| Policies | No | Multi-select: link to one or more policies |

#### Multi-linking to Controls and Policies

A single piece of evidence can be linked to **multiple controls and multiple policies** simultaneously. For example, a security policy document can serve as evidence for five different controls at once. Use the searchable multi-select fields to add as many links as needed. Each selected item appears as a removable tag.

This replaces the old single-select approach. Automated collectors still use a single control/policy link for simplicity.

#### File Attachments

The evidence form includes a drag-and-drop file upload zone. Accepted types: images (jpg, png, gif, etc.), PDF, Word (.doc/.docx), text files, CSV, Excel.

When viewing an evidence record in the detail drawer:
- **Images** are rendered inline
- **PDFs** are rendered in an embedded viewer
- **Other files** show a download link

Files are stored on local disk or in S3 depending on your configuration. Maximum file size defaults to 10 MB.

#### Evidence Sources

| Source | Meaning |
|--------|---------|
| documentation | Formal documents |
| policy | Policy documents |
| manual | Manually collected |
| integration | From a third-party integration |
| automated_check | From an automated collector |
| infrastructure | Infrastructure configuration |
| other | Anything else |

#### Viewing Evidence

Click the eye icon on any evidence row to open the detail drawer. It shows:
- Status and source badges, collection date
- Description and notes
- All linked controls and policies as badges
- Inline file preview (image or PDF) with a Download button

#### Requesting Evidence

You can request evidence from another user. This sends them an email notification. The evidence record is created in "requested" status until the user fulfills it.

#### Evidence Status Transitions

| Status | Meaning |
|--------|---------|
| submitted | Initial status when evidence is created |
| requested | Placeholder when evidence has been requested from a user |
| accepted | Reviewer has approved the evidence |
| rejected | Reviewer has rejected the evidence |

When evidence is accepted or rejected, the original uploader receives an email notification.

#### How Evidence Connects to Other Features

- **Controls**: Evidence linked to a control contributes to that control's evidence coverage. This feeds into both the dashboard readiness score and framework readiness calculations.
- **Policies**: Evidence linked to a policy proves adherence to that policy.
- **Assessments**: Evidence can be linked to assessments via a many-to-many relationship. When assessing a control, you reference the evidence you reviewed.
- **Frameworks**: Evidence coverage per control is surfaced in the framework readiness computation.
- **Integrations**: Automated collectors create evidence records with source "automated_check" and a linked collector ID.

---

### 3.5 Assessments

Assessments are evaluations of your controls. Each assessment targets one control and produces a result indicating how well that control is performing. Assessment results are the primary driver of framework readiness calculations.

#### Creating an Assessment

An assessment requires:

| Field | Required | Description |
|-------|----------|-------------|
| Control | Yes | Which control is being assessed |
| Result | Yes | The assessment outcome |
| Notes | No | Observations, findings, recommendations |
| Evidence IDs | No | Array of evidence records reviewed during the assessment |
| Assessment date | No | When the assessment was conducted (defaults to now) |
| Due date | No | Deadline for completing the assessment |

The assessor defaults to the currently authenticated user.

#### Assessment Results

| Result | Meaning |
|--------|---------|
| satisfied | The control fully meets its objectives |
| partially_satisfied | The control partially meets its objectives |
| unsatisfied | The control does not meet its objectives |
| needs_review | The control requires further evaluation |

#### Assessment vs. Control Status

These are two separate concepts:

- **Control status** is a self-declared implementation state set by your team ("we implemented it")
- **Assessment result** is an evaluator's independent verdict ("we verified it works")

Framework readiness percentages are derived from **assessment results**, not control statuses. Both values are shown side by side on the framework detail page so you can compare what you claim versus what has been verified.

#### Evidence Linking

When creating or updating an assessment, you can provide an array of `evidenceIds`. The system validates that all referenced evidence exists, then replaces the existing evidence links with the new set. This creates a clear audit trail of which evidence was considered during each assessment.

#### Email Notifications

When an assessment is created or when the assessor is changed, the assigned assessor receives an email notification with the control title and due date (if set).

#### How Assessments Connect to Other Features

- **Controls**: Each assessment evaluates exactly one control. A control can have many assessments over time, creating a history.
- **Evidence**: Assessments link to evidence via a many-to-many join table, documenting what was reviewed.
- **Frameworks**: Assessment results drive the framework status derivation and readiness calculations. The aggregation logic checks all controls mapped to a requirement and uses the worst-case assessment result.
- **Dashboard**: The assessment pass rate (satisfied / total) is one of the four readiness score components.

---

## 4. GRC

The GRC section covers governance, risk, and compliance activities beyond the core compliance modules.

### 4.1 Risk Management

The risk register tracks threats and vulnerabilities facing your organization, with scoring, scenarios, key risk indicators, and treatment plans.

#### Creating a Risk

Click **New risk** and fill in:

| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | Short name of the risk |
| Description | No | Detailed description |
| Likelihood | No | Integer from 1 (rare) to 5 (almost certain), defaults to 1 |
| Impact | No | Integer from 1 (negligible) to 5 (catastrophic), defaults to 1 |
| Category | No | Free-text grouping |
| Status | No | Defaults to "open" |
| Owner | No | Searchable user picker |

#### Risk Score

The risk score is automatically computed as `likelihood x impact`, producing a value from 1 to 25. Scores map to risk levels:

| Score | Level |
|-------|-------|
| 15 or above | Critical |
| 9 to 14 | High |
| 4 to 8 | Medium |
| 1 to 3 | Low |

#### Risk Heatmap

The risk page displays a 5x5 heatmap grid with impact on the vertical axis (5 at the top) and likelihood on the horizontal axis (1 at the left). Each cell is color-coded by risk level and shows the count of risks at that position.

#### Risk Statuses

| Status | Meaning |
|--------|---------|
| open | Risk is identified and active |
| mitigated | Risk has been reduced to an acceptable level |
| closed | Risk is no longer relevant |

#### Summary Statistics

The risk page displays four summary numbers at the top:
- Total risks
- Critical + high count
- Average score across all risks
- Open (non-closed) count

#### Risk Detail Drawer

Click into a risk to manage its sub-items:

**Scenarios:**
- Describe specific ways the risk could materialize
- Fields: Title, Description, Likelihood, Impact, Inherent score, Residual score

**Key Risk Indicators (KRIs):**
- Measurable values that signal when a risk is increasing
- Fields: Title, Description, Unit, Threshold (number), Current value (number)
- KRI status is auto-computed:
  - **breach**: current value exceeds the threshold
  - **warning**: current value is at or above 80% of the threshold
  - **ok**: current value is below 80% of the threshold

**Treatments:**
- Actions being taken to address the risk
- Fields: Title, Description, Status (planned/in_progress/done), Owner (user picker), Due date

#### How Risk Connects to Other Features

Risk management is an independent domain in Kompro. There is no direct database relationship between risks and controls, frameworks, or evidence. Risks and the compliance modules operate as parallel tracks. The open risk count appears on the dashboard.

---

### 4.2 Incidents

The incident module tracks security events, breaches, and operational disruptions from detection through resolution.

#### Creating an Incident

Click **New incident** and fill in:

| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | Short description of the incident |
| Description | No | Full details |
| Severity | No | Defaults to "low" |
| Classification | No | Free-text categorization |
| Status | No | Defaults to "open" |
| Owner | No | Searchable user picker |

Additional fields accepted by the backend (not yet in the UI form): `category`, `occurredAt`, `lessonsLearned`.

#### Severity Levels

| Severity | Meaning |
|----------|---------|
| low | Minimal impact |
| medium | Moderate impact |
| high | Significant impact |
| critical | Severe, immediate attention required |

#### Incident Statuses

| Status | Meaning |
|--------|---------|
| open | Incident detected and active |
| contained | Incident has been contained but not fully resolved |
| resolved | Incident is resolved |

Setting status to "resolved" automatically records the resolution timestamp. Changing status away from "resolved" clears the timestamp.

#### Response Actions

In the incident detail drawer, you can add and manage response actions:

| Field | Description |
|-------|-------------|
| Action | What needs to be done |
| Status | todo, in_progress, or done |
| Owner | Searchable user picker |
| Due date | Deadline |

Setting an action's status to "done" automatically records the completion timestamp.

#### How Incidents Connect to Other Features

Incidents are an independent module. The open incident count appears on the dashboard. All incident mutations are recorded in the audit log.

---

### 4.3 ITSM (IT Service Management)

The ITSM module manages IT assets, changes, and capacity planning. It is organized into three tabs.

#### Assets Tab

Track hardware, software, and other IT assets.

| Field | Required | Description |
|-------|----------|-------------|
| Name | Yes | Asset name |
| Type | No | Free-text type (e.g., "Server", "Laptop", "Software") |
| Description | No | Details about the asset |
| Owner | No | Searchable user picker |
| Location | No | Where the asset is located |
| Status | No | Defaults to "active" |

Asset statuses: `active`, `retired`, `disposed`

Additional fields accepted by the backend: `purchaseDate`, `warrantyExpiry` (dates).

You can filter assets by `type` and `status`.

#### Changes Tab

Track change requests for your IT infrastructure.

| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | What is being changed |
| Description | No | Full details |
| Risk | No | Risk assessment for this change |
| Asset ID | No | Link to an asset being modified |
| Status | No | Defaults to "requested" |

Change statuses: `requested`, `approved`, `implemented`, `closed`, `rejected`

Additional fields accepted by the backend: `scheduledAt` (datetime), `requestedBy`.

#### Capacity Tab

Plan and track resource capacity.

| Field | Required | Description |
|-------|----------|-------------|
| Resource | Yes | What is being measured (e.g., "CPU", "Storage", "Bandwidth") |
| Unit | No | Unit of measurement (e.g., "GB", "cores", "Mbps") |
| Current capacity | No | Current level (number) |
| Planned capacity | No | Target level (number) |
| Notes | No | Additional context |

#### How ITSM Connects to Other Features

ITSM is largely independent. Changes can reference an asset ID. All ITSM mutations are recorded in the audit log.

---

## 5. Integrations (Automated Evidence Collection)

The integrations page lets you set up automated evidence collectors that periodically gather compliance evidence from your systems. This eliminates the need to manually collect and upload evidence for routine checks.

### How It Works

1. You create a **collector configuration** specifying what type of data source to connect to, the connection parameters, and how often to run
2. The collector runs on a schedule (or can be triggered manually)
3. Each run produces one or more evidence records, automatically linked with source "automated_check"
4. If a run fails, all admin users receive an email notification

### Creating a Collector

Click **New collector** and fill in:

| Field | Required | Description |
|-------|----------|-------------|
| Name | Yes | Descriptive name for this collector |
| Description | No | What it collects |
| Type | Yes | sql, http, or file |
| Enabled | No | Toggle on/off (defaults to enabled) |
| Cadence (minutes) | No | How often to run, defaults to 360 (6 hours), minimum 1 |
| Parameters (JSON) | No | Type-specific configuration (see below) |
| Secrets (JSON) | No | Sensitive values like API keys (encrypted at rest with AES-256-GCM) |

When editing, leaving the Secrets field blank preserves the existing encrypted secrets.

### Collector Table Columns

| Column | Description |
|--------|-------------|
| Name | Collector name |
| Type | sql, http, or file |
| Status | Enabled/disabled toggle |
| Last run | Timestamp and success/error badge |
| Actions | Run now, Run history, Edit, Delete |

### Run History

Click the run history button on any collector to see a log of past runs, showing timestamp, status (success/error), number of items added, number of items updated, and any error messages.

### Deduplication

By default, collectors that run on a schedule would accumulate duplicate evidence records on every run. Kompro prevents this through **deduplication via an external ID**.

When a collector item includes an `externalId`, the system upserts instead of always creating:
- If a record with the same `collectorId + externalId` already exists, it is **updated** (title, description, content, linked control/policy, collection timestamp)
- If no existing record is found, a new one is **created**
- If no `externalId` is provided, the old append-only behavior applies

Each connector type exposes deduplication differently:

| Connector | How to enable deduplication |
|-----------|---------------------------|
| HTTP | Add `"id": "field.path"` to the `mapping` object. The value at that dot-path in each response item becomes the externalId. |
| SQL | Add `"idColumn": "your_column_name"` to params. The value in that column becomes the externalId. |
| File | Automatically uses the filename as the stable externalId. Re-running always updates the existing record for each file. |

---

### 5.1 SQL Collectors

SQL collectors execute a read-only query against the application's own PostgreSQL database and create evidence records from the results.

No external credentials are needed since it uses the app's database connection.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| sql | Yes | The SQL query to execute |
| titleColumn | No | Column to use as evidence title (default: "title") |
| descriptionColumn | No | Column to use as evidence description (default: "description") |
| idColumn | No | Column to use as the stable externalId for deduplication |
| controlIdColumn | No | Column containing a control ID to link evidence to |
| policyIdColumn | No | Column containing a policy ID to link evidence to |
| defaultTitle | No | Fallback title if the title column is empty |
| includeRowJson | No | If true, includes the full row as JSON in the evidence content |

**Example parameters:**
```json
{
  "sql": "SELECT id, name AS title, description FROM \"Control\" WHERE status = 'implemented'",
  "titleColumn": "title",
  "descriptionColumn": "description",
  "idColumn": "id",
  "includeRowJson": true
}
```

---

### 5.2 HTTP/REST Collectors

HTTP collectors make API calls to external services and convert the responses into evidence records. This is the most versatile collector type, supporting dozens of integrations.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| method | No | HTTP method (default: GET) |
| url | Yes | Request URL. Supports `{{secret.KEY}}` and `{{param.KEY}}` placeholders |
| headers | No | Object of HTTP headers |
| body | No | Request body (for POST/PUT) |
| auth | No | Authentication configuration (see below) |
| itemsPath | No | Dot-path to the array of items in the response (e.g., "data.items") |
| mapping | No | Object mapping response fields to evidence fields |
| defaultTitle | No | Fallback title when mapping produces empty |

**Mapping fields:**

| Key | Description |
|-----|-------------|
| id | Dot-path to a unique identifier for deduplication (becomes the externalId) |
| title | Dot-path to item title |
| description | Dot-path to item description |
| content | Dot-path to item content |
| controlId | Dot-path to a control ID |
| policyId | Dot-path to a policy ID |

**Authentication strategies:**

The `auth` parameter supports four strategies:

**API Key:**
```json
{
  "auth": {
    "type": "apiKey",
    "header": "X-Api-Key",
    "value": "{{secret.apiKey}}"
  }
}
```

**Bearer Token:**
```json
{
  "auth": {
    "type": "bearer",
    "value": "{{secret.token}}"
  }
}
```

**OAuth 2.0 Client Credentials:**
```json
{
  "auth": {
    "type": "oauth2",
    "tokenUrl": "https://provider.com/oauth/token",
    "clientId": "{{secret.clientId}}",
    "clientSecret": "{{secret.clientSecret}}",
    "scope": "read:all"
  }
}
```

**AWS Signature V4:**
```json
{
  "auth": {
    "type": "aws",
    "service": "s3",
    "region": "us-east-1",
    "accessKeyId": "{{secret.accessKeyId}}",
    "secretAccessKey": "{{secret.secretAccessKey}}"
  }
}
```

**Placeholder interpolation:**
- `{{secret.KEY}}` is replaced with the decrypted value from the collector's encrypted secrets
- `{{param.KEY}}` is replaced with the value from the collector's params object

This means you store sensitive values (API keys, tokens, passwords) in the secrets field and reference them via `{{secret.KEY}}` in your URL, headers, or auth configuration.

#### Example: GitHub Repository Audit

**Parameters:**
```json
{
  "url": "https://api.github.com/orgs/{{param.org}}/repos",
  "org": "your-org-name",
  "auth": {
    "type": "bearer",
    "value": "{{secret.githubToken}}"
  },
  "itemsPath": "",
  "mapping": {
    "title": "full_name",
    "description": "description",
    "content": "html_url"
  },
  "defaultTitle": "GitHub Repository"
}
```

**Secrets:**
```json
{
  "githubToken": "ghp_your_personal_access_token"
}
```

#### Example: Jira Compliance Tickets

**Parameters:**
```json
{
  "url": "https://your-domain.atlassian.net/rest/api/3/search?jql={{param.jql}}",
  "jql": "project=COMP AND status=Done",
  "auth": {
    "type": "apiKey",
    "header": "Authorization",
    "prefix": "Basic",
    "value": "{{secret.jiraAuth}}"
  },
  "itemsPath": "issues",
  "mapping": {
    "title": "fields.summary",
    "description": "fields.description",
    "content": "key"
  }
}
```

**Secrets:**
```json
{
  "jiraAuth": "base64-encoded-email:api-token"
}
```

#### Example: AWS Config Compliance

**Parameters:**
```json
{
  "url": "https://config.us-east-1.amazonaws.com/?Action=DescribeComplianceByConfigRule&Version=2014-11-12",
  "auth": {
    "type": "aws",
    "service": "config",
    "region": "us-east-1",
    "accessKeyId": "{{secret.accessKeyId}}",
    "secretAccessKey": "{{secret.secretAccessKey}}"
  },
  "itemsPath": "ComplianceByConfigRules",
  "mapping": {
    "title": "ConfigRuleName",
    "description": "Compliance.ComplianceType"
  }
}
```

#### Other Supported Services

The HTTP collector's flexible design means it can connect to virtually any REST API, including:

- **Cloud providers**: AWS, Azure, GCP
- **Identity providers**: Okta, Microsoft Entra ID
- **Code security**: Snyk, SonarQube
- **Source control**: GitHub, GitLab
- **Service management**: Jira, ServiceNow
- **Security**: SecurityScorecard, Cloudflare, KnowBe4
- **Monitoring**: Datadog
- **Container orchestration**: Kubernetes API

---

### 5.3 File Collectors

File collectors read files from the server's filesystem and create evidence records from their contents.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| path | Yes | Directory path on the server to read from |
| pattern | No | Glob-style filter for filenames (default: "*") |
| titleFrom | No | "filename" or "content" (default: inferred) |
| description | No | Description applied to all collected evidence |
| maxBytes | No | Maximum bytes to read per file (default: 100000) |
| controlId | No | Control ID to link all collected files to |
| policyId | No | Policy ID to link all collected files to |

The file collector automatically uses the filename as the `externalId`, so re-running the collector updates the existing evidence record for each file instead of creating a duplicate.

**Example parameters:**
```json
{
  "path": "/var/log/audit",
  "pattern": "*.log",
  "titleFrom": "filename",
  "description": "System audit log file",
  "controlId": "clx1234567890"
}
```

---

### 5.4 Scheduling and Runs

#### Automatic Scheduling

The collector runner sweeps every 60 seconds, checking for enabled collectors whose next scheduled run time has passed. When a collector is due:

1. The runner decrypts the collector's secrets
2. Invokes the appropriate connector (SQL, HTTP, or file)
3. Creates evidence records from the results
4. Updates the collector's `lastRunAt`, `lastStatus`, and `nextRunAt` (current time + cadence minutes)
5. Records an audit log entry

The initial sweep runs 5 seconds after server startup.

#### Manual Runs

Click the **Run now** button on any collector to trigger an immediate execution, regardless of the schedule.

#### Failure Handling

When a collector run fails:
- The error is recorded on the collector (`lastStatus: "error"`, `lastError: message`)
- All admin users receive an email notification with the collector name and a link to the audit log
- The next scheduled run time is still advanced so the collector continues to retry on schedule

---

## 6. Audit Program

The audit program module supports planning and executing internal or external audits, tracking findings (nonconformities), and managing corrective actions.

### Creating an Audit Plan

Click **New audit** and fill in:

| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | Audit name |
| Scope | No | What areas or processes are being audited |
| Status | No | Defaults to "planned" |
| Scheduled date | No | When the audit is planned to occur |

#### Audit Plan Statuses

| Status | Meaning |
|--------|---------|
| planned | Audit is scheduled but not started |
| in_progress | Audit is actively being conducted |
| complete | Audit has been finished |

### Nonconformities (Findings)

Inside the audit detail drawer, you can add nonconformities discovered during the audit:

| Field | Description |
|-------|-------------|
| Description | What was found |
| Severity | minor, major, or critical |
| Status | open, in_progress, or closed |

### Corrective Actions

Under each nonconformity, you can add corrective actions to address the finding:

| Field | Description |
|-------|-------------|
| Description | What needs to be done |
| Status | open, in_progress, or closed |
| Owner | Searchable user picker |

The hierarchy is: Audit Plan > Nonconformities > Corrective Actions.

---

## 7. Audit Logs

Every create, update, and delete operation across all modules is automatically recorded in the audit log. This provides a complete, immutable trail of all changes in the system.

### What Gets Logged

Each audit entry captures:

| Field | Description |
|-------|-------------|
| Timestamp | When the action occurred |
| Actor | The user who performed the action (email), or "system" for automated operations |
| Action | create, update, delete, or collect |
| Entity | Which module (framework, control, policy, evidence, assessment, risk, incident, etc.) |
| Entity ID | The specific record's ID |
| Before | JSON snapshot of the record before the change (null on create) |
| After | JSON snapshot of the record after the change (null on delete) |
| IP address | Client IP of the actor |

### Filtering Logs

| Filter | Description |
|--------|-------------|
| From date | Show entries after this date |
| To date | Show entries before this date |
| Entity | Filter by module (12 entity types available) |
| Action | Filter by action type |

### Exporting Logs

Click the export button to download logs in JSON or CSV format. CSV exports include: id, timestamp, action, entity, entity ID, actor ID, actor email, before (JSON), after (JSON), and IP address.

When SMTP is configured, the exporting user receives an email notification confirming the export.

### CSV Data Exports (All Feature Pages)

Every feature page (Controls, Frameworks, Policies, Evidence, Assessments, Risk, Incidents, ITSM, Integrations, Audit Program) has an **Export CSV** button in the page header. This exports the currently loaded data as a CSV file directly in your browser.

**Important:** Every CSV export is recorded in the audit log with action `export`, the entity name (e.g., "controls"), the filename, and the row count. This ensures data-out events are traceable. The audit entry captures who exported what, from which page, and how many records were included.

### Purging Old Logs

Admins with the `audit:purge` permission can purge audit entries older than a specified number of days (default retention: 365 days, configurable via `AUDIT_RETENTION_DAYS`). The purge action itself is recorded in the audit log.

---

## 8. Organization Settings

The organization settings page manages your organization's profile.

### Fields

| Field | Description |
|-------|-------------|
| Organization name | Primary name for your organization |
| Display name | Optional friendly name |
| Settings (JSON) | Arbitrary key-value configuration stored as JSON |

The organization record is auto-created on first update if it does not exist. There is exactly one organization per Kompro deployment (single-tenant model).

---

## 9. Trust Portal

The trust portal is a public-facing page that lets external stakeholders -- customers, auditors, partners, and prospects -- view your organization's compliance posture without needing to log in. It is accessible at `/trust` on your Kompro instance.

### Enabling the Portal

1. Go to **Administration > Trust Portal** in the sidebar
2. Toggle the portal status to **Enabled**
3. Configure what content to show
4. Click **Save settings**

Once enabled, the portal is publicly accessible. Anyone with the URL can view it. No login is required.

### Login Page Link

When the trust portal is enabled, a link automatically appears at the bottom of the Kompro login page: **"View [Org Name]'s Trust Portal"**. This makes it easy for stakeholders who land on the login page to navigate to the public portal without needing to know the direct URL. The link is hidden when the portal is disabled.

### Portal Content

The admin settings page lets you configure the portal text and content:

| Setting | Description |
|---------|-------------|
| Headline | The main heading shown at the top of the portal (e.g., "Security & Compliance") |
| Description | An introductory paragraph below the headline explaining your organization's commitment to security |

### Contact and Access Requests

External stakeholders often need to request detailed audit reports, SOC 2 packages, or NDA-protected documents. The portal includes a dedicated contact section:

| Setting | Description |
|---------|-------------|
| Contact Email | The email address for compliance inquiries (e.g., compliance@yourcompany.com) |
| Access Request Instructions | Freeform text explaining how stakeholders can request access to full audit reports, what information they need to provide, typical response times, etc. |

### Visibility Controls

You control exactly which sections appear on the public portal using toggles:

| Toggle | What It Shows |
|--------|---------------|
| Overall readiness score | The composite compliance readiness percentage (0-100) and its four component progress bars: framework adoption, control implementation, evidence coverage, and assessment pass rate |
| Framework readiness | A card for each enabled framework showing its name, version, readiness percentage, and how many requirements are satisfied |
| Active policies | A list of all policies with status "active", showing only their titles and descriptions (never the full policy content) |
| Aggregate statistics | Summary cards showing total controls, implemented controls, total evidence items, and assessment pass/total counts |

### Custom Sections

You can add any number of freeform content sections to the portal. Each section has a title and body text. Use these for:

- Describing your security practices
- Listing certifications or attestations
- Explaining your data handling procedures
- Linking to external resources
- Providing FAQ answers for common stakeholder questions

Click **Add section** to create a new one. Sections can be reordered by removing and re-adding them.

### What Is Exposed Publicly

The portal is designed to share only aggregate, safe-to-publish data:

**Shown:**
- Organization name and display name
- Readiness percentages (overall and per-framework)
- Aggregate counts (total controls, evidence items, assessments)
- Active policy titles and descriptions
- Custom text content you configure

**Never shown:**
- Individual control names or details
- Gap analysis or unsatisfied requirements
- Evidence content or file attachments
- Assessment notes or findings
- Internal user information
- Risk, incident, or ITSM data

### What Stakeholders See

When a stakeholder visits your portal URL (`/trust`), they see:

1. A branded header with your organization name
2. Your headline and description
3. The overall readiness score with component breakdowns (if enabled)
4. Aggregate stats cards (if enabled)
5. Per-framework readiness cards (if enabled)
6. Active policy list (if enabled)
7. Any custom sections you have added
8. A contact/request access section with your email and instructions
9. A "Powered by Kompro" footer

If the portal is disabled, visitors see a simple message saying the portal is not available.

### Audit Logging

All changes to trust portal settings are recorded in the audit log, including who changed the settings and the before/after values.

---

## 10. General UI Behavior

### Numbered Rows

Every table across the app has a `#` column that shows the sequential row number. This makes it easy to reference specific records in conversations, reports, or support tickets.

### Skeleton Loading

When navigating to a page, tables display an animated skeleton placeholder while data loads instead of a spinner in the middle of the page. This gives a better sense of the page structure before data arrives.

### Optimistic UI Updates

Creating, updating, and deleting records updates the UI immediately without waiting for a full page reload. After the local state is updated, a silent background sync confirms the change with the server. This means:

- Creating a record appends it to the list instantly
- Updating a record reflects the change in the list instantly
- Deleting a record removes it from the list instantly
- No full-page flash or spinner appears during these operations

### Smart Dropdowns

All searchable select dropdowns (controls, policies, users, frameworks, etc.) behave intelligently with respect to viewport position:

- When there is enough room below the trigger, the dropdown opens downward as normal
- When the trigger is near the bottom of the viewport, the dropdown opens **upward** so it stays visible
- When you scroll the page while a dropdown is open, it closes automatically to avoid the dropdown staying stuck in the wrong position

---

## 11. User Management

### Inviting Users

There are two ways to add users:

**With SMTP configured:**
1. Go to Users and click "Invite user"
2. Enter their email, name, and select a role
3. They receive an email invitation with a link to set their password
4. The invitation expires after 72 hours (configurable via `INVITE_TTL_HOURS`)
5. You can resend the invitation if needed

**Without SMTP:**
1. Create the user the same way
2. The system generates a reset link instead of sending an email
3. Copy the link and share it with the user manually
4. They use the link to set their password

### User Statuses

| Status | Description |
|--------|-------------|
| Active | User can log in and use the system |
| Invited | User has been created but has not yet accepted their invitation |

### Managing Users

| Action | Description |
|--------|-------------|
| Edit | Change name, role, or active status |
| Deactivate | Disables the account and immediately revokes all active sessions |
| Reactivate | Re-enables a deactivated account |
| Reset link | Generates a password reset URL (useful when SMTP is not configured) |
| Delete | Permanently removes the user. Cannot delete the last admin. |

When a user's password or role is changed by an admin, the user receives an email notification. When a user is deleted, they receive an "account removed" email.

### User Table Columns

| Column | Description |
|--------|-------------|
| Name | User's display name |
| Email | Login email address |
| Role | Assigned role badge |
| Status | Active or Invited |
| Actions | Reset link, Edit, Delete |

---

## 12. Roles and Permissions

Kompro uses role-based access control (RBAC). Each user is assigned one role, and each role has a set of granular permissions.

### Default Roles

| Role | Access Level |
|------|-------------|
| admin | All 44 permissions (full access to everything) |
| auditor | Read-only access to all modules (no create, update, or delete) |
| member | Read access to organization settings only |

### Creating Custom Roles

Go to Roles and click "New role":

1. Enter a name and optional description
2. Check the permissions you want to grant, organized by resource group:

| Resource | Available Permissions |
|----------|----------------------|
| Organization | org:read, org:update |
| Users | users:read, users:create, users:update, users:delete |
| Roles | roles:read, roles:create, roles:update, roles:delete |
| Audit | audit:read, audit:purge |
| Controls | controls:read, controls:create, controls:update, controls:delete |
| Policies | policies:read, policies:create, policies:update, policies:delete |
| Evidence | evidence:read, evidence:create, evidence:update, evidence:delete, evidence:collect |
| Assessments | assessments:read, assessments:create, assessments:update, assessments:delete |
| Frameworks | frameworks:read, frameworks:create, frameworks:update, frameworks:delete |
| Risk | risk:read, risk:create, risk:update, risk:delete |
| Incidents | incident:read, incident:create, incident:update, incident:delete |
| ITSM | itsm:read, itsm:create, itsm:update, itsm:delete |
| Audit Program | auditplan:read, auditplan:create, auditplan:update, auditplan:delete |

Note: The `evidence:collect` permission is specifically for managing automated evidence collectors (integrations). It is separate from the regular evidence CRUD permissions.

A role cannot be deleted if it is currently assigned to any users.

### How Permissions Work

On every API request:
1. The server verifies the user's JWT and session
2. The middleware loads the user's role and its associated permissions
3. If the required permission for that endpoint is not in the role's permission set, the request is rejected with a 403 Forbidden error

The frontend also fetches the current user's permissions via the `/api/auth/me` endpoint to show or hide UI elements based on what the user is allowed to do.

---

## 13. Authentication

### Registration

The first user to register automatically receives the **admin** role. All subsequent registrations receive the **member** role. Registration requires an email and a password (minimum 8 characters).

### Login

Standard email and password login. Rate-limited to 5 attempts per 15 minutes per email address.

### New IP Detection

When `LOGIN_ALERT_NEW_IP` is enabled, the system checks if the login IP address has been seen in previous login audit entries. If it is a new IP, the user receives an email alert.

### Sessions

Sessions are stored in the database, enabling instant revocation. JWTs are signed with HS256 and delivered as httpOnly cookies. Key settings:

| Setting | Default | Description |
|---------|---------|-------------|
| JWT_TTL | 2h | Token expiry time |
| SESSION_TTL_DAYS | 30 | How long a session stays valid |
| COOKIE_SAME_SITE | lax | Cookie SameSite attribute |

### Password Reset

1. User clicks "Forgot password?" and enters their email
2. A reset link is sent via email (with a unique token)
3. The token expires after `INVITE_TTL_HOURS` (default 72 hours)
4. After resetting, all active sessions are revoked (forces re-login everywhere)
5. The user receives a confirmation email

The forgot-password endpoint is rate-limited to 5 requests per hour per email and does not reveal whether the email exists (anti-enumeration).

### Password Change

Authenticated users can change their password. The current password must be verified first. After changing, all active sessions are revoked.

### Single Sign-On (SSO)

Kompro supports SSO via OAuth 2.0 with PKCE for:

**Google:**
- Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Default scope: `openid email profile`

**Microsoft (Entra ID):**
- Set `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and `MICROSOFT_TENANT`
- Default scope: `openid email profile`

SSO behavior:
- **Auto-provisioning**: When `SSO_AUTO_PROVISION` is true (default), users signing in via SSO for the first time are automatically created with the member role
- **Account linking**: If a user already has a password-based account with the same email, their SSO identity is linked to the existing account on first SSO login
- CSRF protection via state parameter stored in an httpOnly cookie
- PKCE (S256 challenge) for additional security

### Logout

Logging out revokes the current session and clears the authentication cookie.

---

## 14. How Everything Connects

Here is how all the modules in Kompro relate to each other:

```
                         +-------------+
                         |  Framework  |
                         +------+------+
                                |
                     has many   |
                                v
                   +-----------------------+
                   | Framework Requirement |
                   +-----------+-----------+
                               |
                mapped via     |  (Mapping join table, many-to-many)
                               v
    +--------+           +---------+           +------------+
    | Policy | <--+----> | Control | <-------> | Assessment |
    +--------+   |       +---------+    1:many +------+-----+
                 |           |  1:many                |
                 |           v                        | many:many
                 |      +----------+                  | (AssessmentEvidence)
                 +----> | Evidence | <----------------+
                        +----------+
                             ^
                             |
                     +-------+--------+
                     | CollectorConfig |  (automated ingestion)
                     +----------------+
```

### The Compliance Chain

1. **Frameworks** define what you need to comply with (requirements)
2. **Controls** define what your organization does (security measures)
3. **Mappings** connect controls to framework requirements (proving coverage)
4. **Evidence** proves controls are implemented (documents, logs, artifacts)
5. **Assessments** verify controls are effective (evaluator verdicts)
6. **Readiness** is computed from assessment results across mapped controls

### Key Relationships

| From | To | Relationship | How |
|------|----|-------------|-----|
| Framework | Requirements | One-to-many | A framework contains many requirements |
| Requirement | Controls | Many-to-many | Via the Mapping table, with optional notes |
| Control | Evidence | One-to-many | Evidence links to a control via controlId |
| Control | Assessments | One-to-many | Each assessment targets one control |
| Policy | Evidence | One-to-many | Evidence links to a policy via policyId |
| Assessment | Evidence | Many-to-many | Via AssessmentEvidence join table |
| Evidence | Collector | Many-to-one | Automated evidence references its collector |

### Independent Modules

These modules operate independently without direct database links to the compliance chain:
- **Risk Management**: Parallel risk tracking with its own scoring and treatment system
- **Incidents**: Event response tracking
- **ITSM**: IT asset and change management
- **Audit Program**: Internal/external audit planning and findings

They all share the common audit log and user/permission system.

---

## 15. Environment Configuration

All configuration is done via environment variables. Here is the complete reference:

### Core Settings

| Variable | Default | Description |
|----------|---------|-------------|
| BACKEND_PORT | 5000 | Server listening port |
| NODE_ENV | development | Runtime mode (development/production) |
| DATABASE_URL | (required) | PostgreSQL connection string |
| CORS_ORIGIN | localhost:5173 | Comma-separated allowed origins |
| APP_URL | localhost:5173 | Frontend URL used in email links |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| JWT_SECRET | (required) | Secret key for signing JWTs |
| JWT_TTL | 2h | JWT expiration time |
| SESSION_TTL_DAYS | 30 | Session lifetime in days |
| COOKIE_SAME_SITE | lax | Cookie SameSite attribute |
| LOGIN_ALERT_NEW_IP | false | Email alert on login from new IP |

### Initial Admin

| Variable | Default | Description |
|----------|---------|-------------|
| INITIAL_ADMIN_EMAIL | (none) | Bootstrap admin email |
| INITIAL_ADMIN_PASSWORD | (none) | Bootstrap admin password |

### Organization

| Variable | Default | Description |
|----------|---------|-------------|
| ORG_NAME | My Organization | Default organization name |

### Email (SMTP)

| Variable | Default | Description |
|----------|---------|-------------|
| SMTP_HOST | (none) | SMTP server hostname |
| SMTP_PORT | (none) | SMTP server port |
| SMTP_USER | (none) | SMTP username |
| SMTP_PASS | (none) | SMTP password |
| SMTP_SECURE | (none) | Use TLS (true/false) |
| MAIL_FROM | (none) | Sender email address |
| MAIL_FROM_NAME | Kompro | Sender display name |

When SMTP is not configured, email-dependent features (invitations, notifications, alerts) degrade gracefully. Invitation tokens are returned directly for manual delivery.

### User Management

| Variable | Default | Description |
|----------|---------|-------------|
| INVITE_TTL_HOURS | 72 | Invitation and reset link expiry |

### File Storage

| Variable | Default | Description |
|----------|---------|-------------|
| UPLOAD_DIR | backend/uploads | Local file storage directory |
| MAX_UPLOAD_MB | 10 | Maximum upload file size in MB |
| BODY_LIMIT_MB | 1 | Maximum JSON request body size in MB |

### S3 Storage (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| S3_BUCKET | (none) | S3 bucket name |
| S3_REGION | (none) | S3 region |
| S3_ACCESS_KEY_ID | (none) | AWS access key |
| S3_SECRET_ACCESS_KEY | (none) | AWS secret key |
| S3_ENDPOINT | (none) | Custom S3 endpoint (for S3-compatible services) |

When both S3_BUCKET and S3_REGION are set, file storage uses S3. Otherwise, files are stored locally.

### SSO: Google

| Variable | Default | Description |
|----------|---------|-------------|
| GOOGLE_CLIENT_ID | (none) | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | (none) | Google OAuth client secret |
| GOOGLE_SCOPE | openid email profile | OAuth scopes |

### SSO: Microsoft

| Variable | Default | Description |
|----------|---------|-------------|
| MICROSOFT_CLIENT_ID | (none) | Microsoft OAuth client ID |
| MICROSOFT_CLIENT_SECRET | (none) | Microsoft OAuth client secret |
| MICROSOFT_TENANT | common | Azure AD tenant ID or "common" |
| MICROSOFT_SCOPE | openid email profile | OAuth scopes |

### SSO Behavior

| Variable | Default | Description |
|----------|---------|-------------|
| SSO_AUTO_PROVISION | true | Auto-create accounts for new SSO users |
| SSO_REDIRECT_BASE | (none) | Override callback URL base for SSO redirects |

### Audit

| Variable | Default | Description |
|----------|---------|-------------|
| AUDIT_RETENTION_DAYS | 365 | Default retention period for audit log purge |
