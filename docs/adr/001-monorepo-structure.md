# ADR-001: Monorepo with Service-per-Directory Structure

## Status
Accepted

## Date
2026-02-17

## Context
We need to organize multiple microservices, shared packages, and
infrastructure code. Options considered were:
- Polyrepo (each service in its own repository)
- Monorepo with shared workspace

## Decision
Use a monorepo with npm/pnpm workspaces where:
- `packages/` contains shared libraries (common, testing)
- `services/` contains each microservice
- Root contains infrastructure config (Docker, CI/CD, monitoring)

## Consequences

### Positive
- Shared code is easy to update across all services
- Single PR can update multiple services atomically
- Consistent tooling and standards across all services

### Negative
- Repository grows larger over time
- CI/CD needs to be smart about which services changed
- All developers need access to entire codebase

## Alternatives Considered
1. **Polyrepo** - Rejected because sharing code requires publishing packages,
   and coordinating changes across repos is painful
