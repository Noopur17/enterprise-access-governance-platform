import { Injectable } from '@nestjs/common';
import { CreateRoleChangeEventDto } from '../../employee-lifecycle/dto/create-role-change-event.dto';

export interface AccessReviewResponse {
  reviewId: string;
  eventId: string;
  employeeId: string;
  status: string;
  message: string;
  duplicate: boolean;
}

@Injectable()
export class AccessReviewService {
  private readonly reviewsByEventId = new Map<string, AccessReviewResponse>();

  async createFromRoleChangeEvent(
    event: CreateRoleChangeEventDto,
  ): Promise<AccessReviewResponse> {
    const existingReview = this.reviewsByEventId.get(event.eventId);

    if (existingReview) {
      return {
        ...existingReview,
        message: 'Duplicate role-change event detected. Returning existing access review.',
        duplicate: true,
      };
    }

    const reviewId = `AR-${new Date().getFullYear()}-${event.employeeId}`;

    const review: AccessReviewResponse = {
      reviewId,
      eventId: event.eventId,
      employeeId: event.employeeId,
      status: 'PENDING_RECOMMENDATION',
      message: 'Role change accepted and access review created.',
      duplicate: false,
    };

    this.reviewsByEventId.set(event.eventId, review);

    return review;
  }
}