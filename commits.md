# Git Commit Conventions

Kompro uses a simple commit convention to keep the Git history clear, consistent, and easy to understand.

## Commit Format

Each commit should begin with a tag that describes the type of change.

```text
[tag] commit message
````

Examples:

```text
[feat] add policy management
[fix] resolve organization authentication error
[docs] add documentation for IAM endpoints
[refactor] simplify evidence service
[test] add tests for policy evaluation
[chore] update backend dependencies
[build] configure production build process
[style] format frontend components
[perf] optimize framework mapping queries
```

## Commit Tags

| Tag          | Purpose                                                       |
| ------------ | ------------------------------------------------------------- |
| `[feat]`     | Adds a new feature or capability                              |
| `[fix]`      | Fixes a bug or incorrect behavior                             |
| `[docs]`     | Adds or updates documentation                                 |
| `[refactor]` | Changes code structure without changing behavior              |
| `[test]`     | Adds or updates tests                                         |
| `[chore]`    | General maintenance that does not affect application behavior |
| `[build]`    | Changes build configuration or build-related tooling          |
| `[style]`    | Changes formatting or code style without affecting behavior   |
| `[perf]`     | Improves application performance                              |

## Commit Message Guidelines

### Keep messages concise

Describe what the commit does rather than explaining why it was done.

Good:

```text
[feat] add organization management
```

Avoid:

```text
[feat] I have now added the organization management functionality that allows users to create organizations
```

### Use the imperative form

Write commit messages as actions.

Good:

```text
[feat] add Google authentication
[fix] handle expired sessions
[docs] document policy endpoints
```

Avoid:

```text
[feat] added Google authentication
[fix] fixed expired sessions
```

### Keep each commit focused

A commit should represent one logical change whenever practical.

Good:

```text
[feat] add organization model
[feat] add organization API endpoints
[docs] document organization endpoints
```

Avoid combining unrelated changes into a single commit.

### Documentation changes

Use `[docs]` for documentation-only changes.

Examples:

```text
[docs] add documentation for IAM endpoints
[docs] document local development setup
[docs] update deployment instructions
```

If documentation is part of a feature implementation, the feature commit may include it. Use `[docs]` when the primary purpose of the commit is documentation.

## Examples

```text
[feat] add policy management
[feat] add Microsoft authentication
[fix] prevent duplicate organization members
[fix] handle invalid OAuth callback
[docs] add documentation for IAM endpoints
[docs] document environment variables
[refactor] reorganize authentication services
[test] add policy evaluation tests
[chore] update dependencies
[build] configure production Docker build
[perf] optimize evidence queries
```

## Scope

Commit conventions apply to all changes in the Kompro repository, including:

* Backend
* Frontend
* Database migrations
* Configuration
* Documentation
* Tests
* Build and deployment configuration

The commit tag should describe the primary purpose of the change, regardless of which part of the repository it affects.

---
