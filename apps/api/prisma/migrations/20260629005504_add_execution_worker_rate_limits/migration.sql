-- AlterTable
ALTER TABLE "ExecutionTask" ADD COLUMN     "executedAt" TIMESTAMP(3),
ADD COLUMN     "externalRequestId" TEXT,
ADD COLUMN     "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "DownstreamRateLimitWindow" (
    "id" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DownstreamRateLimitWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DownstreamRateLimitWindow_systemName_windowStart_idx" ON "DownstreamRateLimitWindow"("systemName", "windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "DownstreamRateLimitWindow_systemName_windowStart_key" ON "DownstreamRateLimitWindow"("systemName", "windowStart");

-- CreateIndex
CREATE INDEX "ExecutionTask_status_nextRunAt_idx" ON "ExecutionTask"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "ExecutionTask_systemName_status_idx" ON "ExecutionTask"("systemName", "status");
