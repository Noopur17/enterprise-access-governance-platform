# Architecture Blueprint

```text
+---------------------+       +---------------------------+
| Workday / HR System | ----> | Role Change Ingestion API |
+---------------------+       +-------------+-------------+
                                            |
                                            v
                              +-------------+-------------+
                              | PostgreSQL Event Store    |
                              | Idempotency + Status      |
                              +-------------+-------------+
                                            |
                                            v
                              +-------------+-------------+
                              | Access Review Queue       |
                              | Retry + Backoff + DLQ     |
                              +-------------+-------------+
                                            |
                                            v
                              +-------------+-------------+
                              | Access Review Orchestrator|
                              +------+------+-------------+
                                     |     |
                  +------------------+     +-------------------+
                  v                                      v
     +------------+-------------+          +-------------+--------------+
     | Access Registry          |          | Policy Intelligence Service|
     | Current Entitlements     |          | RAG + Vector Search        |
     +------------+-------------+          +-------------+--------------+
                  |                                      |
                  +------------------+-------------------+
                                     v
                         +-----------+------------+
                         | Recommendation Engine |
                         | Structured Output     |
                         +-----------+------------+
                                     |
                                     v
                         +-----------+------------+
                         | Guardrail Validation  |
                         | Schema + Citations    |
                         +-----------+------------+
                                     |
                                     v
                         +-----------+------------+
                         | Human Approval Portal |
                         +-----------+------------+
                                     |
                                     v
                         +-----------+------------+
                         | Access Execution Svc  |
                         | Approved Actions Only |
                         +-----------+------------+
                                     |
                                     v
                         +-----------+------------+
                         | Okta / Salesforce / SAP|
                         +------------------------+

Cross-cutting: Audit logs, tracing, metrics, RBAC, PII masking, rate limits.
```
