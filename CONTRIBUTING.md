# Contributing to Kompro

Thank you for your interest in contributing to Kompro.

Kompro is an open-source, self-hosted, framework-agnostic compliance management platform for organizations. Contributions from individuals and organizations using, evaluating, or improving the project are welcome.

This document describes how to contribute to the project, how development is organized, and the standards expected for contributions.

## Before Contributing

Before starting work on a contribution, please:

1. Read the project [README](./README.md).
2. Read the [commit conventions](./commits.md).
3. Check existing issues and pull requests to avoid duplicating work.
4. For significant changes, open or discuss an issue before beginning implementation.

Not every change requires an issue. Small documentation fixes, obvious bug fixes, and similarly straightforward contributions can be submitted directly.

## Development Branches

Kompro uses two primary branches:

- `main` contains stable code intended for releases.
- `develop` contains active development and is the default target for contributions.

The `main` branch should not be used as the base branch for ordinary feature development.

### Contribution Flow

Contributors should work from `develop`:

```text
develop
   │
   ├── feature branch
   ├── fix branch
   └── docs branch
          │
          ▼
        Pull Request
          │
          ▼
       develop
          │
          ▼
         main
````

Contributions should be submitted as pull requests targeting `develop`.

There is no shared `pr` branch.

Each contribution should use its own branch so that unrelated work remains isolated and independently reviewable.

## Creating a Branch

Create your branch from the latest `develop` branch.

```bash
git checkout develop
git pull origin develop
git checkout -b <branch-name>
```

Use a descriptive branch name that communicates the purpose of the work.

Examples:

```text
feat/policy-management
feat/google-authentication
fix/session-expiration
fix/iam-permission-check
docs/api-documentation
docs/deployment-guide
refactor/evidence-service
test/policy-evaluation
```

Recommended branch prefixes include:

| Prefix      | Purpose                  |
| ----------- | ------------------------ |
| `feat/`     | New functionality        |
| `fix/`      | Bug fixes                |
| `docs/`     | Documentation            |
| `refactor/` | Code restructuring       |
| `test/`     | Tests                    |
| `chore/`    | Maintenance              |
| `perf/`     | Performance improvements |

## Keep Contributions Focused

Each branch and pull request should represent one logical change.

Avoid combining unrelated changes in the same pull request.

For example, a pull request that adds policy management should not also contain unrelated authentication refactoring or documentation changes.

Focused contributions are easier to:

* Review
* Test
* Discuss
* Merge
* Revert
* Maintain

If a larger feature requires multiple logically distinct changes, separate them where practical.

## Commit Messages

Kompro uses a defined commit message convention.

Before committing, read [`commits.md`](./commits.md).

Examples:

```text
[feat] add policy management
[fix] prevent duplicate organization members
[docs] document IAM endpoints
[refactor] simplify authentication service
```

Commits should describe the actual change being introduced.

When a commit contains multiple related changes that require additional explanation, use a commit body according to the project's commit conventions.

## Code Organization

Kompro contains the frontend and backend in the same repository.

```text
kompro/
├── backend/
├── frontend/
└── ...
```

### Backend

The backend is written in JavaScript.

Backend-specific application code, dependencies, configuration, and implementation should remain within `backend/`.

### Frontend

The frontend is built with React, TypeScript, and Vite.

Frontend-specific application code, dependencies, configuration, and implementation should remain within `frontend/`.

The frontend and backend are independently managed applications.

Do not introduce shared application packages or shared directories outside the established project structure unless the architecture is intentionally changed and the change has been discussed.

## Root Project Commands

The root of the repository is the primary command interface for Kompro.

Contributors should use the root-level commands whenever an equivalent command is available.

For example:

```bash
npm run setup
npm run dev
npm run build
npm start
npm run lint
```

The root package configuration is responsible for orchestrating the frontend and backend.

Avoid requiring contributors to manually start each application when the root project already provides an appropriate command.

## Environment Configuration

Kompro uses a root-level environment configuration.

The repository provides an example environment file:

```text
.env.example
```

Create a local `.env` file based on the example when required for development.

Never commit:

```text
.env
```

or any file containing private credentials, secrets, tokens, or other sensitive configuration.

Do not place secrets into variables intended to be exposed to the frontend.

## Dependencies

Frontend dependencies belong to `frontend/package.json`.

Backend dependencies belong to `backend/package.json`.

Root dependencies should be limited to tooling required to orchestrate or manage the repository as a whole.

Do not add a dependency to the root simply because it is convenient if that dependency is only required by the frontend or backend.

## Database Changes

Database changes must be treated carefully because Kompro is designed around organization-owned PostgreSQL databases.

Changes involving:

* Database schema
* Migrations
* Data structures
* Database indexes
* Constraints
* Seed data
* Compliance framework data

should be reviewed with consideration for existing deployments and future migration paths.

Do not modify existing migrations in a way that would make them unsafe for deployments that have already applied them.

When a schema change is required, create the appropriate new migration.

## Compliance Frameworks

Kompro is framework-agnostic.

Contributions must not unnecessarily make the core application dependent on a specific compliance framework.

Framework-specific content should remain separate from the core compliance engine wherever the architecture permits.

Contributions involving frameworks should preserve the distinction between:

* Frameworks
* Requirements
* Controls
* Policies
* Evidence
* Assessments
* Mappings

A framework contribution should not introduce assumptions that prevent organizations from creating or using their own compliance structures.

## Policy-as-Code

Contributions to policy-as-code functionality should preserve the distinction between organizational policies and external compliance frameworks.

Policy rules should be designed so that they can operate against the underlying compliance model rather than being unnecessarily tied to a specific framework.

Where automated evaluation is introduced, the implementation should make the source of the evaluated evidence clear and maintain appropriate traceability.

## Authentication

Kompro includes built-in authentication support for organizational identity providers.

Authentication changes should preserve the separation between:

* Authentication
* Identity
* Authorization
* IAM
* Organization permissions

Changes to authentication flows should also consider deployments where organizations configure different authentication modes.

Do not hardcode organization-specific identity-provider credentials or configuration.

## Security

Security issues should be handled responsibly.

Do not disclose sensitive security vulnerabilities in a public issue before there has been an opportunity to investigate and address them.

Security-sensitive contributions should receive particular attention during review.

This includes changes involving:

* Authentication
* Authorization
* IAM
* Sessions
* Secrets
* Database access
* API access
* File handling
* Evidence storage
* Audit logs
* Environment configuration

Never commit credentials, private keys, access tokens, database passwords, or other secrets.

## Testing

Contributions should include appropriate tests where the affected functionality can reasonably be tested.

New functionality should have tests where practical.

Bug fixes should preferably include a test demonstrating the corrected behavior.

Before opening a pull request, contributors should run the applicable project checks locally.

At minimum, ensure that the affected application:

* Starts successfully
* Builds successfully where applicable
* Passes applicable lint checks
* Passes relevant tests

Additional automated checks may be required by the repository's CI configuration.

## Linting

Kompro uses ESLint for frontend code.

Run:

```bash
npm run lint
```

before submitting changes that affect the frontend.

Linting will also be enforced through continuous integration where configured.

A pull request should not intentionally introduce new lint errors.

## Pull Requests

When your work is ready, push your branch to your fork or repository and open a pull request against:

```text
develop
```

A pull request should contain:

* A clear title
* A concise description of the change
* Relevant context
* Testing information
* Any configuration or migration requirements
* Any known limitations

Example pull request title:

```text
[feat] add organization policy management
```

## Pull Request Description

For non-trivial changes, explain:

### What changed?

Describe the functionality or problem addressed.

### Why was it changed?

Explain the reason for the change when it is not obvious.

### How was it tested?

Describe the checks or tests performed.

### Additional considerations

Mention migrations, configuration changes, compatibility considerations, or other information reviewers should know.

## Pull Request Review

Pull requests are subject to review before being merged.

Review may consider:

* Correctness
* Security
* Maintainability
* Architecture
* Performance
* Testing
* Documentation
* Compatibility
* Consistency with Kompro's product philosophy

A contribution may be requested to change before it is merged.

Review comments are intended to improve the project and should be treated as part of the collaborative development process.

## Continuous Integration

Pull requests may be automatically checked by the project's CI workflows.

CI may include:

* Dependency installation
* Linting
* Tests
* Frontend builds
* Backend checks
* Other project validation

A pull request should pass all required CI checks before it is merged.

Contributors should not bypass or disable CI checks to make a pull request pass.

## Documentation

Documentation is part of the project.

Contributions that change user-facing behavior should update relevant documentation when necessary.

Documentation contributions are welcome independently of code contributions.

Examples include:

```text
[docs] improve deployment documentation
[docs] document policy management
[docs] clarify environment configuration
```

## Issues

Use GitHub Issues for:

* Bug reports
* Feature requests
* Technical discussions
* Documentation issues
* Other actionable project issues

Before opening an issue, search existing issues to determine whether the topic has already been reported or discussed.

Bug reports should include enough information to reproduce the problem where possible.

Useful information may include:

* Kompro version
* Environment
* Relevant configuration
* Steps to reproduce
* Expected behavior
* Actual behavior
* Error messages
* Relevant logs

Do not include secrets or sensitive organizational information in issues.

## Feature Requests

Feature requests are welcome.

A useful feature request should explain:

* The problem being solved
* Who experiences the problem
* The proposed behavior
* Why the proposed behavior is useful
* Any relevant alternatives

Features should be evaluated against Kompro's framework-agnostic and organization-first architecture.

A feature should not be added merely because it belongs to a particular compliance framework if the underlying capability does not make sense as part of Kompro's general compliance model.

## Backward Compatibility

Contributions should consider existing deployments.

Because Kompro is self-hosted, organizations may operate different versions of the software.

Changes that can affect:

* Database schemas
* Environment variables
* Configuration
* Authentication
* APIs
* Data formats
* Framework definitions

should be documented and implemented with upgrade considerations in mind.

## Releases

Stable releases are made from `main`.

The `develop` branch is used for active development and integration.

Contributors should not directly push changes to `main` unless repository maintainers explicitly permit it for a specific administrative purpose.

Release procedures may evolve as Kompro approaches `v1.0.0`.

## Maintainers

Project maintainers are responsible for:

* Reviewing contributions
* Maintaining project direction
* Managing releases
* Protecting the stability of `main`
* Maintaining project standards
* Making final decisions on architectural and product direction

Contributors are encouraged to discuss substantial architectural changes before investing significant implementation effort.

## License

By contributing to Kompro, you agree that your contributions will be licensed under the same license as the project.

Kompro is licensed under the GNU Affero General Public License v3.0.

See [`LICENSE`](./LICENSE) for the complete license.

## Final Notes

Kompro is intended to be a general-purpose compliance management platform.

Contributions should preserve its core principles:

* Organization-first
* Framework-agnostic
* Self-hosted
* Organization-owned data
* Configurable IAM
* Evidence-driven compliance
* Policy-as-code support
* Open source

The goal is not simply to add more features. The goal is to build a compliance platform that organizations can deploy, operate, understand, customize, and contribute to.

---