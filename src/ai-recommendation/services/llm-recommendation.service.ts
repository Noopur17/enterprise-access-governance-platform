import { Injectable, Logger } from '@nestjs/common';
import { EmployeeEntitlement } from '../../access-governance/services/entitlement.service';
import { PolicyChunk } from '../../policy-intelligence/services/policy-intelligence.service';
import { GroundingValidatorService } from './grounding-validator.service';
import { MockLlmProviderService } from './mock-llm-provider.service';
import { PromptBuilderService } from './prompt-builder.service';
import { LlmRecommendationResponseSchema } from '../schemas/llm-recommendation.schema';

@Injectable()
export class LlmRecommendationService {
  private readonly logger = new Logger(LlmRecommendationService.name);

  constructor(
    private readonly promptBuilder: PromptBuilderService,
    private readonly llmProvider: MockLlmProviderService,
    private readonly groundingValidator: GroundingValidatorService,
  ) {}

  async generate(input: {
    roleChange: unknown;
    currentEntitlements: EmployeeEntitlement[];
    policyEvidence: PolicyChunk[];
  }) {
    const startedAt = Date.now();

    const prompt = this.promptBuilder.buildRecommendationPrompt({
      roleChange: input.roleChange,
      currentEntitlements: input.currentEntitlements,
      policyEvidence: input.policyEvidence,
    });

    const rawModelOutput = await this.llmProvider.generateStructuredOutput(prompt);

    const validated = LlmRecommendationResponseSchema.parse(rawModelOutput);

    const grounded = this.groundingValidator.validateGrounding({
      recommendations: validated,
      policyEvidence: input.policyEvidence,
    });

    this.logger.log(
      `ai_recommendation_completed latency_ms=${Date.now() - startedAt} recommendation_count=${grounded.length}`,
    );

    return grounded;
  }
}