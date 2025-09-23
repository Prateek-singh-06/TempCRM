// Enhanced Data Validation Middleware for CRM Relationships
// Implements comprehensive validation for the new enhanced data interlinking system

import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { jwtVerify } from 'jose';

// Types for validation
interface ValidationContext {
  userId: string;
  userRole: string;
  companyIds: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface LeadValidationData {
  name?: string;
  company?: string;
  source?: string;
  contactId?: string;
  primaryContactId?: string;
  qualificationStage?: string;
  leadScore?: number;
  authorityLevel?: string;
  buyingProcessStage?: string;
}

interface OpportunityValidationData {
  name?: string;
  companyId?: string;
  leadId?: string;
  primaryContactId?: string;
  championContactId?: string;
  decisionMakerId?: string;
  stage?: string;
  dealComplexity?: string;
  winProbability?: number;
  dealSize?: number;
}

interface ActivityValidationData {
  type?: string;
  leadId?: string;
  contactId?: string;
  opportunityId?: string;
  companyId?: string;
  effectiveness?: string;
  channel?: string;
  sentiment?: string;
}

// Validation constants
const VALID_QUALIFICATION_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
const VALID_AUTHORITY_LEVELS = ['DECISION_MAKER', 'INFLUENCER', 'GATEKEEPER', 'USER', 'END_USER'];
const VALID_BUYING_STAGES = ['UNAWARE', 'AWARE', 'INTERESTED', 'EVALUATING', 'NEGOTIATING', 'PURCHASE'];
const VALID_OPPORTUNITY_STAGES = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
const VALID_DEAL_COMPLEXITIES = ['LOW', 'MEDIUM', 'HIGH', 'ENTERPRISE'];
const VALID_ACTIVITY_EFFECTIVENESS = ['LOW', 'MEDIUM', 'HIGH', 'EXCELLENT'];
const VALID_COMMUNICATION_CHANNELS = ['EMAIL', 'PHONE', 'MEETING', 'SOCIAL_MEDIA', 'IN_PERSON', 'CHAT', 'WEBSITE', 'OTHER'];
const VALID_SENTIMENT_TYPES = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];

export class EnhancedValidationMiddleware {
  private context: ValidationContext | null = null;

  // Initialize validation context from request
  async initializeContext(request: Request): Promise<ValidationContext> {
    try {
      const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
      if (!token) {
        throw new Error("No authentication token found");
      }

      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);

      if (!payload.userId) {
        throw new Error("Invalid token payload");
      }

      const user = await prisma.users.findUnique({
        where: { email: payload.userId as string },
        select: { id: true, role: true }
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Get user's accessible company IDs
      const companyIds = user.role === 'admin'
        ? await this.getAllCompanyIds()
        : await this.getUserCompanyIds(user.id);

      this.context = {
        userId: user.id.toString(),
        userRole: user.role,
        companyIds: companyIds.map(id => id.toString())
      };

      return this.context as ValidationContext;
    } catch (error) {
      console.error('Validation middleware initialization error:', error);
      throw new Error('Authentication failed');
    }
  }

  // Lead validation with enhanced relationships
  async validateLeadData(data: LeadValidationData): Promise<ValidationResult> {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };

    // Core field validation
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      result.errors.push('Lead name is required and must be a non-empty string');
      result.isValid = false;
    }

    if (!data.company || typeof data.company !== 'string' || data.company.trim().length === 0) {
      result.errors.push('Company is required and must be a non-empty string');
      result.isValid = false;
    }

    if (!data.source || typeof data.source !== 'string' || data.source.trim().length === 0) {
      result.errors.push('Source is required and must be a non-empty string');
      result.isValid = false;
    }

    // Enhanced relationship validation
    if (data.contactId) {
      const contactValid = await this.validateContactRelationship(data.contactId);
      if (!contactValid) {
        result.errors.push('Contact relationship is invalid or access denied');
        result.isValid = false;
      }
    }

    if (data.primaryContactId) {
      const contactValid = await this.validateContactRelationship(data.primaryContactId);
      if (!contactValid) {
        result.errors.push('Primary contact relationship is invalid or access denied');
        result.isValid = false;
      }
    }

    // Enum validation
    if (data.qualificationStage && !VALID_QUALIFICATION_STAGES.includes(data.qualificationStage)) {
      result.errors.push(`Invalid qualification stage. Valid values: ${VALID_QUALIFICATION_STAGES.join(', ')}`);
      result.isValid = false;
    }

    if (data.authorityLevel && !VALID_AUTHORITY_LEVELS.includes(data.authorityLevel)) {
      result.errors.push(`Invalid authority level. Valid values: ${VALID_AUTHORITY_LEVELS.join(', ')}`);
      result.isValid = false;
    }

    if (data.buyingProcessStage && !VALID_BUYING_STAGES.includes(data.buyingProcessStage)) {
      result.errors.push(`Invalid buying process stage. Valid values: ${VALID_BUYING_STAGES.join(', ')}`);
      result.isValid = false;
    }

    // Numeric validation
    if (data.leadScore !== undefined && (typeof data.leadScore !== 'number' || data.leadScore < 0 || data.leadScore > 100)) {
      result.errors.push('Lead score must be a number between 0 and 100');
      result.isValid = false;
    }

    // Warnings for data quality
    if (data.leadScore !== undefined && data.leadScore < 30) {
      result.warnings.push('Lead score is low - consider nurturing strategy');
    }

    if (!data.contactId && !data.primaryContactId) {
      result.warnings.push('No contact relationships specified - consider adding contact information for better lead qualification');
    }

    return result;
  }

  // Opportunity validation with enhanced relationships
  async validateOpportunityData(data: OpportunityValidationData): Promise<ValidationResult> {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };

    // Core field validation
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      result.errors.push('Opportunity name is required and must be a non-empty string');
      result.isValid = false;
    }

    // Relationship validation
    if (data.companyId) {
      const companyValid = await this.validateCompanyAccess(data.companyId);
      if (!companyValid) {
        result.errors.push('Company relationship is invalid or access denied');
        result.isValid = false;
      }
    }

    if (data.leadId) {
      const leadValid = await this.validateLeadRelationship(data.leadId);
      if (!leadValid) {
        result.errors.push('Lead relationship is invalid or access denied');
        result.isValid = false;
      }
    }

    // Contact relationship validation
    if (data.primaryContactId) {
      const contactValid = await this.validateContactRelationship(data.primaryContactId, data.companyId);
      if (!contactValid) {
        result.errors.push('Primary contact relationship is invalid or does not belong to the opportunity company');
        result.isValid = false;
      }
    }

    if (data.championContactId) {
      const contactValid = await this.validateContactRelationship(data.championContactId, data.companyId);
      if (!contactValid) {
        result.errors.push('Champion contact relationship is invalid or does not belong to the opportunity company');
        result.isValid = false;
      }
    }

    if (data.decisionMakerId) {
      const contactValid = await this.validateContactRelationship(data.decisionMakerId, data.companyId);
      if (!contactValid) {
        result.errors.push('Decision maker contact relationship is invalid or does not belong to the opportunity company');
        result.isValid = false;
      }
    }

    // Enum validation
    if (data.stage && !VALID_OPPORTUNITY_STAGES.includes(data.stage)) {
      result.errors.push(`Invalid opportunity stage. Valid values: ${VALID_OPPORTUNITY_STAGES.join(', ')}`);
      result.isValid = false;
    }

    if (data.dealComplexity && !VALID_DEAL_COMPLEXITIES.includes(data.dealComplexity)) {
      result.errors.push(`Invalid deal complexity. Valid values: ${VALID_DEAL_COMPLEXITIES.join(', ')}`);
      result.isValid = false;
    }

    // Numeric validation
    if (data.winProbability !== undefined && (typeof data.winProbability !== 'number' || data.winProbability < 0 || data.winProbability > 100)) {
      result.errors.push('Win probability must be a number between 0 and 100');
      result.isValid = false;
    }

    if (data.dealSize !== undefined && (typeof data.dealSize !== 'number' || data.dealSize < 0)) {
      result.errors.push('Deal size must be a positive number');
      result.isValid = false;
    }

    // Business logic validation
    if (data.stage === 'CLOSED_WON' && (!data.dealSize || data.dealSize <= 0)) {
      result.errors.push('Closed won opportunities must have a deal size greater than 0');
      result.isValid = false;
    }

    // Warnings
    if (data.dealSize && data.dealSize > 200000 && data.dealComplexity !== 'ENTERPRISE') {
      result.warnings.push('High deal value detected - consider upgrading deal complexity to ENTERPRISE');
    }

    if (!data.primaryContactId && !data.championContactId && !data.decisionMakerId) {
      result.warnings.push('No contact relationships specified - consider adding decision maker contacts for better opportunity management');
    }

    return result;
  }

  // Activity validation with cross-entity relationships
  async validateActivityData(data: ActivityValidationData): Promise<ValidationResult> {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };

    // Core field validation
    if (!data.type || typeof data.type !== 'string' || data.type.trim().length === 0) {
      result.errors.push('Activity type is required');
      result.isValid = false;
    }

    // Cross-entity relationship validation (ensure at least one relationship exists)
    const hasRelationship = data.leadId || data.contactId || data.opportunityId || data.companyId;
    if (!hasRelationship) {
      result.errors.push('Activity must be linked to at least one entity (lead, contact, opportunity, or company)');
      result.isValid = false;
    }

    // Individual relationship validation
    if (data.leadId) {
      const leadValid = await this.validateLeadRelationship(data.leadId);
      if (!leadValid) {
        result.errors.push('Lead relationship is invalid or access denied');
        result.isValid = false;
      }
    }

    if (data.contactId) {
      const contactValid = await this.validateContactRelationship(data.contactId);
      if (!contactValid) {
        result.errors.push('Contact relationship is invalid or access denied');
        result.isValid = false;
      }
    }

    if (data.opportunityId) {
      const opportunityValid = await this.validateOpportunityRelationship(data.opportunityId);
      if (!opportunityValid) {
        result.errors.push('Opportunity relationship is invalid or access denied');
        result.isValid = false;
      }
    }

    if (data.companyId) {
      const companyValid = await this.validateCompanyAccess(data.companyId);
      if (!companyValid) {
        result.errors.push('Company relationship is invalid or access denied');
        result.isValid = false;
      }
    }

    // Enum validation
    if (data.effectiveness && !VALID_ACTIVITY_EFFECTIVENESS.includes(data.effectiveness)) {
      result.errors.push(`Invalid effectiveness level. Valid values: ${VALID_ACTIVITY_EFFECTIVENESS.join(', ')}`);
      result.isValid = false;
    }

    if (data.channel && !VALID_COMMUNICATION_CHANNELS.includes(data.channel)) {
      result.errors.push(`Invalid communication channel. Valid values: ${VALID_COMMUNICATION_CHANNELS.join(', ')}`);
      result.isValid = false;
    }

    if (data.sentiment && !VALID_SENTIMENT_TYPES.includes(data.sentiment)) {
      result.errors.push(`Invalid sentiment type. Valid values: ${VALID_SENTIMENT_TYPES.join(', ')}`);
      result.isValid = false;
    }

    // Warnings
    if (data.effectiveness === 'LOW') {
      result.warnings.push('Low effectiveness activity detected - consider reviewing communication strategy');
    }

    if (data.sentiment === 'NEGATIVE') {
      result.warnings.push('Negative sentiment detected - consider follow-up to address concerns');
    }

    return result;
  }

  // Bulk validation for data imports
  async validateBulkData<T extends Record<string, unknown>>(
    data: T[],
    validator: (item: T) => Promise<ValidationResult>
  ): Promise<{ validItems: T[]; invalidItems: Array<{ item: T; errors: string[]; warnings: string[] }> }> {
    const validItems: T[] = [];
    const invalidItems: Array<{ item: T; errors: string[]; warnings: string[] }> = [];

    for (const item of data) {
      const validationResult = await validator(item);
      if (validationResult.isValid) {
        validItems.push(item);
      } else {
        invalidItems.push({
          item,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        });
      }
    }

    return { validItems, invalidItems };
  }

  // Helper methods for relationship validation
  private async validateContactRelationship(contactId: string, companyId?: string): Promise<boolean> {
    if (!this.context) return false;

    try {
      const contact = await prisma.contacts.findFirst({
        where: {
          id: parseInt(contactId),
          ...(companyId && { companyId: parseInt(companyId) }),
          ...(this.context.userRole !== 'admin' && {
            companyId: { in: this.context.companyIds.map(id => parseInt(id)) }
          })
        }
      });

      return !!contact;
    } catch (error) {
      console.error('Contact validation error:', error);
      return false;
    }
  }

  private async validateLeadRelationship(leadId: string): Promise<boolean> {
    if (!this.context) return false;

    try {
      const lead = await prisma.leads.findFirst({
        where: {
          id: parseInt(leadId),
          ...(this.context.userRole !== 'admin' && { ownerId: parseInt(this.context.userId) })
        }
      });

      return !!lead;
    } catch (error) {
      console.error('Lead validation error:', error);
      return false;
    }
  }

  private async validateOpportunityRelationship(opportunityId: string): Promise<boolean> {
    if (!this.context) return false;

    try {
      const opportunity = await prisma.opportunities.findFirst({
        where: {
          id: parseInt(opportunityId),
          ...(this.context.userRole !== 'admin' && { ownerId: parseInt(this.context.userId) })
        }
      });

      return !!opportunity;
    } catch (error) {
      console.error('Opportunity validation error:', error);
      return false;
    }
  }

  private async validateCompanyAccess(companyId: string): Promise<boolean> {
    if (!this.context) return false;

    try {
      const company = await prisma.companies.findFirst({
        where: {
          id: parseInt(companyId),
          ...(this.context.userRole !== 'admin' && {
            ownerId: parseInt(this.context.userId)
          })
        }
      });

      return !!company;
    } catch (error) {
      console.error('Company validation error:', error);
      return false;
    }
  }

  private async getAllCompanyIds(): Promise<number[]> {
    try {
      const companies = await prisma.companies.findMany({ select: { id: true } });
      return companies.map(c => c.id);
    } catch (error) {
      console.error('Error fetching company IDs:', error);
      return [];
    }
  }

  private async getUserCompanyIds(userId: number): Promise<number[]> {
    try {
      const companies = await prisma.companies.findMany({
        where: { ownerId: userId },
        select: { id: true }
      });
      return companies.map(c => c.id);
    } catch (error) {
      console.error('Error fetching user company IDs:', error);
      return [];
    }
  }
}

// Factory function to create validation middleware
export function createValidationMiddleware() {
  return new EnhancedValidationMiddleware();
}

// Express-style middleware for Next.js API routes
export function withValidation(handler: (...args: unknown[]) => Promise<Response> | Response, validator?: (...args: unknown[]) => Promise<ValidationResult>) {
  return async (request: Request, ...args: unknown[]) => {
    try {
      const validationMiddleware = createValidationMiddleware();
      await validationMiddleware.initializeContext(request);

      if (validator) {
        const body = await request.clone().json().catch(() => ({}));
        const validationResult = await validator.call(validationMiddleware, body);

        if (!validationResult.isValid) {
          return NextResponse.json({
            error: 'Validation failed',
            details: validationResult.errors,
            warnings: validationResult.warnings
          }, { status: 400 });
        }

        // Add validation context to request for use in handler
        (request as Request & { validationContext?: EnhancedValidationMiddleware; validationResult?: ValidationResult }).validationContext = validationMiddleware;
        (request as Request & { validationContext?: EnhancedValidationMiddleware; validationResult?: ValidationResult }).validationResult = validationResult;
      }

      return handler(request, ...args);
    } catch (error) {
      console.error('Validation middleware error:', error);
      return NextResponse.json({
        error: 'Validation middleware failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  };
}

// Utility functions for common validations
export const validators = {
  lead: (middleware: EnhancedValidationMiddleware) =>
    (data: LeadValidationData) => middleware.validateLeadData(data),

  opportunity: (middleware: EnhancedValidationMiddleware) =>
    (data: OpportunityValidationData) => middleware.validateOpportunityData(data),

  activity: (middleware: EnhancedValidationMiddleware) =>
    (data: ActivityValidationData) => middleware.validateActivityData(data)
};
