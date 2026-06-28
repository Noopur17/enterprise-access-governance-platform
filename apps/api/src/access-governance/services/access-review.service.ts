import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateRoleChangeEventDto } from '../../employee-lifecycle/dto/create-role-change-event.dto';

@Injectable()
export class AccessReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromRoleChangeEvent(event: CreateRoleChangeEventDto) {
    const existing = await this.prisma.roleChangeEvent.findUnique({
      where: { eventId: event.eventId },
      include: { accessReview: true },
    });

    if (existing?.accessReview) {
      return {
        reviewId: existing.accessReview.reviewId,
        eventId: existing.eventId,
        employeeId: existing.employeeId,
        status: existing.accessReview.status,
        message: 'Duplicate role-change event detected. Returning existing access review.',
        duplicate: true,
      };
    }

    const reviewId = `AR-${new Date().getFullYear()}-${crypto.randomUUID()
      .slice(0, 8)
      .toUpperCase()}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const roleChangeEvent = await tx.roleChangeEvent.create({
        data: {
          eventId: event.eventId,
          employeeId: event.employeeId,
          transitionType: event.transitionType,
          timestamp: new Date(event.timestamp),
          oldDetails: {
  title: event.oldDetails.title,
  department: event.oldDetails.department,
  costCenter: event.oldDetails.costCenter,
},
newDetails: {
  title: event.newDetails.title,
  department: event.newDetails.department,
  costCenter: event.newDetails.costCenter,
},
          status: 'VALIDATED',
        },
      });

      const accessReview = await tx.accessReviewRequest.create({
        data: {
          reviewId,
          eventId: roleChangeEvent.eventId,
          employeeId: roleChangeEvent.employeeId,
          status: 'PENDING_RECOMMENDATION',
        },
      });

      return { roleChangeEvent, accessReview };
    });

    return {
      reviewId: result.accessReview.reviewId,
      eventId: result.roleChangeEvent.eventId,
      employeeId: result.roleChangeEvent.employeeId,
      status: result.accessReview.status,
      message: 'Role change accepted and access review created.',
      duplicate: false,
    };
  }

  async getReviewById(reviewId: string) {
    const review = await this.prisma.accessReviewRequest.findUnique({
      where: { reviewId },
      include: {
        roleChangeEvent: true,
        recommendations: true,
        auditLogs: true,
      },
    });

    if (!review) {
      throw new NotFoundException(`Access review ${reviewId} not found`);
    }

    return review;
  }
}