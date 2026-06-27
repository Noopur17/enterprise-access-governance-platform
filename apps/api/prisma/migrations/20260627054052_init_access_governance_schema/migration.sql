-- CreateTable
CREATE TABLE "RoleChangeEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "transitionType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "oldDetails" JSONB NOT NULL,
    "newDetails" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleChangeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessReviewRequest" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_RECOMMENDATION',
    "riskLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationItem" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "entitlementKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "policyCitation" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeEntitlement" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "entitlementKey" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "grantedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalDecision" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reviewerEmail" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionTask" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "entitlementKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutionTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessReviewId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmEvaluationMetric" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL,
    "groundingScore" DOUBLE PRECISION NOT NULL,
    "schemaValid" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmEvaluationMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleChangeEvent_eventId_key" ON "RoleChangeEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessReviewRequest_reviewId_key" ON "AccessReviewRequest"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessReviewRequest_eventId_key" ON "AccessReviewRequest"("eventId");

-- CreateIndex
CREATE INDEX "EmployeeEntitlement_employeeId_idx" ON "EmployeeEntitlement"("employeeId");

-- CreateIndex
CREATE INDEX "ApprovalDecision_reviewId_idx" ON "ApprovalDecision"("reviewId");

-- CreateIndex
CREATE INDEX "ExecutionTask_reviewId_idx" ON "ExecutionTask"("reviewId");

-- CreateIndex
CREATE INDEX "AuditLog_traceId_idx" ON "AuditLog"("traceId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "LlmEvaluationMetric_reviewId_idx" ON "LlmEvaluationMetric"("reviewId");

-- AddForeignKey
ALTER TABLE "AccessReviewRequest" ADD CONSTRAINT "AccessReviewRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RoleChangeEvent"("eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "AccessReviewRequest"("reviewId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_accessReviewId_fkey" FOREIGN KEY ("accessReviewId") REFERENCES "AccessReviewRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
