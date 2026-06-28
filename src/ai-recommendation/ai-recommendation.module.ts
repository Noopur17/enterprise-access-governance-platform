import { Module } from '@nestjs/common';
import { GroundingValidatorService } from './services/grounding-validator.service';
import { LlmRecommendationService } from './services/llm-recommendation.service';
import { MockLlmProviderService } from './services/mock-llm-provider.service';
import { PromptBuilderService } from './services/prompt-builder.service';

@Module({
  providers: [
    PromptBuilderService,
    MockLlmProviderService,
    GroundingValidatorService,
    LlmRecommendationService,
  ],
  exports: [LlmRecommendationService],
})
export class AiRecommendationModule {}