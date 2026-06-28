import { Module } from '@nestjs/common';
import { PolicyIntelligenceModule } from '../policy-intelligence/policy-intelligence.module';
import { AccessReviewsController } from './controllers/access-reviews.controller';
import { AccessReviewService } from './services/access-review.service';
import { EntitlementService } from './services/entitlement.service';
import { RecommendationEngineService } from './services/recommendation-engine.service';

@Module({
  imports: [PolicyIntelligenceModule],
  controllers: [AccessReviewsController],
  providers: [
    AccessReviewService,
    EntitlementService,
    RecommendationEngineService,
  ],
  exports: [AccessReviewService],
})
export class AccessGovernanceModule {}