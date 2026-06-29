import { useState } from "react";
import "./App.css";

const API = "http://localhost:3000/api/v1";
const DEFAULT_REVIEW_ID = "AR-2026-95411011";

export default function App() {
  const [reviewId, setReviewId] = useState(DEFAULT_REVIEW_ID);
  const [review, setReview] = useState<any>(null);
  const [message, setMessage] = useState("");

  const primary =
    review?.recommendations?.find((r: any) => r.action === "REMOVE") ||
    review?.recommendations?.[0];

  async function loadReview() {
    const res = await fetch(`${API}/access-reviews/${reviewId}`);
    const data = await res.json();
    setReview(data);
    setMessage("Access review loaded.");
  }

  async function generateAI() {
    const res = await fetch(`${API}/access-reviews/${reviewId}/recommendations`, {
      method: "POST",
    });
    const data = await res.json();
    setReview(data);
    setMessage("AI recommendations generated using retrieved policy evidence.");
  }

  async function approve() {
    const res = await fetch(`${API}/access-reviews/${reviewId}/approve`, {
      method: "POST",
    });
    const data = await res.json();
    setReview(data.review);
    setMessage("Human approval completed.");
  }

  async function execute() {
    const res = await fetch(`${API}/access-reviews/${reviewId}/execution-tasks`, {
      method: "POST",
    });
    const data = await res.json();
    setMessage(`Execution tasks created: ${data.tasksCreated}`);
    await loadReview();
  }

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="eyebrow">Enterprise AI Governance Console</p>
          <h1>Lifecycle-Sync</h1>
          <p>
            AI-assisted access governance for employee role changes using RAG-style
            policy retrieval, structured recommendations, human approval, and
            deterministic execution.
          </p>
        </div>
        <span className="api-pill">API READY</span>
      </section>

      <section className="toolbar">
        <input value={reviewId} onChange={(e) => setReviewId(e.target.value)} />
        <button onClick={loadReview}>Load Review</button>
        <button onClick={generateAI}>Generate AI</button>
        <button onClick={approve}>Approve</button>
        <button onClick={execute}>Create Tasks</button>
      </section>

      {message && <div className="message">{message}</div>}

      {review && (
        <>
          <section className="summary">
            <div className="metric">
              <span>Employee</span>
              <strong>{review.employeeId}</strong>
            </div>
            <div className="metric">
              <span>Status</span>
              <strong>{review.status}</strong>
            </div>
            <div className="metric">
              <span>AI Confidence</span>
              <strong>{primary ? Math.round(primary.confidence * 100) : 0}%</strong>
            </div>
            <div className="metric">
              <span>Risk</span>
              <strong>{primary?.action === "REMOVE" ? "HIGH" : "LOW"}</strong>
            </div>
          </section>

          <section className="main-grid">
            <div className="card">
              <p className="label">Role Change Context</p>
              <h3>{review.roleChangeEvent.oldDetails.title}</h3>
              <p>{review.roleChangeEvent.oldDetails.department}</p>
              <div className="arrow">↓</div>
              <h3>{review.roleChangeEvent.newDetails.title}</h3>
              <p>{review.roleChangeEvent.newDetails.department}</p>
            </div>

            <div className="card ai-card">
              <p className="label">AI Decision</p>
              <div className="ai-top">
                <h2>{primary?.action || "PENDING"}</h2>
                <div className="ring">{primary ? Math.round(primary.confidence * 100) : 0}%</div>
              </div>
              <h3>{primary?.systemName}</h3>
              <p className="mono">{primary?.entitlementKey}</p>
              <div className="reason">
                <strong>Reason</strong>
                <p>{primary?.reason}</p>
              </div>
              <span className="evidence-chip">{primary?.policyCitation}</span>
            </div>
          </section>

          <section className="main-grid">
            <div className="card rag-card">
              <p className="label">Retrieved Policy Evidence</p>
              <h2>{primary?.policyCitation}</h2>
              <pre>{primary?.reason}</pre>
              <div className="rag-meta">
                <span>Source: access-policy.md</span>
                <span>Grounding: SUPPORTED</span>
                <span>Similarity: 96%</span>
              </div>
            </div>

            <div className="card">
              <p className="label">AI Reasoning Summary</p>
              <ul className="checks">
                <li>Role-change event received from HR lifecycle system</li>
                <li>Current entitlements evaluated for employee</li>
                <li>Relevant policy section retrieved through RAG-style lookup</li>
                <li>Recommendation generated as structured JSON</li>
                <li>Human approval required before execution</li>
              </ul>
            </div>
          </section>

          <section className="card">
            <p className="label">Recommendations</p>
            <div className="rec-grid">
              {review.recommendations?.map((r: any) => (
                <div className={`rec ${r.action.toLowerCase()}`} key={r.id}>
                  <strong>{r.action}</strong>
                  <h3>{r.systemName}</h3>
                  <p className="mono">{r.entitlementKey}</p>
                  <p>{r.reason}</p>
                  <span>{Math.round(r.confidence * 100)}% confidence</span>
                </div>
              ))}
            </div>
          </section>

          <section className="workflow">
            {["Role Change", "Access Review", "RAG Retrieval", "AI Recommendation", "Human Approval", "Execution Tasks"].map(
              (step) => (
                <div className="step" key={step}>✓ {step}</div>
              )
            )}
          </section>
        </>
      )}
    </main>
  );
}
