import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateRoleChangeEventDto } from '../../employee-lifecycle/dto/create-role-change-event.dto';
import { PolicyIntelligenceService } from '../../policy-intelligence/services/policy-intelligence.service';
import { LlmRecommendationService } from '../../ai-recommendation/services/llm-recommendation.service';
import { SubmitReviewDecisionDto } from '../dto/submit-review-decision.dto';
import { EntitlementService } from './entitlement.service';

@Injectable()
export class AccessReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementService: EntitlementService,
    private readonly policyIntelligenceService: PolicyIntelligenceService,
    private readonly llmRecommendationService: LlmRecommendationService,
  ) {}

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
        message:
          'Duplicate role-change event detected. Returning existing access review.',
        duplicate: true,
      };
    }

    const reviewId = this.generateReviewId();

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

      await tx.auditLog.create({
        data: {
          traceId: roleChangeEvent.eventId,
          actor: 'SYSTEM',
          action: 'ACCESS_REVIEW_CREATED',
          entityType: 'ACCESS_REVIEW',
          entityId: reviewId,
          accessReviewId: accessReview.id,
          details: {
            source: 'ROLE_CHANGE_EVENTS_API',
            transitionType: roleChangeEvent.transitionType,
          },
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

  async createReviewForExistingRoleChangeEvent(eventId: string) {
    const existing = await this.prisma.roleChangeEvent.findUnique({
      where: { eventId },
      include: { accessReview: true },
    });

    if (!existing) {
      throw new NotFoundException(
        `Role change event ${eventId} was not found for access review creation.`,
      );
    }

    if (existing.accessReview) {
      return {
        reviewId: existing.accessReview.reviewId,
        eventId: existing.eventId,
        employeeId: existing.employeeId,
        status: existing.accessReview.status,
        message:
          'Access review already exists for this role-change event. Returning existing review.',
        duplicate: true,
      };
    }

    const reviewId = this.generateReviewId();

    const result = await this.prisma.$transaction(async (tx) => {
      const accessReview = await tx.accessReviewRequest.create({
        data: {
          reviewId,
          eventId: existing.eventId,
          employeeId: existing.employeeId,
          status: 'PENDING_RECOMMENDATION',
        },
      });

      const roleChangeEvent = await tx.roleChangeEvent.update({
        where: { eventId: existing.eventId },
        data: { status: 'VALIDATED' },
      });

      await tx.auditLog.create({
        data: {
          traceId: existing.eventId,
          actor: 'SYSTEM',
          action: 'ACCESS_REVIEW_CREATED',
          entityType: 'ACCESS_REVIEW',
          entityId: reviewId,
          accessReviewId: accessReview.id,
          details: {
            source: 'WORKDAY_WEBHOOK_PROCESSING_JOB',
            transitionType: existing.transitionType,
          },
        },
      });

      return { roleChangeEvent, accessReview };
    });

    return {
      reviewId: result.accessReview.reviewId,
      eventId: result.roleChangeEvent.eventId,
      employeeId: result.roleChangeEvent.employeeId,
      status: result.accessReview.status,
      message: 'Access review created from accepted Workday role-change event.',
      duplicate: false,
    };
  }

 async getReviewById(reviewId: string) {
  const review = await this.prisma.accessReviewRequest.findUnique({
    where: { reviewId },
    include: {
      roleChangeEvent: true,
      recommendations: true,
      policyEvidence: true,
      auditLogs: true,
    },
  });

  if (!review) {
    throw new NotFoundException(`Access review ${reviewId} not found`);
  }

  const [approvalDecisions, executionTasks, llmMetrics] = await Promise.all([
    this.prisma.approvalDecision.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'asc' },
    }),
    this.prisma.executionTask.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'asc' },
    }),
    this.prisma.llmEvaluationMetric.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    ...review,
    approvalDecisions,
    executionTasks,
    llmMetrics,
  };
}

  async generateRecommendations(reviewId: string) {
    const review = await this.getReviewById(reviewId);

    const oldDetails = review.roleChangeEvent.oldDetails as {
      title: string;
      department: string;
      costCenter: string;
    };

    const newDetails = review.roleChangeEvent.newDetails as {
      title: string;
      department: string;
      costCenter: string;
    };

    const currentEntitlements =
      await this.entitlementService.getActiveEntitlements(review.employeeId);

    const policyChunks =
      await this.policyIntelligenceService.retrieveRelevantPolicies({
        oldDepartment: oldDetails.department,
        oldCostCenter: oldDetails.costCenter,
        newDepartment: newDetails.department,
        newCostCenter: newDetails.costCenter,
        currentEntitlements,
      });

    const recommendations = await this.llmRecommendationService.generate({
      reviewId,
      roleChange: review.roleChangeEvent,
      currentEntitlements,
      policyEvidence: policyChunks,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.recommendationItem.deleteMany({
        where: { reviewId },
      });

      await tx.retrievedPolicyEvidence.deleteMany({
        where: { reviewId },
      });

      if (policyChunks.length > 0) {
        await tx.retrievedPolicyEvidence.createMany({
          data: policyChunks.map((chunk) => ({
            reviewId,
            sectionId: chunk.sectionId,
            policyVersion: chunk.policyVersion,
            sourceUri: chunk.sourceUri,
            similarityScore: chunk.similarityScore,
            text: chunk.text,
            provider:
              process.env.VERTEX_RAG_MOCK_ENABLED === 'true'
                ? 'VERTEX_RAG_MOCK'
                : 'VERTEX_RAG',
          })),
        });
      }

      if (recommendations.length > 0) {
        await tx.recommendationItem.createMany({
          data: recommendations.map((item) => ({
            reviewId,
            systemName: item.systemName,
            entitlementKey: item.entitlementKey,
            action: item.action,
            reason: item.reason,
            policyCitation: item.policyCitation,
            confidence: item.confidence,
          })),
        });
      }

      await tx.accessReviewRequest.update({
        where: { reviewId },
        data: { status: 'PENDING_APPROVAL' },
      });

      await tx.auditLog.create({
        data: {
          traceId: review.eventId,
          actor: 'SYSTEM',
          action: 'AI_RECOMMENDATIONS_GENERATED',
          entityType: 'ACCESS_REVIEW',
          entityId: reviewId,
          accessReviewId: review.id,
          details: {
            recommendationCount: recommendations.length,
            policyEvidenceCount: policyChunks.length,
            activeEntitlementCount: currentEntitlements.length,
            provider:
              process.env.VERTEX_RAG_MOCK_ENABLED === 'true'
                ? 'VERTEX_RAG_MOCK'
                : 'VERTEX_RAG',
          },
        },
      });
    });

    return this.getReviewById(reviewId);
  }

  async listReviews() {
  const reviews = await this.prisma.accessReviewRequest.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
    include: {
      roleChangeEvent: true,
      recommendations: true,
    },
  });

  return Promise.all(
    reviews.map(async (review) => {
      const [latestDecision, executionTaskCount, policyEvidenceCount, auditLogCount] =
        await Promise.all([
          this.prisma.approvalDecision.findFirst({
            where: { reviewId: review.reviewId },
            orderBy: { createdAt: 'desc' },
            select: {
              decision: true,
              reviewerEmail: true,
              createdAt: true,
            },
          }),
          this.prisma.executionTask.count({
            where: { reviewId: review.reviewId },
          }),
          this.prisma.retrievedPolicyEvidence.count({
            where: { reviewId: review.reviewId },
          }),
          this.prisma.auditLog.count({
            where: { accessReviewId: review.id },
          }),
        ]);

      const primaryRecommendation =
        review.recommendations.find((item) => item.action === 'REMOVE') ||
        review.recommendations[0];

      const oldDetails = review.roleChangeEvent.oldDetails as Record<string, unknown>;
      const newDetails = review.roleChangeEvent.newDetails as Record<string, unknown>;

      return {
        reviewId: review.reviewId,
        eventId: review.eventId,
        employeeId: review.employeeId,
        status: review.status,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        transitionType: review.roleChangeEvent.transitionType,
        oldTitle: String(oldDetails.title || ''),
        oldDepartment: String(oldDetails.department || ''),
        oldCostCenter: String(oldDetails.costCenter || oldDetails.cost_center || ''),
        newTitle: String(newDetails.title || ''),
        newDepartment: String(newDetails.department || ''),
        newCostCenter: String(newDetails.costCenter || newDetails.cost_center || ''),
        recommendationCount: review.recommendations.length,
        policyEvidenceCount,
        executionTaskCount,
        auditLogCount,
        primaryAction: primaryRecommendation?.action || 'PENDING',
        primarySystem: primaryRecommendation?.systemName || null,
        primaryConfidence: primaryRecommendation?.confidence || null,
        latestDecision,
      };
    }),
  );
}

  async submitHumanDecision(
    reviewId: string,
    decisionDto: SubmitReviewDecisionDto,
  ) {
    const review = await this.getReviewById(reviewId);

    if (review.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(
        `Review ${reviewId} is not ready for human decision.`,
      );
    }

    const newStatus =
      decisionDto.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const auditAction =
      decisionDto.decision === 'APPROVE'
        ? 'ACCESS_REVIEW_APPROVED'
        : 'ACCESS_REVIEW_REJECTED';

    await this.prisma.$transaction(async (tx) => {
      await tx.accessReviewRequest.update({
        where: { reviewId },
        data: { status: newStatus },
      });

      await tx.approvalDecision.create({
        data: {
          reviewId,
          reviewerEmail: decisionDto.reviewerEmail,
          decision: decisionDto.decision,
          comments: decisionDto.comments,
        },
      });

      await tx.auditLog.create({
        data: {
          traceId: review.eventId,
          actor: decisionDto.reviewerEmail,
          action: auditAction,
          entityType: 'ACCESS_REVIEW',
          entityId: reviewId,
          accessReviewId: review.id,
          details: {
            previousStatus: review.status,
            newStatus,
            humanDecision: decisionDto.decision,
            comments: decisionDto.comments ?? null,
            recommendationCount: this.safeCount(
              this.getCollection(review, 'recommendations'),
            ),
            policyEvidenceCount: this.safeCount(
              this.getCollection(review, 'policyEvidence'),
            ),
          },
        },
      });
    });

    const updated = await this.getReviewById(reviewId);

    return {
      message:
        decisionDto.decision === 'APPROVE'
          ? 'Access review approved. Execution tasks can now be created.'
          : 'Access review rejected. No access changes will be executed.',
      decision: decisionDto.decision,
      review: updated,
    };
  }

  async approveReview(reviewId: string) {
    return this.submitHumanDecision(reviewId, {
      decision: 'APPROVE',
      reviewerEmail: 'it-admin@techglobal.example',
      comments: 'Approved through legacy approve endpoint.',
    });
  }

  async rejectReview(reviewId: string) {
    return this.submitHumanDecision(reviewId, {
      decision: 'REJECT',
      reviewerEmail: 'it-admin@techglobal.example',
      comments: 'Rejected through legacy reject endpoint.',
    });
  }

async createExecutionTasks(reviewId: string) {
  const review = await this.getReviewById(reviewId);

  if (review.status === 'EXECUTION_PENDING') {
    const existingTasks = await this.prisma.executionTask.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      reviewId,
      tasksCreated: 0,
      existingTasks: existingTasks.length,
      reviewStatus: 'EXECUTION_PENDING',
      executionTaskStatus: 'PENDING',
      message:
        'Execution tasks already exist for this approved review. No duplicate tasks were created.',
    };
  }

  if (review.status !== 'APPROVED') {
    throw new BadRequestException(
      `Review ${reviewId} must be approved before execution tasks are created.`,
    );
  }

  const executableRecommendations = review.recommendations.filter((item) =>
    ['ADD', 'REMOVE'].includes(item.action),
  );

  const result = await this.prisma.$transaction(async (tx) => {
    await tx.executionTask.deleteMany({
      where: { reviewId },
    });

    const created = await tx.executionTask.createMany({
      data: executableRecommendations.map((item) => ({
        reviewId,
        systemName: item.systemName,
        entitlementKey: item.entitlementKey,
        action: item.action,
        status: 'PENDING',
      })),
    });

    await tx.accessReviewRequest.update({
      where: { reviewId },
      data: { status: 'EXECUTION_PENDING' },
    });

    await tx.auditLog.create({
      data: {
        traceId: review.eventId,
        actor: 'SYSTEM',
        action: 'EXECUTION_TASKS_CREATED',
        entityType: 'ACCESS_REVIEW',
        entityId: reviewId,
        accessReviewId: review.id,
        details: {
          previousStatus: review.status,
          newStatus: 'EXECUTION_PENDING',
          tasksCreated: created.count,
          executionTaskStatus: 'PENDING',
          executableRecommendationCount: executableRecommendations.length,
          note:
            'Execution tasks are deterministic records and are created only after human approval.',
        },
      },
    });

    return created;
  });

  return {
    reviewId,
    tasksCreated: result.count,
    reviewStatus: 'EXECUTION_PENDING',
    executionTaskStatus: 'PENDING',
    message:
      'Execution tasks created successfully. Review is now waiting for downstream execution.',
  };
}

  private generateReviewId(): string {
    return `AR-${new Date().getFullYear()}-${randomUUID()
      .slice(0, 8)
      .toUpperCase()}`;
  }

  private getCollection(
    value: unknown,
    key: 'recommendations' | 'policyEvidence',
  ): unknown {
    if (typeof value !== 'object' || value === null) {
      return [];
    }

    return (value as Record<string, unknown>)[key];
  }

  private safeCount(value: unknown): number {
    return Array.isArray(value) ? value.length : 0;
  }
}