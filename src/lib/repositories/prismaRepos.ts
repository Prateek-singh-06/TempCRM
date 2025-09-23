import { prisma } from '@/lib/prisma';
import { AttendanceRecord, LeadRecord, CompanyRecord, OpportunityRecord, ActivityRecord } from '@/lib/types';

// Server-side only - prevent client-side usage
if (typeof window !== 'undefined') {
  throw new Error('Prisma repositories can only be used on the server side');
}

export class PrismaAttendanceRepo {
  async upsert(record: AttendanceRecord): Promise<void> {
    const existing = await prisma.attendances.findFirst({
      where: {
        userId: parseInt(record.userId),
        date: new Date(record.dateIST)
      }
    });

    const data = {
      userId: parseInt(record.userId),
      date: new Date(record.dateIST),
      visitReport: record.note,
      timelineUrl: record.timelineScreenshotUrl || null,
      photoUrl: record.selfieUrl || null,
      status: record.status as "SUBMITTED" | "APPROVED" | "REJECTED",
      // Add comprehensive location fields
      latitude: record.clientLat || null,
      longitude: record.clientLng || null,
      accuracy: record.clientAccuracyM || null,
      altitude: record.clientAltitude || null,
      speed: record.clientSpeed || null,
      heading: record.clientHeading || null,
      locationTimestamp: record.clientLocationTimestamp ? new Date(record.clientLocationTimestamp) : null,
      locationSource: record.clientLocationMethod || null,
      locationAccuracyLevel: record.clientLocationAccuracyLevel || null,
      address: record.clientAddress || null,
      city: record.clientCity || null,
      state: record.clientState || null,
      country: record.clientCountry || null,
      postalCode: record.clientPostalCode || null,
      locationProvider: record.clientLocationProvider || null,
      isLocationValid: record.clientLocationInfo?.isValidLocation ?? true,
      locationValidationWarnings: record.clientLocationWarnings ? JSON.stringify(record.clientLocationWarnings) : null
    };

    if (existing) {
      await prisma.attendances.update({
        where: { id: existing.id },
        data
      });
    } else {
      await prisma.attendances.create({ data });
    }
  }

  async findByUserDate(userId: string, dateIST: string): Promise<AttendanceRecord | null> {
    const targetDate = new Date(dateIST + 'T00:00:00.000Z');
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const attendance = await prisma.attendances.findFirst({
      where: {
        userId: parseInt(userId),
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        users_attendances_userIdTousers: {
          select: {
            name: true,
            email: true,
            employeeCode: true,
            role: true,
            location: true
          }
        },
        users_attendances_reviewerIdTousers: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!attendance) return null;

    return {
      id: attendance.id.toString(),
      userId: attendance.userId.toString(),
      dateIST,
      submittedAtUTC: attendance.submittedAt.toISOString(),
      note: attendance.visitReport || '',
      timelineUrl: attendance.timelineUrl || undefined,
      timelineScreenshotUrl: attendance.timelineUrl || undefined,
      selfieUrl: attendance.photoUrl || undefined,
      status: attendance.status as AttendanceRecord['status'],
      hash: '',
      // Include user data
      users_attendances_userIdTousers: attendance.users_attendances_userIdTousers,
      users_attendances_reviewerIdTousers: attendance.users_attendances_reviewerIdTousers || undefined,
      // Include all database fields for complete data
      clientLat: attendance.latitude || undefined,
      clientLng: attendance.longitude || undefined,
      clientAccuracyM: attendance.accuracy || undefined,
      latitude: attendance.latitude || undefined,
      longitude: attendance.longitude || undefined,
      accuracy: attendance.accuracy || undefined,
      altitude: attendance.altitude || undefined,
      speed: attendance.speed || undefined,
      heading: attendance.heading || undefined,
      locationTimestamp: attendance.locationTimestamp?.toISOString(),
      locationSource: attendance.locationSource || undefined,
      locationAccuracyLevel: attendance.locationAccuracyLevel || undefined,
      address: attendance.address || undefined,
      city: attendance.city || undefined,
      state: attendance.state || undefined,
      country: attendance.country || undefined,
      postalCode: attendance.postalCode || undefined,
      locationProvider: attendance.locationProvider || undefined,
      isLocationValid: attendance.isLocationValid || undefined,
      locationRiskLevel: attendance.locationRiskLevel || undefined,
      distanceFromLastLocation: attendance.distanceFromLastLocation || undefined,
      locationValidationWarnings: attendance.locationValidationWarnings || undefined,
      reviewerId: attendance.reviewerId?.toString() || undefined,
      reviewedAtUTC: attendance.reviewedAt?.toISOString(),
      reviewNotes: attendance.reviewNotes || undefined,
      approvedAt: attendance.approvedAt?.toISOString(),
      // Populate optional fields for filterByPeriod compatibility
      createdAt: attendance.submittedAt.toISOString(),
      date: dateIST,
      createdAtUTC: attendance.submittedAt.toISOString(),
      createdDate: dateIST
    };
  }

  async listByUser(userId: string): Promise<AttendanceRecord[]> {
    const attendances = await prisma.attendances.findMany({
      where: { userId: parseInt(userId) },
      include: {
        users_attendances_userIdTousers: {
          select: {
            name: true,
            email: true,
            employeeCode: true,
            role: true,
            location: true
          }
        },
        users_attendances_reviewerIdTousers: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    return attendances.map(attendance => ({
      id: attendance.id.toString(),
      userId: attendance.userId.toString(),
      dateIST: attendance.date.toISOString().split('T')[0],
      submittedAtUTC: attendance.submittedAt.toISOString(),
      note: attendance.visitReport || '',
      timelineUrl: attendance.timelineUrl || undefined,
      timelineScreenshotUrl: attendance.timelineUrl || undefined,
      selfieUrl: attendance.photoUrl || undefined,
      status: attendance.status as AttendanceRecord['status'],
      hash: '',
      // Include user data
      users_attendances_userIdTousers: attendance.users_attendances_userIdTousers,
      users_attendances_reviewerIdTousers: attendance.users_attendances_reviewerIdTousers || undefined,
      // Include all database fields for complete data
      clientLat: attendance.latitude || undefined,
      clientLng: attendance.longitude || undefined,
      clientAccuracyM: attendance.accuracy || undefined,
      latitude: attendance.latitude || undefined,
      longitude: attendance.longitude || undefined,
      accuracy: attendance.accuracy || undefined,
      altitude: attendance.altitude || undefined,
      speed: attendance.speed || undefined,
      heading: attendance.heading || undefined,
      locationTimestamp: attendance.locationTimestamp?.toISOString(),
      locationSource: attendance.locationSource || undefined,
      locationAccuracyLevel: attendance.locationAccuracyLevel || undefined,
      address: attendance.address || undefined,
      city: attendance.city || undefined,
      state: attendance.state || undefined,
      country: attendance.country || undefined,
      postalCode: attendance.postalCode || undefined,
      locationProvider: attendance.locationProvider || undefined,
      isLocationValid: attendance.isLocationValid || undefined,
      locationRiskLevel: attendance.locationRiskLevel || undefined,
      distanceFromLastLocation: attendance.distanceFromLastLocation || undefined,
      locationValidationWarnings: attendance.locationValidationWarnings || undefined,
      reviewerId: attendance.reviewerId?.toString() || undefined,
      reviewedAtUTC: attendance.reviewedAt?.toISOString(),
      reviewNotes: attendance.reviewNotes || undefined,
      approvedAt: attendance.approvedAt?.toISOString(),
      // Populate optional fields for filterByPeriod compatibility
      createdAt: attendance.submittedAt.toISOString(),
      date: attendance.date.toISOString().split('T')[0],
      createdAtUTC: attendance.submittedAt.toISOString(),
      createdDate: attendance.date.toISOString().split('T')[0]
    }));
  }

  async listForDate(dateIST: string, scope?: { teamId?: string; managerId?: string }): Promise<AttendanceRecord[]> {
    // Parse the date string and create date range for the day
    const targetDate = new Date(dateIST + 'T00:00:00.000Z'); // Ensure UTC
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const where: any = {
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    };

    if (scope?.managerId) {
      // Filter by manager's team
      where.user = {
        managerId: parseInt(scope.managerId)
      };
    }

    const attendances = await prisma.attendances.findMany({
      where,
      include: {
        users_attendances_userIdTousers: {
          select: {
            name: true,
            email: true,
            employeeCode: true,
            role: true,
            location: true
          }
        },
        users_attendances_reviewerIdTousers: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    return attendances.map(attendance => ({
      id: attendance.id.toString(),
      userId: attendance.userId.toString(),
      dateIST,
      submittedAtUTC: attendance.submittedAt.toISOString(),
      note: attendance.visitReport || '',
      timelineUrl: attendance.timelineUrl || undefined,
      timelineScreenshotUrl: attendance.timelineUrl || undefined,
      selfieUrl: attendance.photoUrl || undefined,
      status: attendance.status as AttendanceRecord['status'],
      hash: '', // Hash field doesn't exist in schema, return empty string
      // Include user data
      users_attendances_userIdTousers: attendance.users_attendances_userIdTousers,
      users_attendances_reviewerIdTousers: attendance.users_attendances_reviewerIdTousers || undefined,
      // Include all database fields for complete data
      clientLat: attendance.latitude || undefined,
      clientLng: attendance.longitude || undefined,
      clientAccuracyM: attendance.accuracy || undefined,
      latitude: attendance.latitude || undefined,
      longitude: attendance.longitude || undefined,
      accuracy: attendance.accuracy || undefined,
      altitude: attendance.altitude || undefined,
      speed: attendance.speed || undefined,
      heading: attendance.heading || undefined,
      locationTimestamp: attendance.locationTimestamp?.toISOString(),
      locationSource: attendance.locationSource || undefined,
      locationAccuracyLevel: attendance.locationAccuracyLevel || undefined,
      address: attendance.address || undefined,
      city: attendance.city || undefined,
      state: attendance.state || undefined,
      country: attendance.country || undefined,
      postalCode: attendance.postalCode || undefined,
      locationProvider: attendance.locationProvider || undefined,
      isLocationValid: attendance.isLocationValid || undefined,
      locationRiskLevel: attendance.locationRiskLevel || undefined,
      distanceFromLastLocation: attendance.distanceFromLastLocation || undefined,
      locationValidationWarnings: attendance.locationValidationWarnings || undefined,
      reviewerId: attendance.reviewerId?.toString() || undefined,
      reviewedAtUTC: attendance.reviewedAt?.toISOString(),
      reviewNotes: attendance.reviewNotes || undefined,
      approvedAt: attendance.approvedAt?.toISOString(),
      // Populate optional fields for filterByPeriod compatibility
      createdAt: attendance.submittedAt.toISOString(),
      date: dateIST,
      createdAtUTC: attendance.submittedAt.toISOString(),
      createdDate: dateIST
    }));
  }

  async approve(id: string, reviewerId: string, notes?: string): Promise<void> {
    await prisma.attendances.update({
      where: { id: parseInt(id) },
      data: {
        status: 'APPROVED',
        // Add review tracking if needed
      }
    });
  }
}

export class PrismaCompaniesRepo {
  async list(): Promise<CompanyRecord[]> {
    const companies = await prisma.companies.findMany({
      include: {
        opportunities: true,
        contacts: true
      },
      orderBy: { createdDate: 'desc' }
    });

    return companies.map(company => ({
      id: company.id.toString(),
      name: company.name,
      region: company.region || undefined,
      type: company.type || undefined,
      address: company.address || undefined,
      website: company.website || undefined,
      totalOpportunities: company.opportunities.length,
      openDeals: company.opportunities.filter((opp: any) => opp.stage !== 'CLOSED_WON' && opp.stage !== 'CLOSED_LOST').length,
      totalValue: company.opportunities.reduce((sum: number, opp: any) => sum + (opp.dealSize || 0), 0),
      createdAtUTC: company.createdDate.toISOString(),
      updatedAtUTC: company.updatedAt.toISOString()
    }));
  }

  async create(record: Omit<CompanyRecord, 'id' | 'createdAtUTC' | 'updatedAtUTC'>): Promise<CompanyRecord> {
    const company = await prisma.companies.create({
      data: {
        name: record.name,
        region: record.region || '',
        type: (record.type as any) || 'PRIVATE',
        address: record.address,
        website: record.website,
        ownerId: 1, // Default owner ID - should be passed from context
        createdDate: new Date(),
        updatedAt: new Date()
      }
    });

    return {
      ...record,
      id: company.id.toString(),
      createdAtUTC: company.createdDate.toISOString(),
      updatedAtUTC: company.updatedAt.toISOString()
    };
  }

  async getById(id: string): Promise<CompanyRecord | null> {
    const company = await prisma.companies.findUnique({
      where: { id: parseInt(id) },
      include: {
        opportunities: true,
        contacts: true
      }
    });

    if (!company) return null;

    return {
      id: company.id.toString(),
      name: company.name,
      region: company.region || undefined,
      type: company.type || undefined,
      address: company.address || undefined,
      website: company.website || undefined,
      totalOpportunities: company.opportunities.length,
      openDeals: company.opportunities.filter((opp: any) => opp.stage !== 'CLOSED_WON' && opp.stage !== 'CLOSED_LOST').length,
      totalValue: company.opportunities.reduce((sum: number, opp: any) => sum + (opp.dealSize || 0), 0),
      createdAtUTC: company.createdDate.toISOString(),
      updatedAtUTC: company.updatedAt.toISOString()
    };
  }
}

export class PrismaLeadsRepo {
  async list(): Promise<LeadRecord[]> {
    const leads = await prisma.leads.findMany({
      orderBy: { createdDate: 'desc' }
    });

    return leads.map(lead => ({
      id: lead.id.toString(),
      ownerUserId: lead.ownerId.toString(),
      name: lead.name,
      source: lead.source || undefined,
      stage: lead.status,
      value: 0, // Lead model doesn't have value field
      probability: 0, // Lead model doesn't have probability field
      nextActionAt: undefined, // Lead model doesn't have nextActionDate field
      notes: undefined, // Lead model doesn't have notes field
      createdAtUTC: lead.createdDate.toISOString(),
      updatedAtUTC: lead.updatedAt.toISOString()
    }));
  }

  async create(record: Omit<LeadRecord, 'id' | 'createdAtUTC' | 'updatedAtUTC'>): Promise<LeadRecord> {
    const lead = await prisma.leads.create({
      data: {
        name: record.name,
        companyId: null,
        ownerId: parseInt(record.ownerUserId),
        source: record.source || '',
        status: record.stage,
        createdDate: new Date(),
        updatedAt: new Date()
      }
    });

    return {
      ...record,
      id: lead.id.toString(),
      createdAtUTC: lead.createdDate.toISOString(),
      updatedAtUTC: lead.updatedAt.toISOString()
    };
  }
}

export class PrismaOpportunitiesRepo {
  async list(): Promise<OpportunityRecord[]> {
    const opportunities = await prisma.opportunities.findMany({
      include: { companies: true },
      orderBy: { createdDate: 'desc' }
    });

    return opportunities.map(opp => ({
      id: opp.id.toString(),
      companyId: opp.companyId?.toString(),
      leadId: opp.leadId?.toString(),
      name: opp.name,
      stage: opp.stage,
      dealSize: opp.dealSize || 0,
      probability: opp.probability || 0,
      classification: opp.classification || undefined,
      expectedCloseDate: opp.expectedCloseDate?.toISOString(),
      nextFollowupDate: opp.nextFollowupDate?.toISOString(),
      ownerUserId: opp.ownerId.toString(),
      createdAtUTC: opp.createdDate.toISOString(),
      updatedAtUTC: opp.updatedAt.toISOString()
    }));
  }

  async create(record: Omit<OpportunityRecord, 'id' | 'createdAtUTC' | 'updatedAtUTC'>): Promise<OpportunityRecord> {
    const opportunity = await prisma.opportunities.create({
      data: {
        name: record.name,
        companyId: record.companyId ? parseInt(record.companyId) : null,
        leadId: record.leadId ? parseInt(record.leadId) : null,
        stage: record.stage as any,
        dealSize: record.dealSize,
        probability: record.probability,
        classification: record.classification as any,
        expectedCloseDate: record.expectedCloseDate ? new Date(record.expectedCloseDate) : null,
        nextFollowupDate: record.nextFollowupDate ? new Date(record.nextFollowupDate) : null,
        ownerId: parseInt(record.ownerUserId),
        createdDate: new Date(),
        updatedAt: new Date()
      }
    });

    return {
      ...record,
      id: opportunity.id.toString(),
      createdAtUTC: opportunity.createdDate.toISOString(),
      updatedAtUTC: opportunity.updatedAt.toISOString()
    };
  }
}

export class PrismaActivitiesRepo {
  async list(): Promise<ActivityRecord[]> {
    const activities = await prisma.activities.findMany({
      orderBy: { occurredAt: 'desc' }
    });

    return activities.map(activity => ({
      id: activity.id.toString(),
      userId: activity.userId.toString(),
      leadId: activity.leadId?.toString(),
      type: activity.type as ActivityRecord['type'],
      occurredAtUTC: activity.occurredAt.toISOString(),
      durationMin: activity.duration || undefined,
      summary: activity.subject,
      evidenceUrl: activity.evidenceUrl || undefined
    }));
  }

  async create(record: Omit<ActivityRecord, 'id'>): Promise<ActivityRecord> {
    const activity = await prisma.activities.create({
      data: {
        userId: parseInt(record.userId),
        leadId: record.leadId ? parseInt(record.leadId) : null,
        type: record.type as any, // Type assertion needed due to enum differences
        subject: record.summary || '',
        occurredAt: new Date(record.occurredAtUTC),
        duration: record.durationMin,
        evidenceUrl: record.evidenceUrl,
        updatedAt: new Date()
      }
    });

    return {
      ...record,
      id: activity.id.toString()
    };
  }
}

export class PrismaPendingQuotationsRepo {
  async list(): Promise<any[]> {
    const quotations = await prisma.pending_quotations.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return quotations.map(quotation => ({
      id: quotation.id.toString(),
      projectOrClientName: quotation.projectOrClientName,
      status: quotation.status,
      orderValue: quotation.orderValue,
      quotationDeadline: quotation.quotationDeadline?.toISOString(),
      createdAt: quotation.createdAt.toISOString(),
      updatedAt: quotation.updatedAt.toISOString(),
      createdById: quotation.createdById.toString()
    }));
  }
}

// Factory function to create repository instances
export function createPrismaRepos() {
  // Server-side only - prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error('Prisma repositories can only be used on the server side');
  }

  return {
    attendance: new PrismaAttendanceRepo(),
    companies: new PrismaCompaniesRepo(),
    leads: new PrismaLeadsRepo(),
    opportunities: new PrismaOpportunitiesRepo(),
    activities: new PrismaActivitiesRepo(),
    pendingQuotations: new PrismaPendingQuotationsRepo(),
  };
}
