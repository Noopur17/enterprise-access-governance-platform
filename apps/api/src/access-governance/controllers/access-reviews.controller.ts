import { Controller, Get, Param } from '@nestjs/common';
import { AccessReviewService } from '../services/access-review.service';

@Controller('access-reviews')
export class AccessReviewsController {
  constructor(private readonly accessReviewService: AccessReviewService) {}

  @Get(':reviewId')
  async getByReviewId(@Param('reviewId') reviewId: string) {
    return this.accessReviewService.getReviewById(reviewId);
  }
}