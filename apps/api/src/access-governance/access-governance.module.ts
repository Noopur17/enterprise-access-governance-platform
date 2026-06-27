import { Module } from '@nestjs/common';
import { AccessReviewService } from './services/access-review.service';

@Module({
  providers: [AccessReviewService],
  exports: [AccessReviewService],
})
export class AccessGovernanceModule {}