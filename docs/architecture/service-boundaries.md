# Service Boundaries

## Role Change Ingestion Service

Owns webhook validation, source verification, idempotency, and event persistence.

## Access Review Orchestrator

Owns the lifecycle of an access review request. Coordinates current-access lookup, policy retrieval, recommendation generation, and status transitions.

## Policy Intelligence Service

Owns policy document ingestion, chunking, embeddings, vector search, citations, and grounding.

## Recommendation Engine

Owns structured recommendation generation. The engine produces KEEP, REMOVE, or ADD recommendations only.

## Human Approval Service

Owns approval, rejection, reviewer comments, and review-state transitions.

## Access Execution Service

Owns deterministic execution of approved access changes through downstream adapters such as Okta, Salesforce, SAP, or internal access APIs.

## Audit & Compliance Service

Owns immutable audit logs, traceability, evidence records, and reporting.
