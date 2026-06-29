import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AccessReviewService } from '../services/access-review.service';
import { SubmitReviewDecisionDto } from '../dto/submit-review-decision.dto';

@Controller('access-reviews')
export class AccessReviewsController {
  constructor(private readonly accessReviewService: AccessReviewService) {}

  @Get(':reviewId')
  async getByReviewId(@Param('reviewId') reviewId: string) {
    return this.accessReviewService.getReviewById(reviewId);
  }

  @Post(':reviewId/recommendations')
  async generateRecommendations(@Param('reviewId') reviewId: string) {
    return this.accessReviewService.generateRecommendations(reviewId);
  }

  @Post(':reviewId/decision')
  async submitDecision(
    @Param('reviewId') reviewId: string,
    @Body() body: SubmitReviewDecisionDto,
  ) {
    return this.accessReviewService.submitHumanDecision(reviewId, body);
  }

  // Backward-compatible endpoint.
  @Post(':reviewId/approve')
  async approve(@Param('reviewId') reviewId: string) {
    return this.accessReviewService.submitHumanDecision(reviewId, {
      decision: 'APPROVE',
      reviewerEmail: 'it-admin@techglobal.example',
      comments: 'Approved through legacy approve endpoint.',
    });
  }

  // Backward-compatible endpoint.
  @Post(':reviewId/reject')
  async reject(@Param('reviewId') reviewId: string) {
    return this.accessReviewService.submitHumanDecision(reviewId, {
      decision: 'REJECT',
      reviewerEmail: 'it-admin@techglobal.example',
      comments: 'Rejected through legacy reject endpoint.',
    });
  }

  @Post(':reviewId/execution-tasks')
  async createExecutionTasks(@Param('reviewId') reviewId: string) {
    return this.accessReviewService.createExecutionTasks(reviewId);
  }
}