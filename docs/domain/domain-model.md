# Domain Model

## Product

**Enterprise Access Governance Platform (EAGP)**

## Workflow

**Lifecycle-Sync: Role Change Intelligence Workflow**

---

## Purpose

The Enterprise Access Governance Platform ensures employees always have the appropriate access based on their role, department, and organizational policies.

Lifecycle-Sync is the workflow responsible for automatically reviewing access whenever an employee's role changes.

---

# Core Aggregate

The primary aggregate root is **AccessReviewRequest**.

A RoleChangeEvent initiates the workflow, but the business process revolves around reviewing, approving, and executing access changes.

---

# Core Domain Entities

## Employee

Represents the employee whose access is being reviewed.

---

## RoleChangeEvent

Represents a role transition received from Workday.

Example:

- Department Change
- Promotion
- Transfer
- Cost Center Change

---

## AccessReviewRequest

Represents an access review initiated because of a lifecycle event.

This is the central business entity in the system.

---

## EmployeeEntitlement

Represents an active permission or entitlement assigned to an employee.

Examples include:

- Salesforce Opportunity Edit
- Okta Administrator
- SAP Finance Read
- Jira Project Admin

---

## RecommendationItem

Represents an AI-generated recommendation.

Possible actions:

- KEEP
- REMOVE
- ADD

Every recommendation must include:

- Reason
- Policy Citation
- Confidence Score

---

## ApprovalDecision

Represents the decision made by a human reviewer.

Possible outcomes:

- Approved
- Rejected

---

## ExecutionTask

Represents a deterministic task executed after approval.

Examples include:

- Remove Salesforce Edit Access
- Add Product Collaboration Group
- Update Okta Group Membership

---

## AuditLog

Represents immutable evidence for compliance and traceability.

---

# Design Principles

- PostgreSQL is the system of record.
- AI generates recommendations only.
- Humans approve recommendations.
- Deterministic services execute approved changes.
- Every action is fully auditable.