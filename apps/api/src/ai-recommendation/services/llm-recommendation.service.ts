import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
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

@Injectable()
export class LlmRecommendationService {
  private readonly logger = new Logger(LlmRecommendationService.name);

  async generate(input: {
    roleChange: unknown;
    currentEntitlements: EmployeeEntitlement[];
    policyEvidence: PolicyChunk[];
  }) {
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

    this.logger.log(
      `ai_recommendation_completed latency_ms=${Date.now() - startedAt} count=${grounded.length}`,
    );

    return grounded;
  }

  private buildPrompt(input: {
    roleChange: unknown;
    currentEntitlements: EmployeeEntitlement[];
    policyEvidence: PolicyChunk[];
  }): string {
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
          systemName: 'Market Analytics',
          entitlementKey: 'MARKET_ANALYTICS_READ',
          action: 'KEEP',
          reason:
            'Read-only market analysis access may be retained according to the retrieved policy.',
          policyCitation: 'v2026.2 Section 14.4',
          confidence: 0.86,
        },
        {
          systemName: 'Collaboration Platform',
          entitlementKey: 'PRODUCT_COLLAB_BASELINE',
          action: 'ADD',
          reason:
            'Product Management & Marketing employees require baseline collaboration access.',
          policyCitation: 'v2026.2 Section 14.4',
          confidence: 0.91,
        },
      ],
    };
  }
}