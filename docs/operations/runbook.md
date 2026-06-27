# Operations Runbook

## Failure Handling

- Duplicate webhook: return existing event status
- Vector search unavailable: mark review as policy_retrieval_failed
- LLM unavailable: retry with exponential backoff
- Downstream access API rate-limited: queue and throttle
- Execution failure: create remediation task and audit record

## SLO Targets

- Webhook acknowledgement: < 500 ms
- Recommendation generation p95: < 60 seconds
- Dashboard page load p95: < 2 seconds
- Execution task audit completeness: 100%
