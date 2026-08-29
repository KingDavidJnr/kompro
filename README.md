# Kompro

Open-source, self-hosted, framework-agnostic compliance management platform for organizations.

Kompro is a compliance management platform designed to help organizations define, manage, assess, and continuously maintain their compliance requirements while retaining ownership and control of their data and infrastructure.

Kompro is not built around any single compliance framework. Organizations can define their own compliance structures, policies, controls, evidence requirements, and assessment processes. Standardized frameworks such as ISO 27001, SOC 2, and GDPR are provided as seeded frameworks that organizations can optionally enable and use.

Kompro is self-hosted and uses PostgreSQL as its primary data store. Organizations deploy Kompro within infrastructure they control and provide their own environment-specific configuration and authentication credentials.

## Project Status

Kompro is currently under active development.

The project is being developed toward its first stable release, `v1.0.0`.

The current repository documentation describes the product, architecture, design principles, and development direction. Complete installation, configuration, deployment, upgrade, and production operation guides will be added and finalized before the `v1.0.0` release.

## Core Philosophy

Kompro is built around several principles.

### Organization-first

Compliance is an organizational requirement.

Kompro is designed to support the different people and functions involved in an organization's compliance program, including management, compliance, security, operations, human resources, engineering, and other relevant teams.

The platform does not assume that compliance belongs to a particular department or technical function.

### Framework-agnostic

Kompro is not a compliance application built around ISO 27001, SOC 2, GDPR, or any other individual framework.

The underlying platform is framework-agnostic.

An organization can create and manage its own:

- Policies
- Controls
- Requirements
- Evidence requirements
- Assessments
- Organizational standards
- Compliance structures
- Risk registers
- Incidents
- IT assets and changes
- Audit programs

External frameworks are represented as configurable framework definitions that can be enabled by an organization when needed.

Kompro ships with selected frameworks as seeded data so organizations can begin working with established standards without having to define them from scratch.

### Organization-owned data

Kompro is self-hosted.

Organizations deploy Kompro within infrastructure of their choice and maintain control over the application's data.

PostgreSQL is used as the primary database, allowing organizations to provision and operate their own database infrastructure rather than storing their compliance information in a database controlled by a hosted Kompro service.

### Configurable access control

Kompro does not assume that every organization has the same organizational structure.

Its IAM system is designed to allow organizations to define their own permissions, roles, policies, resource boundaries, and access rules.

Authentication establishes who a user is.

Kompro IAM determines what that user can do within the organization.

### Evidence-driven compliance

Compliance status should be based on the state of the organization's controls and the evidence supporting them.

Kompro treats evidence as a first-class part of the compliance model.

Evidence can be associated with controls and assessments and can maintain historical records of the organization's compliance state.

### Policy-as-code

Kompro supports the representation of machine-evaluable compliance rules as policy-as-code.

Organizations can define policies that contain rules capable of being evaluated against available evidence or other organizational data.

This allows compliance requirements to move beyond static documentation and become machine-evaluable where appropriate.

### Open source

Kompro is released as open-source software under the GNU Affero General Public License v3.0.

Organizations can use, inspect, modify, and contribute to the project under the terms of the license.

The project is intended to benefit from contributions from organizations and individuals using Kompro in real compliance environments.

## What Kompro Manages

Kompro is centered around several interconnected concepts.

### Organizations

An organization is the primary boundary within Kompro.

Organizations maintain their own users, IAM configuration, policies, controls, evidence, assessments, frameworks, and compliance state.

### Policies

Policies describe the rules and requirements an organization establishes for itself.

A policy can contain human-readable requirements as well as machine-evaluable rules where appropriate.

Policies can be associated with controls and can contribute to compliance assessments across multiple frameworks.

### Controls

Controls represent the security, operational, administrative, or compliance objectives an organization needs to maintain.

Controls are not inherently tied to a particular framework.

The same underlying control can contribute toward requirements in multiple enabled frameworks.

### Evidence

Evidence provides support for the state of a control or requirement.

Evidence may originate from:

- Organizational documentation
- Policies
- Manual submissions
- System integrations
- Automated checks
- Infrastructure information
- Other supported sources

Evidence is retained as part of the organization's compliance history.

### Assessments

Assessments represent the evaluation of controls and their supporting evidence.

A control may be evaluated as satisfied, partially satisfied, unsatisfied, or requiring review depending on the organization's assessment model.

Assessment results should be traceable to the underlying evidence and controls that support them.

### Frameworks

Frameworks are collections of requirements and mappings that can be enabled by an organization.

Kompro's core system does not depend on any particular framework.

Seeded frameworks may include standards and regulations such as:

- ISO 27001
- SOC 2
- GDPR

Additional frameworks can be added as the project evolves.

Organizations can also define their own frameworks and organizational standards.

### Mappings

Mappings connect related requirements and controls.

For example, a single organizational control may contribute toward requirements in several enabled frameworks.

This allows an organization to maintain its underlying compliance state once rather than independently maintaining duplicate implementations for every framework.

### Risk Management

Risk management allows organizations to maintain a risk register and track treatment activities.

Organizations can record risks with likelihood and impact scores, model risk scenarios, monitor key risk indicators (KRIs), and track remediation through treatment plans.

### Incident Management

Incident management supports the recording and handling of security and operational incidents.

Incidents can be classified by severity and status, and response actions can be tracked through to completion with assigned owners and due dates.

### IT Service Management

IT service management covers the operational IT items that support the compliance program.

Kompro tracks assets, change requests, and capacity plans so that the infrastructure behind controls and evidence is itself visible and governed.

### Audit Program

The audit program manages internal and external audits, the nonconformities identified during them, and the corrective actions used to close them.

This complements the immutable audit history (audit log) by providing structured audit planning and remediation workflow.

### Automated Evidence Collection

Beyond manual submissions, Kompro can collect evidence automatically from connected systems.

Configurable collectors run on a schedule or on demand, pulling evidence from SQL databases, HTTP APIs, files, and other integrations, with credentials stored encrypted. Collected evidence is recorded with a full audit trail.

## Cross-Framework Compliance

One of Kompro's core capabilities is the ability to map organizational controls across multiple frameworks.

For example, an organization may maintain a policy requiring multi-factor authentication for privileged accounts.

That policy may contribute to several organizational controls.

Those controls may in turn map to relevant requirements across:

- ISO 27001
- SOC 2
- GDPR
- An organization's internal security standard

The framework-specific status is derived from the organization's underlying controls, policies, evidence, and assessments.

The framework itself is not the source of truth.

The organization's compliance state is the source of truth.

Frameworks provide different views and mappings over that state.

## Policy-as-Code

Policy-as-code allows organizations to express portions of their compliance requirements in a form that can be evaluated programmatically.

A conceptual policy might look like:

```yaml
name: Production Database Encryption

scope:
  environment: production
  resource: database

rules:
  - encryption_at_rest: required
````

When Kompro has sufficient evidence to evaluate such a rule, the policy can contribute to the assessment of the associated control.

Policy-as-code is intended to support continuous evaluation where automation is possible while retaining support for human review and organizational processes where automation is not appropriate.

Not every compliance requirement can or should be represented entirely as code.

## Authentication

Kompro includes built-in authentication integrations for common identity providers.

Initial authentication providers include:

* Google
* Microsoft
* GitHub

Organizations provide their own provider credentials through environment configuration.

Kompro handles the integration and authentication flow while the deploying organization retains ownership of its identity-provider credentials.

Authentication and authorization are separate concerns.

After authentication, Kompro's IAM system determines the user's permissions within the organization.

## Self-Hosted Architecture

Kompro is designed to run as a self-hosted application.

At a high level, the deployment consists of:

```text
                 Organization
                      |
          +-----------+-----------+
          |                       |
          v                       v
     Kompro Frontend         Kompro Backend
          |                       |
          +-----------+-----------+
                      |
                      v
                PostgreSQL
```

The organization provides its own infrastructure and environment-specific configuration.

The application is designed so that deployment does not require Kompro to operate a centralized database containing customer compliance data.

## PostgreSQL

PostgreSQL is the primary database technology for Kompro.

The deployment model is based on Bring Your Own Postgres.

An organization can provision a PostgreSQL database using infrastructure of its choice and configure Kompro to connect to that database.

The database stores the organization's application and compliance data, including relevant historical records.

Kompro is not intended to require organizations to migrate their compliance information into a proprietary hosted storage system.

## Repository Structure

Kompro contains the frontend and backend in the same repository while keeping the two applications independently managed.

The repository is structured conceptually as:

```text
kompro/
├── backend/
│   ├── package.json
│   └── ...
│
├── frontend/
│   ├── package.json
│   └── ...
│
├── package.json
├── README.md
├── commits.md
└── ...
```

### Backend

The backend is built with JavaScript.

It contains the API, application logic, authentication handling, IAM, compliance domain logic, database interaction, and other server-side functionality.

The backend maintains its own package management and dependencies.

### Frontend

The frontend is built with React and TypeScript using Vite.

It contains the user interface through which organizations manage their compliance programs.

The frontend maintains its own package management and dependencies.

### Root Project

The root package configuration is responsible for project-level orchestration.

It is intended to provide commands for operating the frontend and backend together during development and other repository-level operations.

The frontend and backend remain independently managed applications.

There is intentionally no shared application package outside their respective directories.

## Configuration

Kompro uses environment variables for deployment-specific configuration.

Configuration includes values such as:

* Database connection information
* Application ports
* Authentication provider credentials
* Application secrets
* Other environment-specific settings

Secrets and credentials are not stored in the repository.

Detailed environment variable documentation and deployment instructions will be provided before the `v1.0.0` release.

## Development

Kompro is being developed as a single repository containing the frontend and backend applications.

The development environment is designed to allow both applications to be started through the root project while each application retains its own runtime configuration.

The backend and frontend run independently on their configured development ports.

Detailed development setup instructions will be added as the project approaches `v1.0.0`.

## Versioning

Kompro uses semantic versioning for releases.

Release versions follow the format:

```text
MAJOR.MINOR.PATCH
```

For example:

```text
1.0.0
1.1.0
1.1.1
2.0.0
```

Development versions before the first stable release may change significantly as the architecture and product evolve.

Stable release documentation will be maintained alongside the corresponding release versions.

## Contributions

Kompro is open source and contributions are welcome.

Contributions may include:

* Bug fixes
* New features
* Authentication integrations
* Compliance framework definitions
* Framework mappings
* Policy improvements
* Evidence integrations
* IAM improvements
* Performance improvements
* Documentation
* Tests
* Other improvements to the project

Contributors should review the project's contribution and commit conventions before submitting changes.

Commit conventions are documented in [`commits.md`](./commits.md).

Contribution guidelines will be expanded as the project approaches its first stable release.

## Compliance Framework Content

Framework definitions included with Kompro are provided as structured data used by the platform.

Framework content is separate from Kompro's core application architecture.

The project may include framework-specific content for standards and regulations, but the existence of such content does not make Kompro dependent on those frameworks.

Organizations remain responsible for determining how applicable requirements apply to their own circumstances and for ensuring that their compliance program is appropriate for their legal, regulatory, contractual, and operational requirements.

Kompro is a software platform and does not constitute legal, regulatory, audit, or compliance advice.

## Security

Security is a core concern of the project.

Kompro is designed to allow organizations to operate the application within infrastructure they control and to retain ownership of their application data and credentials.

Security-related functionality includes:

* Authentication
* Configurable IAM
* Permission management
* Audit history
* Evidence tracking
* Policy management
* Access control
* Risk management
* Incident management
* IT service management
* Audit program management
* Automated evidence collection
* Secure configuration through environment variables

Security practices and deployment hardening requirements will be documented before the `v1.0.0` release.

Security issues should be reported responsibly rather than disclosed publicly before they can be investigated and addressed.

## Roadmap

The initial development direction includes:

* Core organization management
* Authentication
* Configurable IAM
* Policy management
* Control management
* Evidence management
* Assessment workflows
* Framework management
* Cross-framework mappings
* Policy-as-code
* Audit history
* Risk management
* Incident management
* IT service management
* Audit program management
* Automated evidence collection
* Seeded compliance frameworks
* Additional integrations
* Production deployment support
* Comprehensive documentation

The roadmap may change as the architecture develops and real-world requirements become clearer.

## License

Kompro is licensed under the:

**GNU Affero General Public License v3.0**

See [`LICENSE`](./LICENSE) for the complete license text.

## Project

Kompro is an independent open-source project by David Oduse.

Official Repository: [https://github.com/KingDavidJnr/kompro](https://github.com/KingDavidJnr/kompro)

---

Kompro is being built to make compliance management something organizations can own, operate, customize, and extend without making a third-party hosted service the center of their compliance infrastructure.

---
