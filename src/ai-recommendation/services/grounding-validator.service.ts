import { Injectable } from '@nestjs/common';
import { LlmRecommendationResponse } from '../schemas/llm-recommendation.schema';

@Injectable()
export class GroundingValidatorService {
  validateGrounding(input: {
    recommendations: LlmRecommendationResponse;
    policyEvidence: { sectionId: string; policyVersion: string; text: string }[];
  }) {
    return input.recommendations.recommendations.map((item) => {
      const isCitationSupported = input.policyEvidence.some((policy) =>
        item.policyCitation.includes(policy.sectionId),
      );

      return {
        ...item,
        groundingScore: isCitationSupported ? 1.0 : 0.2,
        groundingStatus: isCitationSupported ? 'SUPPORTED' : 'NEEDS_REVIEW',
      };
    });
  }
}