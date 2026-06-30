import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../common/database/prisma.service';
import { EmployeeEntitlement } from '../../access-governance/services/entitlement.service';
import { PolicyChunk } from '../../policy-intelligence/services/policy-intelligence.service';

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

type RecommendationInput = {
  reviewId: string;
  roleChange: unknown;
  currentEntitlements: EmployeeEntitlement[];
  policyEvidence: PolicyChunk[];
};

@Injectable()
export class LlmRecommendationService {
  private readonly logger = new Logger(LlmRecommendationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generate(input: RecommendationInput) {
    const startedAt = Date.now();

    const prompt = this.buildPrompt(input);
    const rawOutput = await this.mockGeminiStructuredCall(prompt);
    const validated = LlmRecommendationSchema.parse(rawOutput);

    const grounded = validated.recommendations.map((item) => {
      const supported = input.policyEvidence.some((policy) =>
        item.policyCitation.includes(policy.sectionId),
      );

      return {
        ...item,
        groundingScore: supported ? 1.0 : 0.25,
        groundingStatus: supported ? 'SUPPORTED' : 'NEEDS_REVIEW',
      };
    });

    const latencyMs = Date.now() - startedAt;
    const inputTokens = this.estimateTokens(prompt);
    const outputTokens = this.estimateTokens(JSON.stringify(rawOutput));
    const groundingScore = this.calculateAverageGroundingScore(grounded);

    await this.prisma.llmEvaluationMetric.create({
      data: {
        reviewId: input.reviewId,
        provider:
          process.env.VERTEX_RAG_MOCK_ENABLED === 'true'
            ? 'vertex-ai-rag-mock'
            : 'vertex-ai',
        modelName: 'gemini-structured-recommendation',
        latencyMs,
        inputTokens,
        outputTokens,
        estimatedCostUsd: this.estimateCostUsd(inputTokens, outputTokens),
        groundingScore,
        schemaValid: true,
      },
    });

    this.logger.log(
      `ai_recommendation_completed review=${input.reviewId} latency_ms=${latencyMs} count=${grounded.length} grounding_score=${groundingScore}`,
    );

    return grounded;
  }

  private buildPrompt(input: RecommendationInput): string {
    return JSON.stringify(
      {
        task: 'Generate access review recommendations for an employee role change.',
        guardrails: [
          'Return structured JSON only.',
          'Allowed actions are KEEP, REMOVE, ADD.',
          'Every recommendation must cite policy evidence.',
          'The AI must not execute access changes.',
          'Recommendations require human approval before execution.',
        ],
        input,
      },
      null,
      2,
    );
  }

  private async mockGeminiStructuredCall(_prompt: string): Promise<unknown> {
    return {
      recommendations: [
        {
          systemName: 'Salesforce',
          entitlementKey: 'SALESFORCE_OPPORTUNITY_EDIT',
          action: 'REMOVE',
          reason:
            'Employee moved from CC-SALES-01 into Product Management & Marketing. Policy requires direct write access to customer transactional registries to be removed.',
          policyCitation: 'v2026.2 Section 14.4',
          confidence: 0.94,
        },
        {
          systemName: 'Salesforce',
          entitlementKey: 'SALESFORCE_FORECAST_OVERRIDE',
          action: 'REMOVE',
          reason:
            'Sales forecasting override access is tied to Global Sales responsibilities and is not required for the new Product Management & Marketing role.',
          policyCitation: 'v2026.2 Section 14.4',
          confidence: 0.9,
        },
        {
          systemName: 'Revenue Reporting',
          entitlementKey: 'REVENUE_PIPELINE_WRITE',
          action: 'REMOVE',
          reason:
            'Write access to revenue pipeline records should be removed after transfer out of Global Sales to reduce conflict-of-interest and stale privilege risk.',
          policyCitation: 'v2026.2 Section 14.4',
          confidence: 0.88,
        },
        {
          systemName: 'Market Analytics',
          entitlementKey: 'MARKET_ANALYTICS_READ',
          action: 'KEEP',
          reason:
            'Read-only market analysis access may be retained because it supports Product Management & Marketing responsibilities without allowing transactional changes.',
          policyCitation: 'v2026.2 Section 14.4',
          confidence: 0.86,
        },
        {
          systemName: 'Product Telemetry',
          entitlementKey: 'PRODUCT_TELEMETRY_READ',
          action: 'KEEP',
          reason:
            'Standard product telemetry visibility is appropriate for the new department and does not create direct customer transaction write risk.',
          policyCitation: 'v2026.2 Section 14.4',
          confidence: 0.89,
        },
        {
          systemName: 'Collaboration Platform',
          entitlementKey: 'PRODUCT_COLLAB_BASELINE',
          action: 'ADD',
          reason:
            'Product Management & Marketing employees require baseline access to common collaboration spaces for launch planning and product communication.',
          policyCitation: 'v2026.2 Section 14.4',
          confidence: 0.91,
        },
        {
          systemName: 'Launch Calendar',
          entitlementKey: 'PRODUCT_LAUNCH_CALENDAR_EDIT',
          action: 'ADD',
          reason:
            'The new Product Marketing Manager role requires access to update product launch milestones and go-to-market planning timelines.',
          policyCitation: 'v2026.2 Section 14.4',
          confidence: 0.84,
        },
      ],
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private calculateAverageGroundingScore(
    recommendations: Array<{ groundingScore: number }>,
  ): number {
    if (recommendations.length === 0) {
      return 0;
    }

    const total = recommendations.reduce(
      (sum, item) => sum + item.groundingScore,
      0,
    );

    return Number((total / recommendations.length).toFixed(2));
  }

  private estimateCostUsd(inputTokens: number, outputTokens: number): number {
    const estimatedInputCost = inputTokens * 0.000000125;
    const estimatedOutputCost = outputTokens * 0.000000375;

    return Number((estimatedInputCost + estimatedOutputCost).toFixed(6));
  }
}