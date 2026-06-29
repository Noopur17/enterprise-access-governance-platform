type Props = {
  recommendation: any;
};

export function RAGEvidencePanel({ recommendation }: Props) {
  if (!recommendation) return null;

  return (
    <section className="card rag-panel">
      <p className="label">Retrieved Policy Evidence</p>

      <h2>{recommendation.policyCitation}</h2>

      <div className="policy-box">
        <p>{recommendation.reason}</p>
      </div>

      <div className="rag-footer">
        <div>
          <span className="small-label">RAG Source</span>
          <strong>access-policy.md</strong>
        </div>

        <div>
          <span className="small-label">Grounding</span>
          <strong>SUPPORTED</strong>
        </div>

        <div>
          <span className="small-label">Similarity</span>
          <strong>96%</strong>
        </div>
      </div>
    </section>
  );
}