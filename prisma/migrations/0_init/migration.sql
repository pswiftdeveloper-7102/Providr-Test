-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Portal" AS ENUM ('PROVIDER', 'SC', 'WORKER');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ROSTERING_MANAGER', 'CARE_MANAGER', 'COMPLIANCE_MANAGER', 'OFFICE_ADMIN', 'SUPPORT_WORKER', 'SUPPORT_COORDINATOR');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BudgetCategory" AS ENUM ('CORE', 'CAPACITY', 'CAPITAL');

-- CreateEnum
CREATE TYPE "ServiceAgreementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "CarePlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BSPStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GoalCategory" AS ENUM ('SOCIAL', 'PHYSICAL', 'COMMUNICATION', 'INDEPENDENT_LIVING', 'COMMUNITY_PARTICIPATION', 'EMPLOYMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('IN_PROGRESS', 'ACHIEVED', 'PAUSED', 'DROPPED');

-- CreateEnum
CREATE TYPE "WorkerType" AS ENUM ('SUPPORT_WORKER', 'ALLIED_HEALTH', 'BEHAVIOUR_SUPPORT');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NoteInputMethod" AS ENUM ('KEYBOARD', 'VOICE');

-- CreateEnum
CREATE TYPE "MedicationStatus" AS ENUM ('GIVEN', 'REFUSED', 'UNAVAILABLE', 'OUT_OF_STOCK', 'FORGOTTEN', 'CLINICAL_HOLD', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('MINOR', 'MODERATE', 'SERIOUS', 'REPORTABLE');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('DRAFT', 'REPORTED', 'UNDER_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('INJURY', 'ABUSE', 'NEGLECT', 'UNLAWFUL_CONTACT', 'UNAUTHORISED_RESTRICTIVE_PRACTICE', 'PROPERTY_DAMAGE', 'MEDICATION_ERROR', 'MISSING_PERSON', 'DEATH', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentSource" AS ENUM ('QUICK', 'AI_ASSISTED', 'WIZARD', 'AUTO');

-- CreateEnum
CREATE TYPE "RestraintType" AS ENUM ('PHYSICAL', 'MECHANICAL', 'CHEMICAL', 'ENVIRONMENTAL', 'SECLUSION');

-- CreateEnum
CREATE TYPE "ScEngagementStatus" AS ENUM ('PROPOSED', 'AGREEMENT_SENT', 'ACTIVE', 'ENDED', 'DECLINED');

-- CreateEnum
CREATE TYPE "EscalationType" AS ENUM ('PROVIDER_DROP', 'HOSPITAL', 'REPORTABLE_INCIDENT', 'FAMILY_ISSUE', 'EMERGENCY_COVER', 'PLAN_BREACH', 'OTHER');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "InformalSupportRelationship" AS ENUM ('FAMILY', 'FRIEND', 'GUARDIAN', 'ADVOCATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExternalContactType" AS ENUM ('NDIA_PLANNER', 'PLAN_MANAGER', 'GP', 'HOSPITAL', 'ALLIED_HEALTH', 'MENTAL_HEALTH', 'HOUSING', 'EDUCATION', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('PHONE', 'EMAIL', 'SMS', 'IN_PERSON', 'VIDEO', 'OTHER');

-- CreateTable
CREATE TABLE "Org" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradingName" TEXT,
    "abn" TEXT,
    "ndisRegistrationNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgEntitlement" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "portal" "Portal" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "OrgEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflictOfInterestForm" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "signedByUserId" TEXT,
    "documentUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConflictOfInterestForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgComplianceContact" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgComplianceContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "roles" "OrgRole"[],
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerInvite" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ndisNumber" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "pronouns" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "complexNeeds" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "ndisPlanNumber" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "planFileKey" TEXT,
    "planFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanBudget" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "category" "BudgetCategory" NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "spentCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlanBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAgreement" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "documentUrl" TEXT,
    "uploadedFileKey" TEXT,
    "uploadedFileName" TEXT,
    "notes" TEXT,
    "status" "ServiceAgreementStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarePlan" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "status" "CarePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "summary" TEXT,
    "communicationPreferences" TEXT,
    "medicalConditions" TEXT,
    "allergies" TEXT,
    "risks" TEXT,
    "emergencyContacts" TEXT,
    "culturalConsiderations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehaviourSupportPlan" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "status" "BSPStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "authoredById" TEXT,
    "summary" TEXT,
    "triggers" TEXT,
    "deescalation" TEXT,
    "whatNotToDo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BehaviourSupportPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "GoalCategory" NOT NULL DEFAULT 'OTHER',
    "status" "GoalStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "targetDate" TIMESTAMP(3),
    "evidenceSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "type" "WorkerType" NOT NULL DEFAULT 'SUPPORT_WORKER',
    "ndisWorkerCheckExpiry" TIMESTAMP(3),
    "firstAidExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerParticipant" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "WorkerParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "status" "ShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "coiAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "coiAcknowledgedAt" TIMESTAMP(3),
    "coiAcknowledgedBy" TEXT,
    "expiredCheckOverride" TEXT,
    "expiredCheckOverrideAt" TIMESTAMP(3),
    "expiredCheckOverrideBy" TEXT,
    "clockInLat" DOUBLE PRECISION,
    "clockInLng" DOUBLE PRECISION,
    "clockInAccuracyM" DOUBLE PRECISION,
    "clockOutLat" DOUBLE PRECISION,
    "clockOutLng" DOUBLE PRECISION,
    "clockOutAccuracyM" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressNote" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "isHandover" BOOLEAN NOT NULL DEFAULT false,
    "inputMethod" "NoteInputMethod" NOT NULL DEFAULT 'KEYBOARD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationRecord" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "medication" TEXT NOT NULL,
    "dose" TEXT,
    "givenAt" TIMESTAMP(3) NOT NULL,
    "givenById" TEXT,
    "notes" TEXT,
    "status" "MedicationStatus" NOT NULL DEFAULT 'GIVEN',
    "missedReason" TEXT,
    "isPrn" BOOLEAN NOT NULL DEFAULT false,
    "prnReason" TEXT,
    "prnOutcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestraintRecord" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "shiftId" TEXT,
    "type" "RestraintType" NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "reason" TEXT NOT NULL,
    "outcome" TEXT,
    "authorisedById" TEXT,
    "createdById" TEXT,
    "bspIdAtTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestraintRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalProvider" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abn" TEXT,
    "ndisRegistrationNumber" TEXT,
    "serviceCategories" TEXT,
    "rating" INTEGER,
    "capacityStatus" TEXT,
    "rateNotes" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScEngagement" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "externalProviderId" TEXT NOT NULL,
    "status" "ScEngagementStatus" NOT NULL DEFAULT 'PROPOSED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "serviceSummary" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escalation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "type" "EscalationType" NOT NULL,
    "status" "EscalationStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "resolution" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Escalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InformalSupport" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" "InformalSupportRelationship" NOT NULL DEFAULT 'FAMILY',
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InformalSupport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalContact" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "type" "ExternalContactType" NOT NULL,
    "organisationName" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "direction" "CommunicationDirection" NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "withParty" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "followUp" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpendEntry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "planBudgetId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "providerName" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpendEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRecord" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "participantId" TEXT,
    "shiftId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "reportedAt" TIMESTAMP(3),
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT NOT NULL,
    "immediateActions" TEXT,
    "reportedToNdisAt" TIMESTAMP(3),
    "createdById" TEXT,
    "source" "IncidentSource" DEFAULT 'QUICK',
    "incidentType" "IncidentType",
    "location" TEXT,
    "narrativeInput" TEXT,
    "medicalAttention" BOOLEAN DEFAULT false,
    "medicalNotes" TEXT,
    "restrictivePractice" BOOLEAN DEFAULT false,
    "restrictiveNotes" TEXT,
    "witnessNames" TEXT,
    "declarationName" TEXT,
    "declarationSignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Org_abn_key" ON "Org"("abn");

-- CreateIndex
CREATE UNIQUE INDEX "Org_ndisRegistrationNumber_key" ON "Org"("ndisRegistrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OrgEntitlement_orgId_portal_key" ON "OrgEntitlement"("orgId", "portal");

-- CreateIndex
CREATE UNIQUE INDEX "ConflictOfInterestForm_orgId_key" ON "ConflictOfInterestForm"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgComplianceContact_orgId_key" ON "OrgComplianceContact"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMembership_userId_orgId_key" ON "OrgMembership"("userId", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerInvite_tokenHash_key" ON "WorkerInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "WorkerInvite_workerId_idx" ON "WorkerInvite"("workerId");

-- CreateIndex
CREATE INDEX "Plan_participantId_status_idx" ON "Plan"("participantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlanBudget_planId_category_key" ON "PlanBudget"("planId", "category");

-- CreateIndex
CREATE INDEX "ServiceAgreement_participantId_status_idx" ON "ServiceAgreement"("participantId", "status");

-- CreateIndex
CREATE INDEX "CarePlan_participantId_status_idx" ON "CarePlan"("participantId", "status");

-- CreateIndex
CREATE INDEX "BehaviourSupportPlan_participantId_status_idx" ON "BehaviourSupportPlan"("participantId", "status");

-- CreateIndex
CREATE INDEX "Goal_carePlanId_status_idx" ON "Goal"("carePlanId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_userId_key" ON "Worker"("userId");

-- CreateIndex
CREATE INDEX "WorkerParticipant_workerId_idx" ON "WorkerParticipant"("workerId");

-- CreateIndex
CREATE INDEX "WorkerParticipant_participantId_idx" ON "WorkerParticipant"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerParticipant_workerId_participantId_key" ON "WorkerParticipant"("workerId", "participantId");

-- CreateIndex
CREATE INDEX "ProgressNote_shiftId_createdAt_idx" ON "ProgressNote"("shiftId", "createdAt");

-- CreateIndex
CREATE INDEX "ProgressNote_shiftId_isHandover_idx" ON "ProgressNote"("shiftId", "isHandover");

-- CreateIndex
CREATE INDEX "MedicationRecord_shiftId_givenAt_idx" ON "MedicationRecord"("shiftId", "givenAt");

-- CreateIndex
CREATE INDEX "RestraintRecord_participantId_usedAt_idx" ON "RestraintRecord"("participantId", "usedAt");

-- CreateIndex
CREATE INDEX "RestraintRecord_orgId_usedAt_idx" ON "RestraintRecord"("orgId", "usedAt");

-- CreateIndex
CREATE INDEX "ExternalProvider_orgId_name_idx" ON "ExternalProvider"("orgId", "name");

-- CreateIndex
CREATE INDEX "ScEngagement_participantId_status_idx" ON "ScEngagement"("participantId", "status");

-- CreateIndex
CREATE INDEX "Escalation_orgId_status_idx" ON "Escalation"("orgId", "status");

-- CreateIndex
CREATE INDEX "Escalation_participantId_openedAt_idx" ON "Escalation"("participantId", "openedAt");

-- CreateIndex
CREATE INDEX "InformalSupport_participantId_idx" ON "InformalSupport"("participantId");

-- CreateIndex
CREATE INDEX "ExternalContact_participantId_type_idx" ON "ExternalContact"("participantId", "type");

-- CreateIndex
CREATE INDEX "CommunicationLog_orgId_occurredAt_idx" ON "CommunicationLog"("orgId", "occurredAt");

-- CreateIndex
CREATE INDEX "CommunicationLog_participantId_occurredAt_idx" ON "CommunicationLog"("participantId", "occurredAt");

-- CreateIndex
CREATE INDEX "SpendEntry_planBudgetId_occurredAt_idx" ON "SpendEntry"("planBudgetId", "occurredAt");

-- CreateIndex
CREATE INDEX "SpendEntry_orgId_occurredAt_idx" ON "SpendEntry"("orgId", "occurredAt");

-- CreateIndex
CREATE INDEX "TrainingRecord_workerId_completedAt_idx" ON "TrainingRecord"("workerId", "completedAt");

-- CreateIndex
CREATE INDEX "TrainingRecord_orgId_expiresAt_idx" ON "TrainingRecord"("orgId", "expiresAt");

-- AddForeignKey
ALTER TABLE "OrgEntitlement" ADD CONSTRAINT "OrgEntitlement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictOfInterestForm" ADD CONSTRAINT "ConflictOfInterestForm_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgComplianceContact" ADD CONSTRAINT "OrgComplianceContact_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerInvite" ADD CONSTRAINT "WorkerInvite_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanBudget" ADD CONSTRAINT "PlanBudget_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAgreement" ADD CONSTRAINT "ServiceAgreement_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviourSupportPlan" ADD CONSTRAINT "BehaviourSupportPlan_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviourSupportPlan" ADD CONSTRAINT "BehaviourSupportPlan_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "CarePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerParticipant" ADD CONSTRAINT "WorkerParticipant_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerParticipant" ADD CONSTRAINT "WorkerParticipant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressNote" ADD CONSTRAINT "ProgressNote_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationRecord" ADD CONSTRAINT "MedicationRecord_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestraintRecord" ADD CONSTRAINT "RestraintRecord_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestraintRecord" ADD CONSTRAINT "RestraintRecord_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalProvider" ADD CONSTRAINT "ExternalProvider_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScEngagement" ADD CONSTRAINT "ScEngagement_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScEngagement" ADD CONSTRAINT "ScEngagement_externalProviderId_fkey" FOREIGN KEY ("externalProviderId") REFERENCES "ExternalProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InformalSupport" ADD CONSTRAINT "InformalSupport_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalContact" ADD CONSTRAINT "ExternalContact_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpendEntry" ADD CONSTRAINT "SpendEntry_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpendEntry" ADD CONSTRAINT "SpendEntry_planBudgetId_fkey" FOREIGN KEY ("planBudgetId") REFERENCES "PlanBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

