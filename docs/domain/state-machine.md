# Access Review State Machine

## Overview

An Access Review Request progresses through a well-defined lifecycle. Modeling the workflow as a state machine ensures every transition is explicit, auditable, and recoverable.

---

# State Diagram

```text
                    +------------------+
                    |    RECEIVED      |
                    +------------------+
                             |
                             v
                    +------------------+
                    |    VALIDATED     |
                    +------------------+
                             |
                             v
                    +------------------+
                    | REVIEW_CREATED   |
                    +------------------+
                             |
                             v
                    +---------------------------+
                    | ENTITLEMENTS_RETRIEVED    |
                    +---------------------------+
                             |
                             v
                    +---------------------------+
                    | POLICIES_RETRIEVED        |
                    +---------------------------+
                             |
                             v
                    +---------------------------+
                    | RECOMMENDATION_GENERATED  |
                    +---------------------------+
                             |
                             v
                    +---------------------------+
                    | RECOMMENDATION_VALIDATED  |
                    +---------------------------+
                             |
                             v
                    +---------------------------+
                    | PENDING_HUMAN_APPROVAL    |
                    +---------------------------+
                           /             \
                          /               \
                         v                 v
               +----------------+   +----------------+
               |    REJECTED    |   |    APPROVED    |
               +----------------+   +----------------+
                                         |
                                         v
                              +------------------------+
                              | EXECUTION_IN_PROGRESS  |
                              +------------------------+
                                         |
                                         v
                              +------------------------+
                              |       COMPLETED        |
                              +------------------------+
```

---

# Failure States

The workflow may also enter one of the following terminal or recoverable states:

- DUPLICATE_EVENT
- POLICY_RETRIEVAL_FAILED
- RECOMMENDATION_FAILED
- VALIDATION_FAILED
- EXECUTION_FAILED
- CANCELLED
- EXPIRED

---

# Transition Rules

| Current State | Next State |
|---------------|------------|
| RECEIVED | VALIDATED |
| VALIDATED | REVIEW_CREATED |
| REVIEW_CREATED | ENTITLEMENTS_RETRIEVED |
| ENTITLEMENTS_RETRIEVED | POLICIES_RETRIEVED |
| POLICIES_RETRIEVED | RECOMMENDATION_GENERATED |
| RECOMMENDATION_GENERATED | RECOMMENDATION_VALIDATED |
| RECOMMENDATION_VALIDATED | PENDING_HUMAN_APPROVAL |
| PENDING_HUMAN_APPROVAL | APPROVED or REJECTED |
| APPROVED | EXECUTION_IN_PROGRESS |
| EXECUTION_IN_PROGRESS | COMPLETED |

---

# Design Decisions

- Every state transition is persisted in PostgreSQL.
- Every transition generates an audit event.
- The workflow supports retries from recoverable failure states.
- Duplicate Workday events are detected through idempotency before creating a new review.
- Access changes can only be executed after human approval.
- The state machine provides a complete history of the review lifecycle for compliance and troubleshooting.