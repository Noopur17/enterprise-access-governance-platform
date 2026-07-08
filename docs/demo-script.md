# Lifecycle-Sync Demo Script

## Demo Goal

Show an end-to-end employee role-change access review workflow:

```text
Workday event → access review → AI recommendation → human approval → execution tasks → audit trail
```

The key message:

> AI recommends. Humans approve. Backend workers execute.

The AI layer never directly grants, removes, or mutates enterprise access.

---

## 1. Pre-Demo Checklist

Before starting the demo, confirm both apps are running.

### Backend

```bash
cd apps/api
npm run start:dev
```

Expected backend URL:

```text
http://localhost:3000
```

### Frontend

```bash
cd apps/admin-portal
npm run dev
```

Expected frontend URL:

```text
http://localhost:5173
```

### Database

Confirm PostgreSQL is running and the backend `.env` has:

```env
DATABASE_URL=postgresql://eagp:eagp@localhost:5432/eagp
VERTEX_RAG_MOCK_ENABLED=true
```

---

## 2. Opening Talk Track

Use this explanation when starting:

```text
This project is Lifecycle-Sync, an intelligent employee role-change access review platform.

The business problem is stale access after employee transfers. When someone moves from one role, department, or cost center to another, their old access can remain active across enterprise systems.

This demo shows how a Workday-style role-change event can trigger an access review. The system retrieves current entitlements, uses policy evidence to generate AI-assisted recommendations, requires human approval, and only then creates deterministic execution tasks.

The most important design boundary is that the AI does not execute access changes. It only recommends. A human approves, and backend workers execute.
```

---

## 3. Demo Step 1: Show Incoming Review Queue

Open:

```text
http://localhost:5173
```

Show the landing page.

Talk track:

```text
This is the IT administrator queue. Each row represents an employee role-change access review created from an HR lifecycle event.

The admin can see the employee, transition type, old role, new role, status, and review progress.
```

Point out:

```text
Status
Employee ID
Old role
New role
Recommendation count
Execution task count
Audit count
```

---

## 4. Demo Step 2: Select a Pending Review

Click a review with status:

```text
PENDING_RECOMMENDATION
```

Talk track:

```text
I am opening a specific access review. This page shows the full lifecycle for one employee transition.

Here we can see the employee moved from the old role and department into the new role and department.
```

Point out:

```text
Review ID
Employee ID
Current status
Old role context
New role context
```

---

## 5. Demo Step 3: Generate AI Recommendations

Click:

```text
Generate AI
```

Talk track:

```text
Now the backend retrieves the employee's current entitlements from PostgreSQL and retrieves relevant policy evidence.

The recommendation service then generates structured ADD, REMOVE, or KEEP recommendations.

Before anything is saved, the output is validated against a strict schema. This prevents malformed AI output from entering the workflow.
```

Expected result:

```text
Recommendations appear
Policy evidence appears
LLM metrics appear
Review moves to PENDING_APPROVAL
```

---

## 6. Demo Step 4: Explain Policy Evidence

Point to the policy evidence section.

Talk track:

```text
This section shows the policy evidence used to support the recommendation.

In production, this boundary would retrieve chunks from Vertex AI RAG or Vector Search over policy PDFs.

For the local demo, the policy evidence is mocked so the project can run without cloud credentials, but the service boundary is the same.
```

Important explanation:

```text
The policy evidence is not the AI answer. It is the source material used to ground the recommendation.
```

---

## 7. Demo Step 5: Explain Recommendations

Point to the recommendation cards.

Talk track:

```text
Each recommendation includes the target system, entitlement key, action, reason, policy citation, and confidence score.

The possible actions are ADD, REMOVE, and KEEP.

REMOVE means access should be removed after approval.
ADD means new access should be granted after approval.
KEEP means the existing access can remain and no execution task is required.
```

Point out:

```text
System name
Entitlement key
Action
Reason
Policy citation
Confidence
```

---

## 8. Demo Step 6: Explain LLM Metrics

Point to the LLM evaluation metrics.

Talk track:

```text
For governance, every recommendation run records evaluation metrics.

We track latency, token estimates, estimated cost, grounding score, model/provider path, and whether the response passed schema validation.

This helps monitor quality, cost, and reliability of the AI layer.
```

Point out:

```text
Latency
Input tokens
Output tokens
Estimated cost
Grounding score
Schema valid
```

---

## 9. Demo Step 7: Human Approval

Click:

```text
Approve
```

Talk track:

```text
At this point, the AI has only generated recommendations.

The administrator is now making the actual governance decision. Approval means the admin accepts this recommendation report and allows deterministic execution tasks to be created.

If the admin rejects it, the workflow stops and no execution tasks are created.
```

Expected status:

```text
APPROVED
```

Important clarification:

```text
We are not approving the Workday event. We are approving the AI-generated access review recommendation report.
```

---

## 10. Demo Step 8: Create Execution Tasks

Click:

```text
Create Execution Tasks
```

Talk track:

```text
Now that the review is approved, the backend creates deterministic execution tasks.

Only ADD and REMOVE recommendations create execution tasks. KEEP recommendations are no-op decisions.

The AI is not involved in this step. This is backend-controlled execution logic.
```

Expected result:

```text
Execution tasks appear
Status may initially show PENDING or SUCCEEDED
```

---

## 11. Demo Step 9: Refresh Status

Click:

```text
Refresh Status
```

Talk track:

```text
The execution worker processes the pending tasks through the downstream adapter boundary.

For this local demo, the downstream adapter is mocked. In production, this same boundary could connect to Okta, Salesforce, or another entitlement system.
```

Expected final status:

```text
EXECUTION_COMPLETED
```

Expected task status:

```text
SUCCEEDED
```

---

## 12. Demo Step 10: Show Audit Timeline

Scroll to the audit timeline.

Talk track:

```text
The audit timeline gives a complete record of the lifecycle.

We can see when the review was created, when AI recommendations were generated, when a human approved the review, when execution tasks were created, and when execution completed.

This creates a compliance trail from HR event ingestion to final access execution status.
```

Example audit actions:

```text
ACCESS_REVIEW_CREATED
AI_RECOMMENDATIONS_GENERATED
ACCESS_REVIEW_APPROVED
EXECUTION_TASKS_CREATED
EXECUTION_TASK_SUCCEEDED
ACCESS_REVIEW_EXECUTION_COMPLETED
```

---

## 13. Optional: Create a New Review from Sample Event

If the queue needs a fresh request, send the sample Workday event.

From repo root:

```bash
curl -X POST http://localhost:3000/api/v1/webhooks/workday/role-change \
  -H "Content-Type: application/json" \
  -d @samples/events/workday-role-change.json
```

Talk track:

```text
This simulates Workday sending a role-change event into the platform.

The backend validates the payload, checks idempotency using the event ID, saves the event, and creates a durable processing job.
```

If the event already exists, update the `event_id` in the sample JSON before sending again.

---

## 14. Backup API Commands

### List Reviews

```bash
curl http://localhost:3000/api/v1/access-reviews
```

### Load One Review

Replace the review ID:

```bash
curl http://localhost:3000/api/v1/access-reviews/AR-REVIEW-ID
```

### Generate Recommendations

```bash
curl -X POST http://localhost:3000/api/v1/access-reviews/AR-REVIEW-ID/recommendations
```

### Approve Review

```bash
curl -X POST http://localhost:3000/api/v1/access-reviews/AR-REVIEW-ID/decision \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "APPROVE",
    "reviewerEmail": "admin@techglobal.example",
    "comments": "Approved after reviewing policy evidence and recommendation confidence."
  }'
```

### Create Execution Tasks

```bash
curl -X POST http://localhost:3000/api/v1/access-reviews/AR-REVIEW-ID/execution-tasks
```

---

## 15. Key Design Points to Mention

Use these points during Q&A.

### AI Boundary

```text
The AI only produces recommendations. It does not mutate access. Execution is handled by deterministic backend workers after human approval.
```

### Human-in-the-Loop

```text
A human administrator approves or rejects the recommendation report before execution tasks are created.
```

### Idempotency

```text
The Workday event ID is used as the idempotency key, so duplicate webhook retries do not create duplicate access reviews.
```

### Policy Grounding

```text
Recommendations are tied to policy evidence and citations. The system stores the retrieved evidence for auditability.
```

### Rate Limits

```text
Execution is task-based so downstream systems like Okta or Salesforce can be protected with rate-limit windows, retries, and backoff.
```

### LLM Metrics

```text
The system records latency, token estimates, cost estimate, grounding score, and schema validation result for every recommendation run.
```

### Local Demo vs Production

```text
The local demo mocks Vertex RAG and downstream adapters for reproducibility. The architecture keeps clean service boundaries so those mocks can be replaced with production integrations.
```

---

## 16. Closing Talk Track

Use this at the end:

```text
This demo shows a complete governed AI workflow.

The system starts with a Workday-style lifecycle event, creates an access review, uses policy-grounded AI to recommend access changes, requires human approval, and then executes through deterministic backend tasks.

The strongest part of the design is the control boundary: AI assists the administrator, but it never directly controls enterprise access.
```

---

## 17. Expected Final Demo State

At the end of a successful demo, show:

```text
Review status: EXECUTION_COMPLETED
Execution tasks: SUCCEEDED
Recommendations: ADD / REMOVE / KEEP
Human decision: APPROVE
Audit timeline: complete
LLM metrics: recorded
```