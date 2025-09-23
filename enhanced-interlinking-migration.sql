-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('CALL', 'VISIT', 'MEETING', 'EMAIL', 'DEMO', 'PROPOSAL', 'FOLLOW_UP', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'AUTO_FLAGGED', 'AMENDED');

-- CreateEnum
CREATE TYPE "public"."CompanyRating" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'PREMIUM');

-- CreateEnum
CREATE TYPE "public"."CompanyType" AS ENUM ('FULL_GOVT', 'JOINT_STOCK', 'PRIVATE');

-- CreateEnum
CREATE TYPE "public"."ComplianceStatus" AS ENUM ('COMPLIANT', 'WARNING', 'CRITICAL', 'BREACHED');

-- CreateEnum
CREATE TYPE "public"."DealCategory" AS ENUM ('MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "public"."DealClassification" AS ENUM ('ENTERPRISE', 'MID_MARKET', 'SMALL_BUSINESS');

-- CreateEnum
CREATE TYPE "public"."ContactEngagementLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VIP');

-- CreateEnum
CREATE TYPE "public"."InfluenceLevel" AS ENUM ('DECISION_MAKER', 'INFLUENCER', 'GATEKEEPER', 'USER', 'END_USER');

-- CreateEnum
CREATE TYPE "public"."BuyingProcessStage" AS ENUM ('UNAWARE', 'AWARE', 'INTERESTED', 'EVALUATING', 'NEGOTIATING', 'PURCHASE');

-- CreateEnum
CREATE TYPE "public"."LeadQualificationStage" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "public"."DealComplexity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "public"."CommunicationChannel" AS ENUM ('EMAIL', 'PHONE', 'MEETING', 'SOCIAL_MEDIA', 'IN_PERSON', 'CHAT', 'WEBSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."SentimentType" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "public"."EffectivenessLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EXCELLENT');

-- CreateEnum
CREATE TYPE "public"."DealStatus" AS ENUM ('BIDDING', 'ONGOING', 'WON', 'LOST', 'ON_HOLD', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."FollowUpStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'POSTPONED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."FollowUpType" AS ENUM ('CALL', 'MEETING', 'EMAIL', 'MESSAGE', 'SITE_VISIT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."HealthStatus" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."OpportunityStage" AS ENUM ('PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "public"."ProjectStatus" AS ENUM ('ONGOING', 'BIDDING', 'DESIGN', 'COMPLETED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "public"."QualityScore" AS ENUM ('POOR', 'FAIR', 'GOOD', 'VERY_GOOD', 'EXCELLENT');

-- CreateEnum
CREATE TYPE "public"."QuotationStatus" AS ENUM ('PENDING', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."SalesStatus" AS ENUM ('BIDDING', 'ONGOING', 'AWARDED', 'LOST', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."UrgencyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "public"."activities" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "leadId" INTEGER,
    "type" "public"."ActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "outcome" TEXT,
    "nextAction" TEXT,
    "nextActionDate" TIMESTAMP(3),
    "evidenceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contactId" INTEGER,
    "opportunityId" INTEGER,
    "companyId" INTEGER,
    "activityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "effectiveness" "public"."EffectivenessLevel",
    "channel" "public"."CommunicationChannel",
    "sentiment" "public"."SentimentType",
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpScheduled" BOOLEAN NOT NULL DEFAULT false,
    "responseReceived" BOOLEAN NOT NULL DEFAULT false,
    "responseTime" INTEGER,
    "engagementQuality" "public"."EffectivenessLevel",

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attendances" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitReport" TEXT NOT NULL,
    "timelineUrl" TEXT,
    "photoUrl" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."AttendanceStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewerId" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "locationTimestamp" TIMESTAMP(3),
    "locationSource" TEXT,
    "locationAccuracyLevel" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "locationProvider" TEXT,
    "isLocationValid" BOOLEAN DEFAULT true,
    "locationRiskLevel" TEXT,
    "distanceFromLastLocation" DOUBLE PRECISION,
    "locationValidationWarnings" TEXT,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."companies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT,
    "website" TEXT,
    "totalOpportunities" INTEGER NOT NULL DEFAULT 0,
    "openDeals" INTEGER NOT NULL DEFAULT 0,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" INTEGER NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contacts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "companyId" INTEGER NOT NULL,
    "contactScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lastInteraction" TIMESTAMP(3),
    "engagementLevel" "public"."ContactEngagementLevel" NOT NULL DEFAULT 'LOW',
    "influenceLevel" "public"."InfluenceLevel",
    "buyingStage" "public"."BuyingProcessStage",
    "painPoints" TEXT,
    "preferredChannel" "public"."CommunicationChannel",

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."daily_follow_ups" (
    "id" SERIAL NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "actionType" "public"."FollowUpType" NOT NULL,
    "actionDescription" TEXT NOT NULL,
    "status" "public"."FollowUpStatus" NOT NULL DEFAULT 'SCHEDULED',
    "followUpDate" TIMESTAMP(3) NOT NULL,
    "followUpPhoto" TEXT,
    "notes" TEXT,
    "effectivenessScore" DOUBLE PRECISION,
    "completionQuality" "public"."QualityScore",
    "optimalTimeSlot" TEXT,
    "timezone" TEXT,
    "responseReceived" BOOLEAN NOT NULL DEFAULT false,
    "responseQuality" "public"."QualityScore",
    "nextActionDate" TIMESTAMP(3),
    "nextActionNotes" TEXT,
    "createdById" INTEGER NOT NULL,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" INTEGER,
    "salesDealId" INTEGER,
    "immediateSaleId" INTEGER,
    "leadId" INTEGER,
    "contactId" INTEGER,
    "opportunityId" INTEGER,
    "companyId" INTEGER,
    "priorityScore" INTEGER NOT NULL DEFAULT 1,
    "urgencyLevel" "public"."UrgencyLevel" NOT NULL DEFAULT 'MEDIUM',
    "automatedTrigger" BOOLEAN NOT NULL DEFAULT false,
    "triggerSource" TEXT,
    "expectedOutcome" TEXT,
    "actualOutcome" TEXT,
    "timeSpent" INTEGER,
    "channelUsed" "public"."CommunicationChannel",
    "sentimentAnalysis" "public"."SentimentType",
    "engagementQuality" "public"."EffectivenessLevel",
    "conversionImpact" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "customerSatisfaction" DOUBLE PRECISION,

    CONSTRAINT "daily_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."forecasts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "target" INTEGER NOT NULL DEFAULT 0,
    "achieved" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."immediate_sales" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER,
    "ownerId" INTEGER NOT NULL,
    "contractor" TEXT,
    "sizeClass" TEXT,
    "km" DOUBLE PRECISION,
    "mt" DOUBLE PRECISION,
    "valueOfOrder" DOUBLE PRECISION,
    "dealCategory" "public"."DealCategory" NOT NULL DEFAULT 'SMALL',
    "urgencyLevel" "public"."UrgencyLevel" NOT NULL DEFAULT 'MEDIUM',
    "quotationDate" TIMESTAMP(3),
    "status" "public"."SalesStatus" NOT NULL DEFAULT 'BIDDING',
    "pic" TEXT,
    "lastActivityDate" TIMESTAMP(3),
    "nextFollowUpDate" TIMESTAMP(3),
    "followUpCount" INTEGER NOT NULL DEFAULT 0,
    "conversionProbability" DOUBLE PRECISION,
    "estimatedCloseDate" TIMESTAMP(3),
    "provinceWaterMappingId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "immediate_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leads" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "ownerId" INTEGER NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contactId" INTEGER,
    "primaryContactId" INTEGER,
    "leadScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "qualificationStage" "public"."LeadQualificationStage" NOT NULL DEFAULT 'NEW',
    "budgetRange" TEXT,
    "timeline" TEXT,
    "decisionMaker" TEXT,
    "painPoints" TEXT,
    "authorityLevel" "public"."InfluenceLevel",
    "buyingProcessStage" "public"."BuyingProcessStage",
    "autoQualificationScore" DOUBLE PRECISION DEFAULT 0.0,
    "lastActivityDate" TIMESTAMP(3),
    "nextFollowUpDate" TIMESTAMP(3),
    "engagementScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "url" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "senderId" INTEGER,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."opportunities" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER,
    "leadId" INTEGER,
    "name" TEXT NOT NULL,
    "stage" "public"."OpportunityStage" NOT NULL DEFAULT 'PROSPECTING',
    "dealSize" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "classification" "public"."DealClassification",
    "expectedCloseDate" TIMESTAMP(3),
    "nextFollowupDate" TIMESTAMP(3),
    "lastActivityDate" TIMESTAMP(3),
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lostReason" TEXT,
    "wonDate" TIMESTAMP(3),
    "closedValue" DOUBLE PRECISION,
    "primaryContactId" INTEGER,
    "secondaryContactIds" INTEGER[],
    "championContactId" INTEGER,
    "decisionMakerId" INTEGER,
    "winProbability" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "competitorAnalysis" TEXT,
    "uniqueValueProposition" TEXT,
    "riskFactors" TEXT,
    "timeToClose" INTEGER,
    "dealComplexity" "public"."DealComplexity" NOT NULL DEFAULT 'MEDIUM',
    "stageVelocity" INTEGER,
    "totalTimeInPipeline" INTEGER,
    "bottleneckRisk" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "conversionConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "autoUpdateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "nextActionRequired" BOOLEAN NOT NULL DEFAULT false,
    "nextActionType" TEXT,
    "nextActionDue" TIMESTAMP(3),
    "ownerId" INTEGER NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."otps" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pending_quotations" (
    "id" SERIAL NOT NULL,
    "projectOrClientName" TEXT NOT NULL,
    "projectId" INTEGER,
    "immediateSaleId" INTEGER,
    "salesDealId" INTEGER,
    "quotationPendingSince" TIMESTAMP(3),
    "quotationDeadline" TIMESTAMP(3),
    "orderValue" DOUBLE PRECISION,
    "contactPerson" TEXT,
    "contactEmail" TEXT,
    "quotationDocument" TEXT,
    "status" "public"."QuotationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "daysPending" INTEGER,
    "daysToDeadline" INTEGER,
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "urgencyLevel" "public"."UrgencyLevel" NOT NULL DEFAULT 'MEDIUM',
    "lastReminderSent" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "complianceStatus" "public"."ComplianceStatus" NOT NULL DEFAULT 'COMPLIANT',
    "responseProbability" DOUBLE PRECISION,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."privacySettings" (
    "id" SERIAL NOT NULL,
    "profileVisibility" TEXT NOT NULL DEFAULT 'team',
    "showEmail" BOOLEAN NOT NULL DEFAULT false,
    "showPhone" BOOLEAN NOT NULL DEFAULT true,
    "showLocation" BOOLEAN NOT NULL DEFAULT true,
    "allowMessages" BOOLEAN NOT NULL DEFAULT true,
    "showActivity" BOOLEAN NOT NULL DEFAULT true,
    "userEmail" TEXT NOT NULL,

    CONSTRAINT "privacySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "funding" TEXT,
    "consultant" TEXT,
    "contractor" TEXT,
    "competitors" TEXT,
    "sizeClass" TEXT,
    "unitOfMeasurement" TEXT,
    "approxMT" DOUBLE PRECISION,
    "status" "public"."ProjectStatus" NOT NULL DEFAULT 'ONGOING',
    "monthOfQuote" TEXT,
    "dateOfStartProcurement" TIMESTAMP(3),
    "pic" TEXT,
    "assignedAdminId" INTEGER,
    "projectHealth" "public"."HealthStatus" NOT NULL DEFAULT 'GOOD',
    "riskLevel" "public"."RiskLevel" NOT NULL DEFAULT 'LOW',
    "completionProbability" DOUBLE PRECISION,
    "provinceWaterMappingId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."province_water_mappings" (
    "id" SERIAL NOT NULL,
    "waterCompany" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "companyType" "public"."CompanyType" NOT NULL DEFAULT 'PRIVATE',
    "waterCompanyContacts" TEXT,
    "contractors" TEXT,
    "contractorContacts" TEXT,
    "traders" TEXT,
    "traderContacts" TEXT,
    "consultants" TEXT,
    "consultantContacts" TEXT,
    "pic" TEXT,
    "companyRating" "public"."CompanyRating" NOT NULL DEFAULT 'MEDIUM',
    "reliabilityScore" DOUBLE PRECISION,
    "lastInteractionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "province_water_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."push_subscriptions" (
    "id" SERIAL NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sales_deals" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" INTEGER,
    "currentStatus" "public"."DealStatus" NOT NULL DEFAULT 'BIDDING',
    "orderValue" DOUBLE PRECISION,
    "ownerId" INTEGER NOT NULL,
    "contractor" TEXT,
    "consultant" TEXT,
    "pipeSizeClass" TEXT,
    "length" DOUBLE PRECISION,
    "tonnage" DOUBLE PRECISION,
    "expectedCloseDate" TIMESTAMP(3),
    "province" TEXT,
    "keyContact" TEXT,
    "dealPhotos" TEXT,
    "isQuotationPending" BOOLEAN NOT NULL DEFAULT false,
    "dealHealth" "public"."HealthStatus" NOT NULL DEFAULT 'GOOD',
    "conversionProbability" DOUBLE PRECISION,
    "riskLevel" "public"."RiskLevel" NOT NULL DEFAULT 'LOW',
    "provinceWaterMappingId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ml_predictions" (
    "id" SERIAL NOT NULL,
    "modelType" TEXT NOT NULL,
    "predictionType" TEXT NOT NULL,
    "targetId" TEXT,
    "predictedValue" DOUBLE PRECISION,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "actualValue" DOUBLE PRECISION,
    "predictionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualDate" TIMESTAMP(3),
    "accuracy" DOUBLE PRECISION,
    "features" JSONB,
    "modelVersion" TEXT NOT NULL DEFAULT 'v1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ml_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ml_model_performance" (
    "id" SERIAL NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelType" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "datasetSize" INTEGER NOT NULL,
    "timeRange" TEXT,
    "trainingDuration" INTEGER,
    "lastTrained" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_model_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ml_customer_segments" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "segmentName" TEXT NOT NULL,
    "segmentScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "behavioralFactors" JSONB,
    "clusterFeatures" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_customer_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ml_anomalies" (
    "id" SERIAL NOT NULL,
    "anomalyType" TEXT NOT NULL,
    "entityId" TEXT,
    "entityType" TEXT,
    "anomalyScore" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'detected',
    "investigatedBy" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'user',
    "department" TEXT,
    "bio" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "avatar" TEXT,
    "avatarThumbnail" TEXT,
    "avatarMedium" TEXT,
    "avatarLarge" TEXT,
    "avatarFileName" TEXT,
    "avatarFileSize" INTEGER,
    "avatarMimeType" TEXT,
    "avatarUploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enableNotifications" BOOLEAN NOT NULL DEFAULT true,
    "notificationPreferences" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_ImmediateSaleToSalesDeal" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ImmediateSaleToSalesDeal_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "activities_leadId_idx" ON "public"."activities"("leadId");

-- CreateIndex
CREATE INDEX "activities_contactId_idx" ON "public"."activities"("contactId");

-- CreateIndex
CREATE INDEX "activities_opportunityId_idx" ON "public"."activities"("opportunityId");

-- CreateIndex
CREATE INDEX "activities_companyId_idx" ON "public"."activities"("companyId");

-- CreateIndex
CREATE INDEX "activities_occurredAt_idx" ON "public"."activities"("occurredAt");

-- CreateIndex
CREATE INDEX "activities_type_idx" ON "public"."activities"("type");

-- CreateIndex
CREATE INDEX "activities_userId_occurredAt_idx" ON "public"."activities"("userId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_userId_date_key" ON "public"."attendances"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "public"."companies"("name");

-- CreateIndex
CREATE INDEX "contacts_companyId_idx" ON "public"."contacts"("companyId");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "public"."contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_contactScore_idx" ON "public"."contacts"("contactScore");

-- CreateIndex
CREATE INDEX "contacts_engagementLevel_idx" ON "public"."contacts"("engagementLevel");

-- CreateIndex
CREATE INDEX "daily_follow_ups_projectId_idx" ON "public"."daily_follow_ups"("projectId");

-- CreateIndex
CREATE INDEX "daily_follow_ups_salesDealId_idx" ON "public"."daily_follow_ups"("salesDealId");

-- CreateIndex
CREATE INDEX "daily_follow_ups_immediateSaleId_idx" ON "public"."daily_follow_ups"("immediateSaleId");

-- CreateIndex
CREATE INDEX "daily_follow_ups_leadId_idx" ON "public"."daily_follow_ups"("leadId");

-- CreateIndex
CREATE INDEX "daily_follow_ups_contactId_idx" ON "public"."daily_follow_ups"("contactId");

-- CreateIndex
CREATE INDEX "daily_follow_ups_opportunityId_idx" ON "public"."daily_follow_ups"("opportunityId");

-- CreateIndex
CREATE INDEX "daily_follow_ups_companyId_idx" ON "public"."daily_follow_ups"("companyId");

-- CreateIndex
CREATE INDEX "daily_follow_ups_followUpDate_idx" ON "public"."daily_follow_ups"("followUpDate");

-- CreateIndex
CREATE INDEX "daily_follow_ups_status_idx" ON "public"."daily_follow_ups"("status");

-- CreateIndex
CREATE INDEX "daily_follow_ups_priorityScore_idx" ON "public"."daily_follow_ups"("priorityScore");

-- CreateIndex
CREATE INDEX "daily_follow_ups_createdById_status_idx" ON "public"."daily_follow_ups"("createdById", "status");

-- CreateIndex
CREATE UNIQUE INDEX "forecasts_userId_year_month_region_key" ON "public"."forecasts"("userId", "year", "month", "region");

-- CreateIndex
CREATE INDEX "leads_contactId_idx" ON "public"."leads"("contactId");

-- CreateIndex
CREATE INDEX "leads_primaryContactId_idx" ON "public"."leads"("primaryContactId");

-- CreateIndex
CREATE INDEX "leads_qualificationStage_idx" ON "public"."leads"("qualificationStage");

-- CreateIndex
CREATE INDEX "leads_leadScore_idx" ON "public"."leads"("leadScore");

-- CreateIndex
CREATE INDEX "leads_ownerId_status_idx" ON "public"."leads"("ownerId", "status");

-- CreateIndex
CREATE INDEX "opportunities_companyId_idx" ON "public"."opportunities"("companyId");

-- CreateIndex
CREATE INDEX "opportunities_leadId_idx" ON "public"."opportunities"("leadId");

-- CreateIndex
CREATE INDEX "opportunities_stage_idx" ON "public"."opportunities"("stage");

-- CreateIndex
CREATE INDEX "opportunities_probability_idx" ON "public"."opportunities"("probability");

-- CreateIndex
CREATE INDEX "opportunities_primaryContactId_idx" ON "public"."opportunities"("primaryContactId");

-- CreateIndex
CREATE INDEX "opportunities_championContactId_idx" ON "public"."opportunities"("championContactId");

-- CreateIndex
CREATE INDEX "opportunities_decisionMakerId_idx" ON "public"."opportunities"("decisionMakerId");

-- CreateIndex
CREATE INDEX "opportunities_expectedCloseDate_idx" ON "public"."opportunities"("expectedCloseDate");

-- CreateIndex
CREATE INDEX "opportunities_ownerId_stage_idx" ON "public"."opportunities"("ownerId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "otps_email_key" ON "public"."otps"("email");

-- CreateIndex
CREATE UNIQUE INDEX "privacySettings_userEmail_key" ON "public"."privacySettings"("userEmail");

-- CreateIndex
CREATE UNIQUE INDEX "province_water_mappings_waterCompany_key" ON "public"."province_water_mappings"("waterCompany");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "public"."push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "ml_predictions_modelType_predictionDate_idx" ON "public"."ml_predictions"("modelType", "predictionDate");

-- CreateIndex
CREATE INDEX "ml_predictions_targetId_idx" ON "public"."ml_predictions"("targetId");

-- CreateIndex
CREATE INDEX "ml_model_performance_modelName_lastTrained_idx" ON "public"."ml_model_performance"("modelName", "lastTrained");

-- CreateIndex
CREATE UNIQUE INDEX "ml_model_performance_modelName_metricName_timeRange_key" ON "public"."ml_model_performance"("modelName", "metricName", "timeRange");

-- CreateIndex
CREATE INDEX "ml_customer_segments_customerId_idx" ON "public"."ml_customer_segments"("customerId");

-- CreateIndex
CREATE INDEX "ml_customer_segments_segmentName_idx" ON "public"."ml_customer_segments"("segmentName");

-- CreateIndex
CREATE INDEX "ml_anomalies_anomalyType_detectedAt_idx" ON "public"."ml_anomalies"("anomalyType", "detectedAt");

-- CreateIndex
CREATE INDEX "ml_anomalies_entityId_idx" ON "public"."ml_anomalies"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeCode_key" ON "public"."users"("employeeCode");

-- CreateIndex
CREATE INDEX "_ImmediateSaleToSalesDeal_B_index" ON "public"."_ImmediateSaleToSalesDeal"("B");

-- AddForeignKey
ALTER TABLE "public"."activities" ADD CONSTRAINT "activities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activities" ADD CONSTRAINT "activities_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activities" ADD CONSTRAINT "activities_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activities" ADD CONSTRAINT "activities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendances" ADD CONSTRAINT "attendances_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendances" ADD CONSTRAINT "attendances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contacts" ADD CONSTRAINT "contacts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_follow_ups" ADD CONSTRAINT "daily_follow_ups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_follow_ups" ADD CONSTRAINT "daily_follow_ups_immediateSaleId_fkey" FOREIGN KEY ("immediateSaleId") REFERENCES "public"."immediate_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_follow_ups" ADD CONSTRAINT "daily_follow_ups_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_follow_ups" ADD CONSTRAINT "daily_follow_ups_salesDealId_fkey" FOREIGN KEY ("salesDealId") REFERENCES "public"."sales_deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_follow_ups" ADD CONSTRAINT "daily_follow_ups_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_follow_ups" ADD CONSTRAINT "daily_follow_ups_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_follow_ups" ADD CONSTRAINT "daily_follow_ups_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_follow_ups" ADD CONSTRAINT "daily_follow_ups_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."forecasts" ADD CONSTRAINT "forecasts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."immediate_sales" ADD CONSTRAINT "immediate_sales_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."immediate_sales" ADD CONSTRAINT "immediate_sales_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."immediate_sales" ADD CONSTRAINT "immediate_sales_provinceWaterMappingId_fkey" FOREIGN KEY ("provinceWaterMappingId") REFERENCES "public"."province_water_mappings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leads" ADD CONSTRAINT "leads_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leads" ADD CONSTRAINT "leads_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leads" ADD CONSTRAINT "leads_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."opportunities" ADD CONSTRAINT "opportunities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."opportunities" ADD CONSTRAINT "opportunities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."opportunities" ADD CONSTRAINT "opportunities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."opportunities" ADD CONSTRAINT "opportunities_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."opportunities" ADD CONSTRAINT "opportunities_championContactId_fkey" FOREIGN KEY ("championContactId") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."opportunities" ADD CONSTRAINT "opportunities_decisionMakerId_fkey" FOREIGN KEY ("decisionMakerId") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pending_quotations" ADD CONSTRAINT "pending_quotations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pending_quotations" ADD CONSTRAINT "pending_quotations_immediateSaleId_fkey" FOREIGN KEY ("immediateSaleId") REFERENCES "public"."immediate_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pending_quotations" ADD CONSTRAINT "pending_quotations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pending_quotations" ADD CONSTRAINT "pending_quotations_salesDealId_fkey" FOREIGN KEY ("salesDealId") REFERENCES "public"."sales_deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."privacySettings" ADD CONSTRAINT "privacySettings_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_provinceWaterMappingId_fkey" FOREIGN KEY ("provinceWaterMappingId") REFERENCES "public"."province_water_mappings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales_deals" ADD CONSTRAINT "sales_deals_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales_deals" ADD CONSTRAINT "sales_deals_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales_deals" ADD CONSTRAINT "sales_deals_provinceWaterMappingId_fkey" FOREIGN KEY ("provinceWaterMappingId") REFERENCES "public"."province_water_mappings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ImmediateSaleToSalesDeal" ADD CONSTRAINT "_ImmediateSaleToSalesDeal_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."immediate_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ImmediateSaleToSalesDeal" ADD CONSTRAINT "_ImmediateSaleToSalesDeal_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."sales_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

