import { Injectable } from '@nestjs/common';
import { CreateRoleChangeEventDto } from '../../employee-lifecycle/dto/create-role-change-event.dto';

export interface AccessReviewResponse {
  reviewId: string;
  eventId: string;
  employeeId: string;
  status: string;
  message: string;
}

@Injectable()
export class AccessReviewService {
  async createFromRoleChangeEvent(
    event: CreateRoleChangeEventDto,
  ): Promise<AccessReviewResponse> {
    const reviewId = `AR-${new Date().getFullYear()}-${event.employeeId}`;

    return {
      reviewId,
      eventId: event.eventId,
      employeeId: event.employeeId,
      status: 'PENDING_RECOMMENDATION',
      message: 'Role change accepted and access review created.',
    };
  }
}