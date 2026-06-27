# Database Schema Design

Core tables:

- role_change_events
- access_review_requests
- employee_entitlements
- policy_documents
- policy_chunks
- recommendation_items
- approval_decisions
- execution_tasks
- audit_logs
- llm_evaluation_metrics
- idempotency_keys

PostgreSQL is the system of record for event state, review state, auditability, and deterministic execution.
