-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SERVICE_AGREEMENT', 'BSP', 'CARE_PLAN', 'INCIDENT_REPORT', 'EVIDENCE_PACK', 'PARTICIPANT_DOCUMENT', 'PARTICIPANT_RECORD', 'WORKER_CERTIFICATE', 'CUSTOMER_DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentEntityType" AS ENUM ('PARTICIPANT', 'WORKER', 'ORG', 'INCIDENT', 'CARE_PLAN', 'BSP', 'SERVICE_AGREEMENT', 'USER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BSPAnalysisSource" AS ENUM ('NATIVE', 'MIGRATED_LARAVEL');

-- CreateEnum
CREATE TYPE "SCConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SCParticipantAccessType" AS ENUM ('READ', 'READ_WRITE');

-- CreateEnum
CREATE TYPE "ParticipantAlertSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RiskLikelihood" AS ENUM ('RARE', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'ALMOST_CERTAIN');

-- CreateEnum
CREATE TYPE "RiskConsequence" AS ENUM ('INSIGNIFICANT', 'MINOR', 'MODERATE', 'MAJOR', 'CATASTROPHIC');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('ACTIVE', 'MITIGATED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "participantId" TEXT,
ALTER COLUMN "carePlanId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "originalFilename" TEXT,
    "contentType" TEXT,
    "fileSizeBytes" INTEGER,
    "documentType" "DocumentType" NOT NULL,
    "entityType" "DocumentEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentDocumentId" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "expiresAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BSPAnalysisReport" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "migrationSource" "BSPAnalysisSource" NOT NULL DEFAULT 'NATIVE',
    "legacyAnalysisData" JSONB,
    "bspGapsDetected" JSONB,
    "bspGapsDetectedDetails" TEXT,
    "draftBspContextOfBehaviour" TEXT,
    "draftBspEnvironmentalConsiderations" TEXT,
    "draftBspTraumaInformedAdjustments" TEXT,
    "draftBspSafetyRecommendations" TEXT,
    "triggerMatchedTriggers" JSONB,
    "triggerConfidenceLevel" TEXT,
    "triggerExplanation" TEXT,
    "strategyMissingProactive" JSONB,
    "strategyMissedReactive" JSONB,
    "strategyStaffResponse" TEXT,
    "identifiedGapsSummary" JSONB,
    "bspInternalInconsistencies" JSONB,
    "bspInternalInconsistenciesDetails" TEXT,
    "potentiallyOutdatedStrategies" JSONB,
    "potentiallyOutdatedStrategiesDetails" TEXT,
    "skillBuildingOpportunities" JSONB,
    "skillBuildingOpportunitiesDetails" TEXT,
    "riskRecurrenceRisk" TEXT,
    "riskEnvironmentalFactors" JSONB,
    "riskBehaviouralFactors" JSONB,
    "riskMitigationSummary" TEXT,
    "ndisComplianceLevel" TEXT,
    "ndisPersonCentredPractice" JSONB,
    "ndisPositiveBehaviourSupport" JSONB,
    "ndisRestrictivePractice" JSONB,
    "ndisEnvironmentSafety" JSONB,
    "ndisIncidentDocumentation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BSPAnalysisReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCConnection" (
    "id" TEXT NOT NULL,
    "providerOrgId" TEXT NOT NULL,
    "scOrgId" TEXT,
    "invitedByUserId" TEXT,
    "invitationEmail" TEXT,
    "invitationToken" TEXT,
    "invitationExpiresAt" TIMESTAMP(3),
    "invitationNote" TEXT,
    "status" "SCConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "SCConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCParticipantAccess" (
    "id" TEXT NOT NULL,
    "scConnectionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "accessType" "SCParticipantAccessType" NOT NULL DEFAULT 'READ',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "SCParticipantAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantNote" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantAlert" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "ParticipantAlertSeverity" NOT NULL DEFAULT 'INFO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantRisk" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "likelihood" "RiskLikelihood" NOT NULL,
    "consequence" "RiskConsequence" NOT NULL,
    "riskLevel" TEXT,
    "mitigationStrategy" TEXT,
    "reviewDate" TIMESTAMP(3),
    "status" "RiskStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantRisk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_entityType_entityId_idx" ON "Document"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Document_documentType_status_idx" ON "Document"("documentType", "status");

-- CreateIndex
CREATE INDEX "Document_expiresAt_idx" ON "Document"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BSPAnalysisReport_incidentId_key" ON "BSPAnalysisReport"("incidentId");

-- CreateIndex
CREATE INDEX "BSPAnalysisReport_orgId_createdAt_idx" ON "BSPAnalysisReport"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "BSPAnalysisReport_migrationSource_idx" ON "BSPAnalysisReport"("migrationSource");

-- CreateIndex
CREATE UNIQUE INDEX "SCConnection_invitationToken_key" ON "SCConnection"("invitationToken");

-- CreateIndex
CREATE INDEX "SCConnection_providerOrgId_status_idx" ON "SCConnection"("providerOrgId", "status");

-- CreateIndex
CREATE INDEX "SCConnection_scOrgId_status_idx" ON "SCConnection"("scOrgId", "status");

-- CreateIndex
CREATE INDEX "SCParticipantAccess_participantId_idx" ON "SCParticipantAccess"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "SCParticipantAccess_scConnectionId_participantId_key" ON "SCParticipantAccess"("scConnectionId", "participantId");

-- CreateIndex
CREATE INDEX "ParticipantNote_participantId_createdAt_idx" ON "ParticipantNote"("participantId", "createdAt");

-- CreateIndex
CREATE INDEX "ParticipantAlert_participantId_isActive_idx" ON "ParticipantAlert"("participantId", "isActive");

-- CreateIndex
CREATE INDEX "ParticipantRisk_participantId_status_idx" ON "ParticipantRisk"("participantId", "status");

-- CreateIndex
CREATE INDEX "Goal_participantId_status_idx" ON "Goal"("participantId", "status");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_parentDocumentId_fkey" FOREIGN KEY ("parentDocumentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BSPAnalysisReport" ADD CONSTRAINT "BSPAnalysisReport_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BSPAnalysisReport" ADD CONSTRAINT "BSPAnalysisReport_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCConnection" ADD CONSTRAINT "SCConnection_providerOrgId_fkey" FOREIGN KEY ("providerOrgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCConnection" ADD CONSTRAINT "SCConnection_scOrgId_fkey" FOREIGN KEY ("scOrgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCParticipantAccess" ADD CONSTRAINT "SCParticipantAccess_scConnectionId_fkey" FOREIGN KEY ("scConnectionId") REFERENCES "SCConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCParticipantAccess" ADD CONSTRAINT "SCParticipantAccess_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantNote" ADD CONSTRAINT "ParticipantNote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantAlert" ADD CONSTRAINT "ParticipantAlert_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantRisk" ADD CONSTRAINT "ParticipantRisk_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
