type Props = {
  recommendations: any[];
};

export function AIRecommendationPanel({ recommendations }: Props) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <section className="card ai-panel empty">
        <p className="label">AI Recommendation</p>
        <h2>No recommendations yet</h2>
        <p className="muted">
          Generate AI recommendations to analyze access risk, policy evidence,
          and least-privilege actions.
        </p>
      </section>
    );
  }

  const primary =
    recommendations.find((item) => item.action === "REMOVE") ||
    recommendations[0];

  return (
    <section className={`card ai-panel ${primary.action.toLowerCase()}`}>
      <div className="ai-header">
        <div>
          <p className="label">AI Recommendation</p>
          <h2>{primary.action} access</h2>
        </div>
        <div className="confidence-ring">
          {Math.round(primary.confidence * 100)}%
        </div>
      </div>

      <h3>{primary.systemName}</h3>
      <p className="mono">{primary.entitlementKey}</p>

      <div className="reason-box">
        <strong>Why AI recommended this</strong>
        <p>{primary.reason}</p>
      </div>

      <div className="evidence-pill">
        Grounded in {primary.policyCitation}
      </div>
    </section>
  );
}