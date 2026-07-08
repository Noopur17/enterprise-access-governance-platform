# Technical Implementation Brief — Lifecycle-Sync

## 1. Policy Retrieval, Chunking & Metadata

Ingestion: PDFs in GCS (`gs://lifecyclesync-policy-docs/...`) → imported into Vertex AI RAG Engine corpus (`VERTEX_RAG_CORPUS_ID`).
Chunking/embedding/indexing: handled internally by Vertex AI RAG Engine, a higher-level managed layer than raw Vertex AI Vector Search.
Layering decision: RAG Engine swallows parsing, chunking, embedding, and index maintenance — no custom ingestion job to write, test, or keep in sync. Trade-off: less control over exact chunk boundaries than a hand-rolled pipeline (parse → section-split → chunk → embed → upsert) would give, in exchange for a much smaller operational surface. Revisit with a custom pipeline on top of Vertex AI Vector Search if chunk-boundary precision becomes a measured problem against real policy documents.

**Step 1:** Build retrieval query (`PolicyIntelligenceService.buildPolicyRetrievalQuery`) — natural-language sentence, not JSON:
```
Find access control policy requirements for an employee role transfer.
Old department: {old}. Old cost center: {old_cc}.
New department: {new}. New cost center: {new_cc}.
Current active entitlements: {system}:{key}:{level}, ...
Return policies that explain which entitlements should be removed, kept, or added.
```
Reason: policy docs are prose; prose query embeds/matches better than a structured blob.

**Step 2:** Call Vertex (`VertexRagService.retrievePolicyChunks`) — `POST .../v1beta1/{parent}:retrieveContexts`, `similarityTopK: 3`, auth via `GoogleAuth` (`cloud-platform` scope, no API keys in code).

**Step 3:** Extract citation metadata from each returned chunk (regex, post-retrieval):
- `sectionId`: `/Section\s+([0-9.]+)/i` → e.g. `"14.4"`
- `policyVersion`: `/v20[0-9]{2}\.[0-9]+/i` → e.g. `"v2026.2"`

Paired with `sourceUri` + Vertex's `similarityScore` → `RetrievedPolicyChunk`.
Why: lets every `policyCitation` be checked against an exact, versioned section (used in §3) instead of trusting the LLM's citation blind.

**Step 4:** Local dev path — `VERTEX_RAG_MOCK_ENABLED=true` returns a fixture chunk, no live GCP creds needed for demo.

**Alternative approach:** custom pipeline on Vertex AI Vector Search — layout-aware parse (e.g. Unstructured API) → section split → LLM-tagged metadata → semantic chunking → self-managed embedding/upsert. More control over chunk boundaries, more code to own. Valid choice at a lower abstraction layer — not implemented here because RAG Engine's managed retrieval was sufficient for this system's grounding requirements.

## 2. Relational Schema: Idempotency & Audit

**Step 1 — Idempotent ingestion:** `RoleChangeEvent.eventId` unique. `RoleChangeIngestionService` creates `RoleChangeEvent` + `ProcessingJob` (also unique `eventId`) in one Prisma transaction. Retry → `P2002` violation → caught, returned as `DUPLICATE_ACCEPTED`, not an error. Safe by construction, not by check-then-insert (which would race).

**Step 2 — Durable queue:** `ProcessingJob` fields — `status` (`PENDING/PROCESSING/COMPLETED/FAILED`), `attempts`, `maxAttempts` (default 3), `lastError`, `nextRunAt`. `RoleChangeJobProcessorService` polls every 5s, claims via conditional `updateMany({ where: { id, status: 'PENDING' } })` — the `WHERE status='PENDING'` is what makes claiming atomic across workers.

**Step 3 — Backoff:** `min(60, attempts² × 5)` seconds. Attempt 2 → 20s, attempt 3 → 45s, capped 60s. After `maxAttempts` → `FAILED`, stops auto-retrying (visible for manual replay, not silently dropped).

**Step 4 — Audit log (append-only):** `AuditLog` — `traceId`, `actor`, `action`, `entityType`, `entityId`, `details` (JSON), `createdAt`, optional `accessReviewId` FK. Indexed `[traceId]`, `[entityType, entityId]`. Every transition (review created → recommendations generated → human decision → execution tasks created) inserts a row. Nothing updated or deleted.

**Step 5 — Lifecycle state:** `AccessReviewRequest.status`: `PENDING_RECOMMENDATION → PENDING_APPROVAL → APPROVED/REJECTED → EXECUTION_PENDING`. Direct query, not reconstructed from logs.

## 3. Rate-Limit Boundaries & LLM Evaluation Metrics

**Step 1 — Absorb burst at ingestion:** Okta/Salesforce cap 60 req/min; restructures burst up to 300/min. `WorkdayWebhookController` → `202 Accepted` always, regardless of downstream capacity. Rate limit enforced only at execution, never at ingestion.

**Step 2 — Windowed counter (Postgres, not in-memory):** `DownstreamRateLimitWindow` — `systemName`, `windowStart`, `requestCount`, unique+indexed `[systemName, windowStart]`. `DownstreamRateLimiterService` increments via conditional `updateMany` guarded by `requestCount < 60` — guard = race-safe across concurrent workers.

**Step 3 — Graceful saturation:** window full → `ExecutionTask` stays `PENDING`, retried next window. Full queue = delayed, not failed.

**Step 4 — LLM eval metrics, written at the call site:** `LlmEvaluationMetric` — `reviewId`, `provider`, `modelName`, `latencyMs`, `inputTokens`, `outputTokens`, `estimatedCostUsd`, `groundingScore`, `schemaValid`, indexed `reviewId`. Written inside `LlmRecommendationService.generate()` itself — same call that produces the recommendation, can't drift out of sync.

**Step 5 — Grounding check:** `policyCitation` matched against `sectionId`s actually retrieved (§1, Step 3). No match → `NEEDS_REVIEW`, not `SUPPORTED`. Deterministic string-match, not LLM-as-judge — cheaper, reproducible, no second model call. False "SUPPORTED" is the failure mode to avoid here.

**Step 6 — PII handling:** `maskEmployeeId`/`maskCostCenter` mask at the log-write point, not a downstream scrub. No window where raw PII sits in logs.