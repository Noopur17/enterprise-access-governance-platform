# Domain Events

## Overview

The Enterprise Access Governance Platform is designed as an event-driven system.

Instead of services directly calling each other, important business actions are represented as domain events. This makes the platform easier to extend, test, audit, and scale.

---

# Event Flow

```text
Workday Role Change
        │
        ▼
RoleChangeReceived
        │
        ▼
RoleChangeValidated
        │
        ▼
AccessReviewCreated
        │
        ▼
CurrentEntitlementsRetrieved
        │
        ▼
RelevantPoliciesRetrieved
        │
        ▼
RecommendationGenerated
        │
        ▼
RecommendationValidated
        │
        ▼
HumanReviewRequested
        │
        ▼
ReviewApproved / ReviewRejected
        │
        ▼
ExecutionTasksCreated
        │
        ▼
AccessExecutionStarted
        │
        ▼
AccessExecutionCompleted
        │
        ▼
AuditRecordCreated
        │
        ▼
AccessReviewCompleted
```

---

# Event Definitions

## RoleChangeReceived

Published when Workday sends a role-change event.

Owner:

Employee Lifecycle Context

---

## RoleChangeValidated

Published after payload validation, signature verification, and idempotency checks.

---

## AccessReviewCreated

Represents the creation of a new access review workflow.

This becomes the primary business object for the remainder of the process.

---

## CurrentEntitlementsRetrieved

Published after retrieving the employee's active permissions from enterprise systems.

---

## RelevantPoliciesRetrieved

Published after the Policy Intelligence Service retrieves policy evidence from the vector index.

---

## RecommendationGenerated

Published after the Recommendation Engine generates policy-grounded recommendations.

Each recommendation contains:

- Action (KEEP / REMOVE / ADD)
- Reason
- Policy Citation
- Confidence Score

---

## RecommendationValidated

Represents successful schema validation and policy verification.

Invalid recommendations never proceed to human review.

---

## HumanReviewRequested

Signals that the review is ready for an IT administrator.

---

## ReviewApproved

Published when a reviewer approves the recommendation.

---

## ReviewRejected

Published when the reviewer rejects the recommendation.

---

## ExecutionTasksCreated

Represents creation of deterministic execution tasks.

Examples:

- Remove Salesforce Edit Access
- Add Product Collaboration Group
- Update Okta Membership

---

## AccessExecutionStarted

Published when downstream provisioning begins.

---

## AccessExecutionCompleted

Published after all approved access changes have completed successfully.

---

## AuditRecordCreated

Represents creation of immutable compliance evidence.

---

## AccessReviewCompleted

Represents the successful completion of the entire workflow.

---

# Design Principles

- Domain events represent business outcomes, not implementation details.
- Events are immutable.
- Every event is timestamped and traceable.
- Events may be replayed safely using idempotency keys.
- Services react to events instead of tightly coupling to each other.
- The AI model is not treated as a domain actor; it is an implementation detail inside the Recommendation Engine.