import { Module } from '@nestjs/common';
import { AccessReviewsController } from './controllers/access-reviews.controller';
import { AccessReviewService } from './services/access-review.service';

@Module({
  controllers: [AccessReviewsController],
  providers: [AccessReviewService],
  exports: [AccessReviewService],
})
export class AccessGovernanceModule {}