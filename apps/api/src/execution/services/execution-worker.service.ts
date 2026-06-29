import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { DownstreamAccessAdapter } from '../adapters/downstream-access.adapter';
import { DownstreamRateLimiterService } from './downstream-rate-limiter.service';

@Injectable()
export class ExecutionWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExecutionWorkerService.name);
  private intervalHandle?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimiter: DownstreamRateLimiterService,
    private readonly downstreamAdapter: DownstreamAccessAdapter,
  ) {}

  onModuleInit(): void {
    this.intervalHandle = setInterval(() => {
      void this.processPendingExecutionTasks();
    }, 5000);

    this.logger.log('Execution worker started.');
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }

  async processPendingExecutionTasks(): Promise<void> {
    const tasks = await this.prisma.executionTask.findMany({
      where: {
        status: 'PENDING',
        nextRunAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 10,
    });

    for (const task of tasks) {
      await this.processOneTask(task.id);
    }
  }

  private async processOneTask(taskId: string): Promise<void> {
    const task = await this.prisma.executionTask.findUnique({
      where: { id: taskId },
    });

    if (!task || task.status !== 'PENDING') {
      return;
    }

    const claimed = await this.prisma.executionTask.updateMany({
      where: {
        id: task.id,
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

    const acquired = await this.rateLimiter.acquire(task.systemName);

    if (!acquired) {
      await this.prisma.executionTask.update({
        where: { id: task.id },
        data: {
          status: 'PENDING',
          nextRunAt: this.rateLimiter.getNextWindowStart(),
          lastError: `Rate limit reached for ${task.systemName}. Task deferred to next window.`,
        },
      });

      this.logger.warn(
        `Execution task deferred by rate limiter task=${task.id}, system=${task.systemName}`,
      );

      return;
    }

    try {
      const result = await this.downstreamAdapter.execute({
        taskId: task.id,
        reviewId: task.reviewId,
        systemName: task.systemName,
        entitlementKey: task.entitlementKey,
        action: task.action,
      });

      const review = await this.prisma.accessReviewRequest.findUnique({
        where: { reviewId: task.reviewId },
      });

      await this.prisma.$transaction(async (tx) => {
        await tx.executionTask.update({
          where: { id: task.id },
          data: {
            status: result.status,
            externalRequestId: result.externalRequestId,
            executedAt: new Date(),
            lastError: null,
          },
        });

        if (review) {
          await tx.auditLog.create({
            data: {
              traceId: review.eventId,
              actor: 'EXECUTION_WORKER',
              action: 'EXECUTION_TASK_SUCCEEDED',
              entityType: 'EXECUTION_TASK',
              entityId: task.id,
              accessReviewId: review.id,
              details: {
                reviewId: task.reviewId,
                systemName: task.systemName,
                entitlementKey: task.entitlementKey,
                action: task.action,
                externalRequestId: result.externalRequestId,
                note:
                  'Downstream execution was performed by deterministic worker after human approval.',
              },
            },
          });
        }

        const remainingIncompleteTasks = await tx.executionTask.count({
          where: {
            reviewId: task.reviewId,
            status: {
              not: 'SUCCEEDED',
            },
          },
        });

        if (remainingIncompleteTasks === 0 && review) {
          await tx.accessReviewRequest.update({
            where: {
              reviewId: task.reviewId,
            },
            data: {
              status: 'EXECUTION_COMPLETED',
            },
          });

          await tx.auditLog.create({
            data: {
              traceId: review.eventId,
              actor: 'EXECUTION_WORKER',
              action: 'ACCESS_REVIEW_EXECUTION_COMPLETED',
              entityType: 'ACCESS_REVIEW',
              entityId: task.reviewId,
              accessReviewId: review.id,
              details: {
                finalStatus: 'EXECUTION_COMPLETED',
                note:
                  'All deterministic downstream execution tasks completed successfully.',
              },
            },
          });
        }
      });

      this.logger.log(
        `Execution task succeeded task=${task.id}, system=${task.systemName}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown execution error';

      const nextAttemptCount = task.attempts + 1;
      const shouldRetry = nextAttemptCount < task.maxAttempts;

      await this.prisma.executionTask.update({
        where: { id: task.id },
        data: {
          status: shouldRetry ? 'PENDING' : 'FAILED',
          lastError: errorMessage,
          nextRunAt: this.calculateNextRunAt(nextAttemptCount),
        },
      });

      this.logger.error(
        `Execution task failed task=${task.id}, retry=${shouldRetry}, error=${errorMessage}`,
      );
    }
  }

  private calculateNextRunAt(attempts: number): Date {
    const backoffSeconds = Math.min(300, attempts * attempts * 10);
    return new Date(Date.now() + backoffSeconds * 1000);
  }
}