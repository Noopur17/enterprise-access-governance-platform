# Enterprise Access Governance Platform

Enterprise Access Governance Platform (EAGP) is a governed identity-access review platform.

Lifecycle-Sync is the role-change intelligence workflow inside this platform.

## Core Principle

> AI recommends. Humans approve. Deterministic services execute.

## Platform Capabilities

- Role-change event ingestion
- Access review orchestration
- Policy intelligence using RAG
- Structured recommendation generation
- Human approval workflow
- Deterministic access execution
- Audit and compliance reporting
- Observability and AI evaluation

## Repository Layout

```text
apps/
  api/                  NestJS API for ingestion, review, approval, execution
  worker/               Async processors for access review jobs
  admin-portal/         React admin dashboard

packages/
  domain/               Core domain entities and business rules
  shared-types/         Shared TypeScript contracts
  shared-utils/         Common utilities

docs/
  architecture/         Blueprints, sequence diagrams, decision records
  api/                  API contracts
  database/             Schema and data lifecycle
  security/             Threat model, RBAC, PII handling
  ai-governance/        RAG, evals, guardrails, prompt-injection controls
  operations/           Runbooks, SLOs, observability

infra/
  docker/               Local development infrastructure
  terraform/            Cloud infrastructure
  k8s/                  Kubernetes manifests

samples/
  events/               Sample Workday role-change events
  policies/             Sample access policy documents
```
