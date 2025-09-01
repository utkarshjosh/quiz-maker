# Architectural Decision Records (ADRs)

This directory contains Architectural Decision Records (ADRs) for the Quiz Maker project. ADRs document significant architectural decisions, their context, consequences, and implementation details.

## What are ADRs?

Architectural Decision Records are documents that capture important architectural decisions made during the development of a project. They provide:

- **Context**: Why the decision was made
- **Decision**: What was decided
- **Consequences**: The positive and negative impacts
- **Implementation**: How the decision is implemented

## ADR Index

| ADR                                                        | Title                                         | Status   | Date       |
| ---------------------------------------------------------- | --------------------------------------------- | -------- | ---------- |
| [ADR-001](./001-project-restructuring.md)                  | Project Restructuring to Modular Architecture | Accepted | 2024-09-01 |
| [ADR-002](./002-monorepo-with-npm-workspaces.md)           | Monorepo with npm Workspaces                  | Accepted | 2024-09-01 |
| [ADR-003](./003-shared-library-organization.md)            | Shared Library Organization                   | Accepted | 2024-09-01 |
| [ADR-004](./004-infrastructure-as-code.md)                 | Infrastructure as Code Approach               | Accepted | 2024-09-01 |
| [ADR-005](./005-database-schema-management-with-prisma.md) | Database Schema Management with Prisma        | Accepted | 2024-09-01 |
| [ADR-006](./006-oauth-authentication-implementation.md)    | OAuth Authentication Implementation           | Accepted | 2024-09-01 |

## ADR Template

When creating new ADRs, use the following template:

```markdown
# ADR XXX: [Title]

## Status

[Proposed | Accepted | Rejected | Deprecated | Superseded]

## Context

[Describe the context and problem statement]

## Decision

[Describe the decision made]

## Consequences

### Positive

- [List positive consequences]

### Negative

- [List negative consequences]

### Mitigation

- [List mitigation strategies]

## Implementation

[Describe how the decision is implemented]

## Related Decisions

- [List related ADRs]
```

## When to Create an ADR

Create an ADR when making decisions about:

- **Architecture**: System design, patterns, and structure
- **Technology**: Framework, library, or tool choices
- **Standards**: Coding standards, naming conventions, or processes
- **Infrastructure**: Deployment, hosting, or operational decisions
- **Cross-Module Changes**: Any change that affects multiple modules

## ADR Lifecycle

1. **Proposed**: Initial draft of the ADR
2. **Under Review**: ADR is being reviewed by the team
3. **Accepted**: ADR has been approved and implemented
4. **Deprecated**: ADR is no longer relevant
5. **Superseded**: ADR has been replaced by a newer decision

## Contributing

To contribute to ADRs:

1. Create a new ADR file using the template
2. Follow the naming convention: `XXX-title.md`
3. Update this index file
4. Submit a pull request for review
5. Update related ADRs if necessary

## Best Practices

- **Keep ADRs focused**: One decision per ADR
- **Be specific**: Include concrete examples and implementation details
- **Consider alternatives**: Document why other options were rejected
- **Update regularly**: Keep ADRs current with implementation
- **Link related ADRs**: Show relationships between decisions
- **Include context**: Explain the problem being solved

## Related Documentation

- [Project Structure](../PROJECT_STRUCTURE.md)
- [Development Workflow](../dev-workflow.md)
- [API Documentation](../api/README.md)
- [Infrastructure Guide](../infra/README.md)
