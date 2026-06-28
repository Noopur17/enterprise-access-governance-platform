import { Module } from '@nestjs/common';
import { LlmRecommendationService } from './services/llm-recommendation.service';

@Module({
  providers: [LlmRecommendationService],
  exports: [LlmRecommendationService],
})
export class AiRecommendationModule {}