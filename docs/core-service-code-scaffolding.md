# Core Service Code Scaffolding — Lifecycle-Sync

## 1. Structured LLM Output Validation with Policy-Grounding Guardrail

`ai-recommendation/services/llm-recommendation.service.ts`

Demonstrates: schema-validated LLM function/tool-calling payload validation, plus a grounding check that refuses to trust the model's own citation.

```typescript
const LlmRecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      systemName: z.string(),
      entitlementKey: z.string(),
      action: z.enum(['KEEP', 'REMOVE', 'ADD']),
      reason: z.string(),
      policyCitation: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

@Injectable()
export class LlmRecommendationService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(input: RecommendationInput) {
    const startedAt = Date.now();
    const prompt = this.buildPrompt(input); // explicit guardrail instructions embedded
    const rawOutput = await this.callStructuredModel(prompt);

    // Hard boundary: nothing proceeds if the shape doesn't match.
    const validated = LlmRecommendationSchema.parse(rawOutput);

    // Grounding check: every citation must trace to a chunk we actually retrieved.
    const grounded = validated.recommendations.map((item) => {
      const supported = input.policyEvidence.some((p) =>
        item.policyCitation.includes(p.sectionId),
      );
      return { ...item, groundingStatus: supported ? 'SUPPORTED' : 'NEEDS_REVIEW' };
    });

    await this.prisma.llmEvaluationMetric.create({
      data: {
        reviewId: input.reviewId,
        latencyMs: Date.now() - startedAt,
        groundingScore: this.averageGrounding(grounded),
        schemaValid: true,
        // ...tokens, estimatedCostUsd
      },
    });

    return grounded; // stops here — written as a recommendation, never executed.
  }
}
```

## 2. Durable Async Processing Loop with Idempotent Claim + Exponential Backoff

`employee-lifecycle/services/role-change-job-processor.service.ts`

Demonstrates: the asynchronous validation loop required by the exercise — a durable queue worker that claims jobs safely across concurrent instances and backs off on failure.

```typescript
@Injectable()
export class RoleChangeJobProcessorService implements OnModuleInit {
  onModuleInit() {
    setInterval(() => void this.processNextPendingJob(), 5000);
  }

  async processNextPendingJob(): Promise<void> {
    const job = await this.prisma.processingJob.findFirst({
      where: { status: 'PENDING', nextRunAt: { lte: new Date() } },
      orderBy: { createdAt: 'asc' },
    });
    if (!job) return;

    // Conditional update = single-claim guarantee across concurrent workers.
    const claimed = await this.prisma.processingJob.updateMany({
      where: { id: job.id, status: 'PENDING' },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });
    if (claimed.count === 0) return; // another worker already claimed it

    try {
      const result = await this.accessReviewService
        .createReviewForExistingRoleChangeEvent(job.eventId);
      await this.prisma.processingJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED' },
      });
    } catch (error) {
      const nextAttempts = job.attempts + 1;
      const shouldRetry = nextAttempts < job.maxAttempts;
      await this.prisma.processingJob.update({
        where: { id: job.id },
        data: {
          status: shouldRetry ? 'PENDING' : 'FAILED',
          lastError: (error as Error).message,
          nextRunAt: this.backoff(nextAttempts), // capped exponential
        },
      });
    }
  }

  private backoff(attempts: number): Date {
    const seconds = Math.min(60, attempts * attempts * 5);
    return new Date(Date.now() + seconds * 1000);
  }
}
```

## 3. Human-in-the-Loop State Transition (Deterministic Boundary Enforcement)

`access-governance/services/access-review.service.ts`

Demonstrates: the control boundary the exercise's "Deterministic Boundaries" guardrail requires — an `ExecutionTask` can only ever be created downstream of an explicit human `ApprovalDecision`, never from the recommendation path directly.

```typescript
async submitHumanDecision(reviewId: string, decisionDto: SubmitReviewDecisionDto) {
  const review = await this.getReviewById(reviewId);
  if (review.status !== 'PENDING_APPROVAL') {
    throw new BadRequestException(`Review ${reviewId} is not ready for human decision.`);
  }

  const newStatus = decisionDto.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

  await this.prisma.$transaction(async (tx) => {
    await tx.accessReviewRequest.update({ where: { reviewId }, data: { status: newStatus } });
    await tx.approvalDecision.create({
      data: { reviewId, reviewerEmail: decisionDto.reviewerEmail,
              decision: decisionDto.decision, comments: decisionDto.comments },
    });
    await tx.auditLog.create({
      data: { traceId: review.eventId, actor: decisionDto.reviewerEmail,
              action: `ACCESS_REVIEW_${newStatus}`, entityType: 'ACCESS_REVIEW',
              entityId: reviewId, accessReviewId: review.id,
              details: { previousStatus: review.status, newStatus } },
    });
  });
  // ExecutionTask rows are only ever created downstream of APPROVED —
  // see createExecutionTasks(), never called from the recommendation path.
}
```