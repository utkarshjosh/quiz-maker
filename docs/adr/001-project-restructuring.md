# ADR 001: Project Restructuring to Modular Architecture

## Status

Accepted

## Context

The Quiz Maker project was originally organized in a flat structure with mixed concerns:

- `frontend/` - React frontend
- `api-gateway/` - Express backend
- `realtime-service/` - Go WebSocket service
- `quiz-generator/` - AI quiz generation service
- `shared/` - Empty shared utilities
- `docker/` - Docker configurations
- `database/` - Database files

This structure made it difficult to:

- Scale individual services independently
- Maintain clear boundaries between different concerns
- Enable team collaboration on different modules
- Reuse common code across services
- Deploy services independently

## Decision

Restructure the project into a modular, scalable architecture following the pattern:

```
quiz-maker/
├── apps/                    # Main applications
│   ├── api/                # Express + TypeScript backend
│   └── web/                # React frontend
├── services/                # Specialized services
│   ├── socket/             # Go WebSocket service
│   └── quiz-generator/     # AI-powered quiz generation
├── pkg/                    # Shared libraries
│   ├── ts/                 # Shared TS libraries (DTOs, utils)
│   └── go/                 # Shared Go libraries
├── infra/                  # Infrastructure
│   ├── docker/             # Docker configurations
│   └── database/           # Database migrations and configs
└── docs/                   # ADRs, philosophy, runbooks
```

## Consequences

### Positive

- **Modular Architecture**: Clear separation between applications, services, and shared libraries
- **Scalability**: Services can be scaled independently based on load
- **Team Development**: Multiple teams can work on different modules simultaneously
- **Code Reuse**: Shared libraries reduce duplication and ensure consistency
- **Technology Flexibility**: Best tool for each specific need
- **Independent Deployment**: Each service can be deployed independently
- **Clear Boundaries**: Well-defined interfaces between modules

### Negative

- **Initial Complexity**: More complex directory structure
- **Learning Curve**: Team members need to understand the new organization
- **Cross-Module Changes**: Require ADRs for boundary-crossing changes

### Mitigation

- Comprehensive documentation in `docs/` directory
- Clear examples and patterns for each module
- Automated scripts for common development tasks
- Proper workspace configuration for dependency management

## Implementation

1. **Directory Reorganization**: Move existing directories to new structure
2. **Package.json Updates**: Update root package.json with workspace configuration
3. **Docker Updates**: Update docker-compose.yml with new paths
4. **Documentation**: Create comprehensive documentation for new structure
5. **Scripts**: Add development scripts for all modules

## Related Decisions

- ADR 002: Monorepo with npm workspaces
- ADR 003: Shared library organization
- ADR 004: Infrastructure as code approach
