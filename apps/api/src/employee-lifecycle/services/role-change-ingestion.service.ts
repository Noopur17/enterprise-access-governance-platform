import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { AccessReviewService } from '../../access-governance/services/access-review.service';
import { CreateRoleChangeEventDto } from '../dto/create-role-change-event.dto';
import {
  WorkdayRoleChangeEventDto,
  WorkdayRoleChangeEventSchema,
} from '../dto/workday-role-change-event.dto';
import {
  maskCostCenter,
  maskEmployeeId,
} from '../../common/security/masking';

type WorkdayWebhookResponse = {
  eventId: string;
  status: 'ACCEPTED' | 'DUPLICATE_ACCEPTED';
  message: string;
};

@Injectable()
export class RoleChangeIngestionService {
  private readonly logger = new Logger(RoleChangeIngestionService.name);

  constructor(
    private readonly accessReviewService: AccessReviewService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Existing demo endpoint. Keep this for backward compatibility.
   */
  async ingestRoleChangeEvent(payload: CreateRoleChangeEventDto) {
    return this.accessReviewService.createFromRoleChangeEvent(payload);
  }

  /**
   * Production-style Workday webhook ingestion.
   *
   * This accepts the exact snake_case payload from Workday, persists the event,
   * creates a durable ProcessingJob, and returns 202 without running RAG/LLM inline.
   */
  async ingestWorkdayRoleChangeWebhook(
    rawPayload: unknown,
  ): Promise<WorkdayWebhookResponse> {
    const payload = this.validateWorkdayPayload(rawPayload);

    this.logger.log(
      `Received Workday role-change event=${payload.event_id}, employee=${maskEmployeeId(
        payload.employee_id,
      )}, oldCostCenter=${maskCostCenter(
        payload.old_details.cost_center,
      )}, newCostCenter=${maskCostCenter(payload.new_details.cost_center)}`,
    );

    const existingEvent = await this.prisma.roleChangeEvent.findUnique({
      where: {
        eventId: payload.event_id,
      },
    });

    if (existingEvent) {
      return this.duplicateResponse(payload.event_id);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.roleChangeEvent.create({
          data: {
            eventId: payload.event_id,
            employeeId: payload.employee_id,
            transitionType: payload.transition_type,
            timestamp: new Date(payload.timestamp),
            oldDetails: this.toStoredRoleDetails(payload.old_details),
            newDetails: this.toStoredRoleDetails(payload.new_details),
            status: 'RECEIVED',
          },
        });

        await tx.processingJob.create({
          data: {
            eventId: payload.event_id,
            jobType: 'ROLE_CHANGE_ACCESS_REVIEW',
            status: 'PENDING',
            attempts: 0,
            maxAttempts: 3,
            nextRunAt: new Date(),
          },
        });
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return this.duplicateResponse(payload.event_id);
      }

      throw error;
    }

    return {
      eventId: payload.event_id,
      status: 'ACCEPTED',
      message:
        'Workday role-change event accepted for asynchronous access review processing.',
    };
  }

  private validateWorkdayPayload(
    rawPayload: unknown,
  ): WorkdayRoleChangeEventDto {
    const parsed = WorkdayRoleChangeEventSchema.safeParse(rawPayload);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid Workday role-change webhook payload.',
        issues: parsed.error.flatten(),
      });
    }

    return parsed.data;
  }

  private toStoredRoleDetails(details: {
    title: string;
    department: string;
    cost_center: string;
  }) {
    return {
      title: details.title,
      department: details.department,
      costCenter: details.cost_center,
    };
  }

  private duplicateResponse(eventId: string): WorkdayWebhookResponse {
    this.logger.log(`Duplicate Workday event safely ignored. event=${eventId}`);

    return {
      eventId,
      status: 'DUPLICATE_ACCEPTED',
      message:
        'Duplicate Workday role-change event already accepted. No duplicate processing job created.',
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}