import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "http://localhost:3000/api/v1";

type ReviewSummary = {
  reviewId: string;
  eventId: string;
  employeeId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  transitionType: string;
  oldTitle: string;
  oldDepartment: string;
  oldCostCenter: string;
  newTitle: string;
  newDepartment: string;
  newCostCenter: string;
  recommendationCount: number;
  policyEvidenceCount: number;
  executionTaskCount: number;
  auditLogCount: number;
  primaryAction: string;
  primarySystem?: string | null;
  primaryConfidence?: number | null;
  latestDecision?: {
    decision: "APPROVE" | "REJECT";
    reviewerEmail: string;
    createdAt: string;
  } | null;
};

type Recommendation = {
  id: string;
  systemName: string;
  entitlementKey: string;
  action: "ADD" | "REMOVE" | "KEEP";
  reason: string;
  policyCitation: string;
  confidence: number;
};

type PolicyEvidence = {
  id: string;
  sectionId: string;
  policyVersion: string;
  sourceUri: string;
  similarityScore: number;
  text: string;
  provider: string;
};

type ApprovalDecision = {
  id: string;
  reviewerEmail: string;
  decision: "APPROVE" | "REJECT";
  comments?: string;
  createdAt: string;
};

type ExecutionTask = {
  id: string;
  systemName: string;
  entitlementKey: string;
  action: string;
  status: string;
  attempts: number;
  externalRequestId?: string;
  executedAt?: string;
};

type LlmMetric = {
  id: string;
  provider: string;
  modelName: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  groundingScore: number;
  schemaValid: boolean;
  createdAt: string;
};

type AuditLog = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  createdAt: string;
};

type AccessReview = {
  reviewId: string;
  eventId: string;
  employeeId: string;
  status: string;
  roleChangeEvent?: {
    transitionType: string;
    oldDetails: {
      title: string;
      department: string;
      costCenter: string;
    };
    newDetails: {
      title: string;
      department: string;
      costCenter: string;
    };
  };
  recommendations?: Recommendation[];
  policyEvidence?: PolicyEvidence[];
  approvalDecisions?: ApprovalDecision[];
  executionTasks?: ExecutionTask[];
  llmMetrics?: LlmMetric[];
  auditLogs?: AuditLog[];
};

export default function App() {
  const [requests, setRequests] = useState<ReviewSummary[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [review, setReview] = useState<AccessReview | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const latestDecision = useMemo(() => {
    const decisions = review?.approvalDecisions || [];
    return decisions.length ? decisions[decisions.length - 1] : undefined;
  }, [review]);

  const latestMetric = review?.llmMetrics?.[0];
  const firstEvidence = review?.policyEvidence?.[0];

  const recommendationCount = review?.recommendations?.length || 0;

  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const reviewIdFromUrl = params.get("reviewId");

  if (reviewIdFromUrl) {
    void loadReview(reviewIdFromUrl);
  } else {
    void loadRequests();
  }
}, []);

  async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  async function loadRequests() {
    try {
      setLoading(true);
      const data = await request<ReviewSummary[]>(`${API}/access-reviews`);
      setRequests(data);
      setMessage("Incoming access reviews loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }

  async function loadReview(reviewId: string) {
  try {
    setLoading(true);
    const data = await request<AccessReview>(`${API}/access-reviews/${reviewId}`);

    setSelectedReviewId(reviewId);
    setReview(data);
    setMessage("Access review loaded.");

    window.history.pushState({}, "", `?reviewId=${encodeURIComponent(reviewId)}`);
  } catch (error) {
    setMessage(error instanceof Error ? error.message : "Failed to load review.");
  } finally {
    setLoading(false);
  }
}

  async function generateAI() {
    if (!selectedReviewId) return;

    try {
      setLoading(true);
      const data = await request<AccessReview>(
        `${API}/access-reviews/${selectedReviewId}/recommendations`,
        { method: "POST" },
      );

      setReview(data);
      setMessage("AI recommendations generated and saved.");
      await loadRequests();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to generate AI.");
    } finally {
      setLoading(false);
    }
  }

  async function submitDecision(decision: "APPROVE" | "REJECT") {
    if (!selectedReviewId) return;

    try {
      setLoading(true);

      await request(`${API}/access-reviews/${selectedReviewId}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          decision,
          reviewerEmail: "admin@techglobal.example",
          comments:
            decision === "APPROVE"
              ? "Approved after reviewing policy evidence and recommendation confidence."
              : "Rejected because additional business justification is required.",
        }),
      });

      setMessage(`Human decision saved: ${decision}.`);
      await loadReview(selectedReviewId);
      await loadRequests();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Decision failed.");
    } finally {
      setLoading(false);
    }
  }

  async function createExecutionTasks() {
    if (!selectedReviewId) return;

    try {
      setLoading(true);

      const data = await request<{
        tasksCreated: number;
        existingTasks?: number;
        message?: string;
      }>(`${API}/access-reviews/${selectedReviewId}/execution-tasks`, {
        method: "POST",
      });

      setMessage(
        data.message ||
          `Execution tasks created: ${data.tasksCreated}. Existing tasks: ${
            data.existingTasks || 0
          }.`,
      );

      await loadReview(selectedReviewId);
      await loadRequests();

      setTimeout(() => {
        void loadReview(selectedReviewId);
      }, 2500);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to create execution tasks.",
      );
    } finally {
      setLoading(false);
    }
  }

 function backToList() {
  setSelectedReviewId(null);
  setReview(null);
  window.history.pushState({}, "", window.location.pathname);
  void loadRequests();
}

async function refreshCurrentReview() {
  if (!selectedReviewId) return;
  await loadReview(selectedReviewId);
}

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="eyebrow">Enterprise AI Governance Console</p>
          <h1>Lifecycle-Sync</h1>
          <p>
            Intelligent employee role-change access review using policy-grounded
            AI recommendations, human approval, audit logging, and deterministic
            execution.
          </p>
        </div>
      </section>

      {message && <div className="message">{message}</div>}

      {!selectedReviewId && (
        <LandingPage
          requests={requests}
          loading={loading}
          onRefresh={loadRequests}
          onSelect={loadReview}
        />
      )}

      {selectedReviewId && review && (
        <DetailPage
  review={review}
  recommendationCount={recommendationCount}
  firstEvidence={firstEvidence}
  latestDecision={latestDecision}
  latestMetric={latestMetric}
  loading={loading}
  onBack={backToList}
  onRefresh={refreshCurrentReview}
  onGenerateAI={generateAI}
  onApprove={() => submitDecision("APPROVE")}
  onReject={() => submitDecision("REJECT")}
  onCreateTasks={createExecutionTasks}
/>
      )}
    </main>
  );
}

function LandingPage({
  requests,
  loading,
  onRefresh,
  onSelect,
}: {
  requests: ReviewSummary[];
  loading: boolean;
  onRefresh: () => void;
  onSelect: (reviewId: string) => void;
}) {
  const pendingCount = requests.filter((item) =>
    ["PENDING_RECOMMENDATION", "PENDING_APPROVAL"].includes(item.status),
  ).length;

  const completedCount = requests.filter(
    (item) => item.status === "EXECUTION_COMPLETED",
  ).length;

  return (
    <>
      <section className="summary">
        <Metric label="Incoming Requests" value={String(requests.length)} />
        <Metric label="Pending Review" value={String(pendingCount)} />
        <Metric label="Completed" value={String(completedCount)} />
        <Metric label="Queue Type" value="Workday Role Changes" highlight />
      </section>

      <section className="card">
        <div className="section-header">
          <div>
            <p className="label">Incoming Access Review Requests</p>
            <h2>Role-change review queue</h2>
          </div>
          <button onClick={onRefresh} disabled={loading}>
            Refresh
          </button>
        </div>

        <div className="request-list">
          {requests.map((item) => (
            <button
              className="request-row"
              key={item.reviewId}
              onClick={() => onSelect(item.reviewId)}
            >
              <div>
                <strong>{item.employeeId}</strong>
                <p>
                  {item.oldDepartment} → {item.newDepartment}
                </p>
                <span className="mono">{item.reviewId}</span>
              </div>

              <div>
                <span className={`status-chip ${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
                <p>{item.primaryAction}</p>
              </div>

              <div>
                <span>{item.recommendationCount} recommendations</span>
                <p>{formatDate(item.createdAt)}</p>
              </div>
            </button>
          ))}

          {!requests.length && (
            <p className="muted">
              No access review requests found yet. Submit a Workday role-change
              webhook to create one.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function DetailPage({
  review,
  recommendationCount,
  firstEvidence,
  latestDecision,
  latestMetric,
  loading,
  onBack,
onRefresh,
onGenerateAI,
onApprove,
onReject,
onCreateTasks,
}: {
  review: AccessReview;
  recommendationCount: number;
  firstEvidence?: PolicyEvidence;
  latestDecision?: ApprovalDecision;
  latestMetric?: LlmMetric;
  loading: boolean;
  onBack: () => void;
  onGenerateAI: () => void;
  onApprove: () => void;
  onReject: () => void;
  onCreateTasks: () => void;
  onRefresh: () => void;
}) {
  return (
    <>
      <section className="toolbar">
  <button onClick={onBack}>← Back to Requests</button>
  <button onClick={onRefresh} disabled={loading}>
    Refresh Status
  </button>
  <button onClick={onGenerateAI} disabled={loading}>
    Generate AI
  </button>
        <button onClick={onApprove} disabled={loading}>
          Approve
        </button>
        <button onClick={onReject} disabled={loading}>
          Reject
        </button>
        <button onClick={onCreateTasks} disabled={loading}>
          Create Tasks
        </button>
      </section>

      <section className="summary">
        <Metric label="Review ID" value={review.reviewId} />
        <Metric label="Employee" value={review.employeeId} />
        <Metric label="Status" value={review.status} highlight />
        <Metric label="Recommendations" value={String(recommendationCount)} />
        <Metric
          label="Grounding"
          value={
            latestMetric
              ? `${Math.round(latestMetric.groundingScore * 100)}%`
              : "Pending"
          }
        />
      </section>

      <section className="card">
        <p className="label">Role Change Context</p>

        <div className="role-context-grid">
          <div className="role-box">
            <span>From</span>
            <h3>{review.roleChangeEvent?.oldDetails.title}</h3>
            <p>{review.roleChangeEvent?.oldDetails.department}</p>
            <code>{review.roleChangeEvent?.oldDetails.costCenter}</code>
          </div>

          <div className="role-arrow">→</div>

          <div className="role-box active">
            <span>To</span>
            <h3>{review.roleChangeEvent?.newDetails.title}</h3>
            <p>{review.roleChangeEvent?.newDetails.department}</p>
            <code>{review.roleChangeEvent?.newDetails.costCenter}</code>
          </div>
        </div>
      </section>

      <section className="main-grid">
        <div className="card rag-card">
          <p className="label">Retrieved Policy Evidence</p>
          <h2>
            {firstEvidence
              ? `${firstEvidence.policyVersion} Section ${firstEvidence.sectionId}`
              : "No evidence yet"}
          </h2>
          <p>{firstEvidence?.text}</p>
          <div className="rag-meta">
            <span>Provider: {firstEvidence?.provider || "Pending"}</span>
            <span>
              Similarity:{" "}
              {firstEvidence
                ? `${Math.round(firstEvidence.similarityScore * 100)}%`
                : "--"}
            </span>
            <span>{firstEvidence?.sourceUri}</span>
          </div>
        </div>

        <div className="card">
          <p className="label">Human Decision</p>
          {latestDecision ? (
            <>
              <h2>{latestDecision.decision}</h2>
              <p>
                <strong>Reviewer:</strong> {latestDecision.reviewerEmail}
              </p>
              <p>{latestDecision.comments}</p>
              <p className="muted">{formatDate(latestDecision.createdAt)}</p>
            </>
          ) : (
            <p className="muted">No human decision has been submitted yet.</p>
          )}
        </div>
      </section>

      <section className="card">
        <p className="label">AI Recommendations</p>
        <div className="rec-grid">
          {review.recommendations?.map((item) => (
            <div className={`rec ${item.action.toLowerCase()}`} key={item.id}>
              <strong>{item.action}</strong>
              <h3>{item.systemName}</h3>
              <p className="mono">{item.entitlementKey}</p>
              <p>{item.reason}</p>
              <span>{Math.round(item.confidence * 100)}% confidence</span>
            </div>
          ))}

          {!review.recommendations?.length && (
            <p className="muted">No AI recommendations generated yet.</p>
          )}
        </div>
      </section>

      <section className="main-grid">
        <div className="card">
          <p className="label">Execution Tasks</p>
          <div className="table">
            {(review.executionTasks || []).map((task) => (
              <div className="table-row" key={task.id}>
                <span>{task.systemName}</span>
                <span>{task.action}</span>
                <span className={`status-chip ${task.status.toLowerCase()}`}>
                  {task.status}
                </span>
              </div>
            ))}

            {!review.executionTasks?.length && (
              <p className="muted">No execution tasks created yet.</p>
            )}
          </div>
        </div>

        <div className="card">
          <p className="label">LLM Evaluation Metrics</p>
          {latestMetric ? (
            <div className="metric-list">
              <span>Provider: {latestMetric.provider}</span>
              <span>Model: {latestMetric.modelName}</span>
              <span>Latency: {latestMetric.latencyMs} ms</span>
              <span>Input Tokens: {latestMetric.inputTokens}</span>
              <span>Output Tokens: {latestMetric.outputTokens}</span>
              <span>
                Estimated Cost: ${latestMetric.estimatedCostUsd.toFixed(6)}
              </span>
              <span>Schema Valid: {latestMetric.schemaValid ? "Yes" : "No"}</span>
            </div>
          ) : (
            <p className="muted">Metrics will appear after AI generation.</p>
          )}
        </div>
      </section>

      <section className="card">
        <p className="label">Audit Timeline</p>
        <div className="timeline">
          {(review.auditLogs || []).map((log) => (
            <div className="timeline-item" key={log.id}>
              <div>
                <strong>{log.action}</strong>
                <p>
                  {log.actor} · {log.entityType}
                </p>
              </div>
              <span>{formatDate(log.createdAt)}</span>
            </div>
          ))}

          {!review.auditLogs?.length && (
            <p className="muted">No audit events available yet.</p>
          )}
        </div>
      </section>
    </>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={highlight ? "metric highlight" : "metric"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}