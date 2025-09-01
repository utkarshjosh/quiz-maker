# ADR 002: Monorepo with npm Workspaces

## Status

Accepted

## Context

The Quiz Maker project consists of multiple applications and services:

- React frontend (apps/web)
- Express API backend (apps/api)
- AI quiz generation service (services/quiz-generator)
- Go WebSocket service (services/socket)
- Shared TypeScript libraries (pkg/ts)
- Shared Go libraries (pkg/go)

We needed a way to:

- Manage dependencies across all modules
- Share common code between modules
- Maintain consistent development workflows
- Enable efficient development and testing

## Decision

Use npm workspaces to create a monorepo structure that allows:

- Centralized dependency management
- Shared development scripts
- Consistent tooling across all modules
- Efficient development workflows

## Consequences

### Positive

- **Centralized Management**: Single `npm install` installs all dependencies
- **Shared Scripts**: Common development commands available from root
- **Dependency Consistency**: Ensures all modules use compatible versions
- **Efficient Development**: Easy to work across multiple modules
- **Tooling Consistency**: Same linting, testing, and build tools across modules
- **Version Management**: Easier to manage versions across the entire project

### Negative

- **Complexity**: More complex package.json configuration
- **Learning Curve**: Developers need to understand workspace concepts
- **Tooling Requirements**: Requires npm 7+ for full workspace support

### Mitigation

- Clear documentation of workspace structure
- Comprehensive scripts for common tasks
- Automated workflows for building and testing

## Implementation

### Root package.json Configuration

```json
{
  "workspaces": ["apps/api", "apps/web", "services/quiz-generator", "pkg/ts"],
  "scripts": {
    "dev:api": "cd apps/api && npm run dev",
    "dev:web": "cd apps/web && npm run dev",
    "dev:quiz-gen": "cd services/quiz-generator && npm run dev",
    "build:all": "npm run build:api && npm run build:web && npm run build:quiz-gen",
    "test:all": "npm run test:api && npm run test:web && npm run test:quiz-gen"
  }
}
```

### Module Structure

Each module maintains its own:

- `package.json` with specific dependencies
- Development scripts
- Build configuration
- Test setup

### Development Workflow

1. **Install Dependencies**: `npm install` from root
2. **Development**: Use root scripts (e.g., `npm run dev:api`)
3. **Building**: Use root scripts (e.g., `npm run build:all`)
4. **Testing**: Use root scripts (e.g., `npm run test:all`)

## Related Decisions

- ADR 001: Project Restructuring to Modular Architecture
- ADR 003: Shared library organization
- ADR 005: Development workflow standardization
