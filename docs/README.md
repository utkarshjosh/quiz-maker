# Quiz Maker Documentation

Welcome to the Quiz Maker project documentation. This directory contains comprehensive documentation for the project architecture, development workflows, and implementation details.

## 📚 Documentation Structure

### 🏗️ Architecture & Design

- **[Architectural Decision Records (ADRs)](adr/)** - All major architectural decisions documented
- **[Project Structure](../PROJECT_STRUCTURE.md)** - Detailed project organization and principles
- **[Restructuring Summary](../RESTRUCTURING_SUMMARY.md)** - Summary of the project restructuring

### 🔧 Development & Implementation

- **[API Documentation](../apps/api/README.md)** - API Gateway service documentation
- **[Frontend Documentation](../apps/web/README.md)** - Web application documentation
- **[Quiz Generator Documentation](../services/quiz-generator/README.md)** - AI service documentation
- **[WebSocket Service Documentation](../services/socket/README.md)** - Real-time service documentation

### 🚀 Infrastructure & Deployment

- **[Infrastructure Guide](../infra/README.md)** - Docker, database, and deployment configurations
- **[Development Workflow](../dev-workflow.md)** - Development processes and best practices

## 🎯 Quick Start

1. **Read the [Project Structure](../PROJECT_STRUCTURE.md)** to understand the architecture
2. **Review [ADR-001](adr/001-project-restructuring.md)** for the restructuring decision
3. **Check [Infrastructure Guide](../infra/README.md)** for setup instructions
4. **Follow [Development Workflow](../dev-workflow.md)** for development processes

## 🔍 Key Architectural Decisions

### 1. **Modular Architecture** ([ADR-001](adr/001-project-restructuring.md))

- Clear separation between applications, services, and shared libraries
- Feature-based organization over technical layers
- Independent development and deployment of modules

### 2. **Monorepo with npm Workspaces** ([ADR-002](adr/002-monorepo-with-npm-workspaces.md))

- Centralized dependency management
- Shared development scripts and tooling
- Efficient development workflows

### 3. **Shared Library Organization** ([ADR-003](adr/003-shared-library-organization.md))

- Common types, DTOs, and utilities in `pkg/` directories
- Eliminates code duplication across modules
- Ensures consistency and maintainability

### 4. **Infrastructure as Code** ([ADR-004](adr/004-infrastructure-as-code.md))

- All infrastructure configurations version controlled
- Docker-based development environment
- Consistent deployment across environments

### 5. **Database Schema Management** ([ADR-005](adr/005-database-schema-management-with-prisma.md))

- Prisma as single source of truth
- Automatic migration generation
- Full TypeScript integration

### 6. **OAuth Authentication** ([ADR-006](adr/006-oauth-authentication-implementation.md))

- Auth0 integration with express-openid-connect
- Automatic user context population
- Type-safe authentication

## 🛠️ Development Tools

- **TypeScript**: Full type safety across all modules
- **Prisma**: Database ORM with automatic migrations
- **Docker**: Containerized development and deployment
- **npm Workspaces**: Monorepo dependency management
- **Jest**: Testing framework for all modules

## 📖 Documentation Standards

### ADR Format

All architectural decisions follow the standard ADR format:

- **Status**: Current state of the decision
- **Context**: Problem being solved
- **Decision**: What was decided
- **Consequences**: Positive and negative impacts
- **Implementation**: How to implement the decision

### Code Examples

- All code examples include proper TypeScript types
- Examples are tested and verified
- Include error handling and best practices

### Diagrams

- Architecture diagrams use standard notation
- Clear labeling and relationships
- Consistent visual style

## 🤝 Contributing to Documentation

### Adding New ADRs

1. Use the [ADR template](adr/README.md#adr-template)
2. Follow the naming convention: `XXX-title.md`
3. Update the [ADR index](adr/README.md)
4. Link related ADRs appropriately

### Updating Existing Documentation

1. Keep documentation in sync with code changes
2. Update examples when APIs change
3. Maintain consistent formatting and style
4. Add cross-references between related documents

### Documentation Review

1. All documentation changes require review
2. Ensure accuracy and completeness
3. Verify code examples work correctly
4. Check for broken links and references

## 🔗 Related Resources

- **[GitHub Repository](https://github.com/your-org/quiz-maker)** - Source code and issues
- **[Project Wiki](https://github.com/your-org/quiz-maker/wiki)** - Additional resources
- **[API Documentation](https://your-domain.com/api/docs)** - Live API documentation
- **[Development Guide](https://your-domain.com/dev)** - Development setup and workflows

## 📞 Support

For questions about the documentation or project architecture:

1. **Check existing ADRs** for architectural decisions
2. **Review project structure** documentation
3. **Open an issue** for documentation improvements
4. **Contact the architecture team** for complex questions

---

**Last Updated**: September 1, 2024  
**Version**: 1.0.0  
**Maintainer**: Architecture Team
