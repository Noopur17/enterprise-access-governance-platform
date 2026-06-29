import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AccessReviewService } from '../../access-governance/services/access-review.service';

@Injectable()
export class RoleChangeJobProcessorService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RoleChangeJobProcessorService.name);
  private intervalHandle?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessReviewService: AccessReviewService,
  ) {}

  onModuleInit(): void {
    this.intervalHandle = setInterval(() => {
      void this.processNextPendingJob();
    }, 5000);

    this.logger.log('Role-change processing worker started.');
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }

  async processNextPendingJob(): Promise<void> {
    const job = await this.prisma.processingJob.findFirst({
      where: {
        jobType: 'ROLE_CHANGE_ACCESS_REVIEW',
        status: 'PENDING',
        nextRunAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!job) {
      return;
    }

    const claimed = await this.prisma.processingJob.updateMany({
      where: {
        id: job.id,
        status: 'PENDING',
      },
      data: {
        status: 'PROCESSING',
        attempts: {
          increment: 1,
        },
      },
    });

    if (claimed.count === 0) {
      return;
    }

    this.logger.log(
      `Processing role-change job id=${job.id}, event=${job.eventId}`,
    );

    try {
      const result =
        await this.accessReviewService.createReviewForExistingRoleChangeEvent(
          job.eventId,
        );

      await this.prisma.processingJob.update({
        where: {
          id: job.id,
        },
        data: {
          status: 'COMPLETED',
          lastError: null,
        },
      });

      this.logger.log(
        `Completed role-change job id=${job.id}, review=${result.reviewId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown processing error';

      const nextAttemptCount = job.attempts + 1;
      const shouldRetry = nextAttemptCount < job.maxAttempts;

      await this.prisma.processingJob.update({
        where: {
          id: job.id,
        },
        data: {
          status: shouldRetry ? 'PENDING' : 'FAILED',
          lastError: errorMessage,
          nextRunAt: this.calculateNextRunAt(nextAttemptCount),
        },
      });

      this.logger.error(
        `Failed role-change job id=${job.id}, event=${job.eventId}, retry=${shouldRetry}, error=${errorMessage}`,
      );
    }
  }

  private calculateNextRunAt(attempts: number): Date {
    const backoffSeconds = Math.min(60, attempts * attempts * 5);
    return new Date(Date.now() + backoffSeconds * 1000);
  }
}