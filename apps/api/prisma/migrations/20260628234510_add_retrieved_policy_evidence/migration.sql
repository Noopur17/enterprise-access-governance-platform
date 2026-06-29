-- CreateTable
CREATE TABLE "RetrievedPolicyEvidence" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "sourceUri" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'VERTEX_RAG',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetrievedPolicyEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetrievedPolicyEvidence_reviewId_idx" ON "RetrievedPolicyEvidence"("reviewId");

-- AddForeignKey
ALTER TABLE "RetrievedPolicyEvidence" ADD CONSTRAINT "RetrievedPolicyEvidence_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "AccessReviewRequest"("reviewId") ON DELETE RESTRICT ON UPDATE CASCADE;
