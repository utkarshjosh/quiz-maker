# ADR 003: Shared Library Organization

## Status

Accepted

## Context

The Quiz Maker project has multiple applications and services that need to share:

- Common data types and interfaces
- DTOs (Data Transfer Objects) for API communication
- Utility functions
- Constants and enums
- Communication protocols

Previously, these were scattered across different modules or duplicated, leading to:

- Inconsistency between modules
- Code duplication
- Difficult maintenance
- Version synchronization issues

## Decision

Create dedicated shared library packages:

- `pkg/ts/` - Shared TypeScript libraries
- `pkg/go/` - Shared Go libraries

These packages will contain:

- Common types and interfaces
- DTOs for cross-module communication
- Utility functions
- Constants and enums
- Communication protocols

## Consequences

### Positive

- **Code Reuse**: Eliminates duplication across modules
- **Consistency**: Ensures all modules use the same types and patterns
- **Maintainability**: Single place to update shared code
- **Type Safety**: Consistent TypeScript types across all modules
- **Version Control**: Centralized versioning of shared components
- **Documentation**: Single source of truth for shared APIs

### Negative

- **Coupling**: Modules become dependent on shared packages
- **Breaking Changes**: Changes to shared packages affect all modules
- **Complexity**: Additional package management overhead

### Mitigation

- **Stable Interfaces**: Design shared APIs to be stable and backward compatible
- **Versioning**: Use semantic versioning for shared packages
- **Documentation**: Comprehensive documentation of all shared APIs
- **Testing**: Thorough testing of shared packages

## Implementation

### TypeScript Shared Package (`pkg/ts/`)

```typescript
// Main entry point
export * from './types';
export * from './dto';
export * from './utils';
export * from './constants';

// Package structure
pkg/ts/
├── types/           # Common TypeScript types
├── dto/            # Data Transfer Objects
├── utils/          # Utility functions
├── constants/      # Application constants
├── package.json    # Package configuration
├── tsconfig.json   # TypeScript configuration
└── index.ts        # Main export file
```

### Go Shared Package (`pkg/go/`)

```go
// Module structure
pkg/go/
├── models/         # Common data models
├── utils/          # Utility functions
├── protocols/      # Communication protocols
├── go.mod          # Go module definition
└── README.md       # Documentation
```

### Usage in Modules

```typescript
// In apps/api or apps/web
import { QuizDTO, UserDTO } from "@quiz-maker/ts";
import { formatDate, validateEmail } from "@quiz-maker/ts/utils";
```

```go
// In services/socket
import (
    "github.com/quiz-maker/go/models"
    "github.com/quiz-maker/go/utils"
)
```

## Package Management

### TypeScript Package

- Published as `@quiz-maker/ts` npm package
- Versioned independently of applications
- Includes TypeScript declarations
- Built and tested as part of CI/CD pipeline

### Go Package

- Published as Go module
- Versioned using Go module versioning
- Includes comprehensive tests
- Documented with Go documentation standards

## Development Workflow

1. **Shared Package Development**:
   - Make changes in `pkg/ts/` or `pkg/go/`
   - Test thoroughly
   - Update version
   - Build and publish

2. **Module Updates**:
   - Update shared package dependency
   - Test integration
   - Deploy updated modules

## Related Decisions

- ADR 001: Project Restructuring to Modular Architecture
- ADR 002: Monorepo with npm workspaces
- ADR 004: Infrastructure as code approach
