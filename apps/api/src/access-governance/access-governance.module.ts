import { Module } from '@nestjs/common';
import { AiRecommendationModule } from '../ai-recommendation/ai-recommendation.module';
import { PolicyIntelligenceModule } from '../policy-intelligence/policy-intelligence.module';
import { AccessReviewsController } from './controllers/access-reviews.controller';
import { AccessReviewService } from './services/access-review.service';
import { EntitlementService } from './services/entitlement.service';

@Module({
  imports: [PolicyIntelligenceModule, AiRecommendationModule],
  controllers: [AccessReviewsController],
  providers: [AccessReviewService, EntitlementService],
  exports: [AccessReviewService],
})
export class AccessGovernanceModule {}
