# System Overview

## Product Name

Enterprise Access Governance Platform (EAGP)

## Workflow Name

Lifecycle-Sync: role-change intelligence workflow.

## Staff-Level Framing

This is not an LLM wrapper. It is an access governance platform where AI is bounded to recommendation generation only.

## High-Level Flow

```text
Workday Role Change Event
  -> Role Change Ingestion API
  -> Event State Store and Idempotency Check
  -> Access Review Orchestrator
  -> Current Entitlement Lookup
  -> Policy Intelligence Retrieval
  -> Policy-Grounded Recommendation
  -> Guardrail Validation
  -> Human Approval Workflow
  -> Deterministic Access Execution
  -> Audit and Compliance Reporting
```
