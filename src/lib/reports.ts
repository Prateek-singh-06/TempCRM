import { createPrismaRepos } from './repositories/prismaRepos';
import { prisma } from '@/lib/prisma';
import { WeightedPipelineService, DealStage, WeightedDeal, PipelineVelocityMetrics } from '@/lib/weightedPipeline';

type ReportsUser = {
  id: number;
  role?: string | null;
};

export interface ReportData {
  title: string;
  generatedAt: string;
  period: string;
  data: any;
  summary: string;
}

export interface SalesReport {
  totalRevenue: number;
  totalDeals: number;
  conversionRate: number;
  averageDealSize: number;
  topPerformers: Array<{ name: string; deals: number; revenue: number }>;
  pipelineStages: Array<{ stage: string; count: number; value: number }>;
  monthlyTrends: Array<{ month: string; revenue: number; deals: number }>;
}

export interface QuotationReport {
  totalQuotations: number;
  pendingQuotations: number;
  acceptedQuotations: number;
  rejectedQuotations: number;
  overdueQuotations: number;
  totalValue: number;
  averageResponseTime: number;
  topClients: Array<{ name: string; quotations: number; value: number }>;
}

export interface AttendanceReport {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateSubmissions: number;
  monthlyAttendance: Array<{ date: string; present: number; absent: number }>;
  topPerformers: Array<{ name: string; attendanceRate: number }>;
}

export class ReportsService {
  private repos = createPrismaRepos();
  private user: ReportsUser | null;
  private readonly isAdmin: boolean;

  constructor(user: ReportsUser | null = null) {
    this.user = user;
    const role = user?.role?.toString().toLowerCase();
    this.isAdmin = !user || role === 'admin' || role === 'superadmin';
  }

  private get scopedUserId(): string | null {
    if (!this.user) return null;
    return this.user.id.toString();
  }

  async generateSalesReport(period: 'week' | 'month' | 'quarter' | 'year'): Promise<SalesReport> {
    try {
      const opportunities = await this.repos.opportunities.list();

      // Filter by period
      const filteredOpportunities = this.filterByPeriod(opportunities, period);

      const scopedOpportunities = this.isAdmin
        ? filteredOpportunities
        : filteredOpportunities.filter(opp => opp.ownerUserId === this.scopedUserId);

      const totalRevenue = scopedOpportunities
        .filter(opp => opp.stage === 'CLOSED_WON')
        .reduce((sum, opp) => sum + (opp.dealSize || 0), 0);

      const totalDeals = scopedOpportunities.filter(opp => opp.stage === 'CLOSED_WON').length;
      const totalOpportunities = scopedOpportunities.length;
      const conversionRate = totalOpportunities > 0 ? Math.round((totalDeals / totalOpportunities) * 100) : 0;

      const averageDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;

      // Calculate pipeline stages
      const pipelineStages = [
        { stage: 'Prospecting', stageValue: 'PROSPECTING' },
        { stage: 'Qualification', stageValue: 'QUALIFICATION' },
        { stage: 'Proposal', stageValue: 'PROPOSAL' },
        { stage: 'Negotiation', stageValue: 'NEGOTIATION' },
        { stage: 'Closed Won', stageValue: 'CLOSED_WON' },
        { stage: 'Closed Lost', stageValue: 'CLOSED_LOST' }
      ];

      const pipelineStagesData = pipelineStages.map(({ stage, stageValue }) => ({
        stage,
        count: scopedOpportunities.filter(opp => opp.stage === stageValue).length,
        value: scopedOpportunities
          .filter(opp => opp.stage === stageValue)
          .reduce((sum, opp) => sum + (opp.dealSize || 0), 0)
      }));

      // Build time buckets for trends
      type Bucket = { month: string; revenue: number; deals: number };
      const trendsMap = new Map<string, Bucket>();

      const now = new Date();
      const addBucketIfMissing = (label: string) => {
        if (!trendsMap.has(label)) trendsMap.set(label, { month: label, revenue: 0, deals: 0 });
      };

      // Initialize buckets depending on period
      if (period === 'year') {
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
          addBucketIfMissing(label);
        }
      } else if (period === 'quarter') {
        for (let i = 2; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
          addBucketIfMissing(label);
        }
      } else if (period === 'month') {
        // Group by weeks within the month
        for (let w = 1; w <= 4; w++) {
          addBucketIfMissing(`W${w}`);
        }
      } else if (period === 'week') {
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          const label = d.toLocaleString('en-US', { month: 'short', day: 'numeric' });
          addBucketIfMissing(label);
        }
      }

      // Populate buckets from CLOSED_WON deals only
      const closedWon = scopedOpportunities.filter(opp => opp.stage === 'CLOSED_WON');
      closedWon.forEach(opp => {
        const created = opp.createdAtUTC; // repository provides createdAtUTC
        if (!created) return;
        const d = new Date(created);
        let label = '';
        if (period === 'year' || period === 'quarter') {
          label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        } else if (period === 'month') {
          // Determine week of month (1-4 roughly)
          const day = d.getDate();
          const weekIdx = Math.min(4, Math.ceil(day / 7));
          label = `W${weekIdx}`;
        } else {
          label = d.toLocaleString('en-US', { month: 'short', day: 'numeric' });
        }
        addBucketIfMissing(label);
        const bucket = trendsMap.get(label)!;
        bucket.revenue += opp.dealSize || 0;
        bucket.deals += 1;
      });

      // Sort buckets in chronological order for the selected period
      const monthlyTrends = Array.from(trendsMap.values());

      const ownerStats = new Map<string, { deals: number; revenue: number }>();
      scopedOpportunities.forEach(opp => {
        if (!opp.ownerUserId) return;
        const entry = ownerStats.get(opp.ownerUserId) || { deals: 0, revenue: 0 };
        ownerStats.set(opp.ownerUserId, {
          deals: entry.deals + (opp.stage === 'CLOSED_WON' ? 1 : 0),
          revenue: entry.revenue + (opp.stage === 'CLOSED_WON' ? (opp.dealSize || 0) : 0)
        });
      });

      let ownerNames: Record<string, string> = {};
      if (ownerStats.size > 0) {
        const ownerIds = Array.from(ownerStats.keys())
          .map(id => parseInt(id, 10))
          .filter(id => !Number.isNaN(id));
        if (ownerIds.length > 0) {
          const users = await prisma.users.findMany({
            where: { id: { in: ownerIds } },
            select: { id: true, name: true, email: true }
          });
          ownerNames = users.reduce<Record<string, string>>((acc, user) => {
            acc[user.id.toString()] = user.name || user.email || `User ${user.id}`;
            return acc;
          }, {});
        }
      }

      const topPerformers = Array.from(ownerStats.entries())
        .map(([ownerId, stats]) => ({
          name: ownerNames[ownerId] || `User ${ownerId}`,
          deals: stats.deals,
          revenue: stats.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue || b.deals - a.deals)
        .slice(0, 5);

      return {
        totalRevenue,
        totalDeals,
        conversionRate,
        averageDealSize,
        topPerformers,
        pipelineStages: pipelineStagesData,
        monthlyTrends
      };
    } catch (error) {
      console.error('Error generating sales report:', error);
      throw new Error('Failed to generate sales report');
    }
  }

  async generateQuotationReport(period: 'week' | 'month' | 'quarter' | 'year'): Promise<QuotationReport> {
    try {
      const quotations = await this.repos.pendingQuotations.list();
      const filteredQuotations = this.filterByPeriod(quotations, period);

      const scopedQuotations = this.isAdmin
        ? filteredQuotations
        : filteredQuotations.filter(q => q.createdById === this.scopedUserId);

      const totalQuotations = scopedQuotations.length;
      const pendingQuotations = scopedQuotations.filter(q => q.status === 'PENDING').length;
      const acceptedQuotations = scopedQuotations.filter(q => q.status === 'ACCEPTED').length;
      const rejectedQuotations = scopedQuotations.filter(q => q.status === 'REJECTED').length;
      const overdueQuotations = scopedQuotations.filter(q => {
        if (!q.quotationDeadline) return false;
        return new Date(q.quotationDeadline) < new Date();
      }).length;

      const totalValue = scopedQuotations.reduce((sum, q) => sum + (q.orderValue || 0), 0);

      const responseTimes = scopedQuotations
        .filter(q => q.status !== 'PENDING' && q.status !== 'SENT')
        .map(q => {
          const end = q.status === 'PENDING' ? new Date() : new Date(q.updatedAt);
          const start = new Date(q.createdAt);
          const diffMs = end.getTime() - start.getTime();
          return diffMs / (1000 * 60 * 60 * 24);
        })
        .filter(value => Number.isFinite(value) && value >= 0);

      const averageResponseTime = responseTimes.length > 0
        ? Math.round((responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length) * 10) / 10
        : 0;

      // Group by client
      const clientMap = new Map<string, { quotations: number; value: number }>();
      scopedQuotations.forEach(q => {
        const client = q.projectOrClientName;
        const existing = clientMap.get(client) || { quotations: 0, value: 0 };
        clientMap.set(client, {
          quotations: existing.quotations + 1,
          value: existing.value + (q.orderValue || 0)
        });
      });

      const topClients = Array.from(clientMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      return {
        totalQuotations,
        pendingQuotations,
        acceptedQuotations,
        rejectedQuotations,
        overdueQuotations,
        totalValue,
        averageResponseTime,
        topClients
      };
    } catch (error) {
      console.error('Error generating quotation report:', error);
      throw new Error('Failed to generate quotation report');
    }
  }

  async generateAttendanceReport(period: 'week' | 'month' | 'quarter' | 'year'): Promise<AttendanceReport> {
    try {
      // Determine total employees (active users)
      const totalEmployees = this.isAdmin ? await prisma.users.count() : 1;

      // Today window (server timezone)
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      // Present today
      const todayRecords = await prisma.attendances.findMany({
        where: {
          date: { gte: startOfToday, lte: endOfToday },
          ...(this.isAdmin ? {} : { userId: this.user?.id })
        },
        select: { id: true, status: true }
      });
      const presentToday = todayRecords.length;
      const absentToday = Math.max(0, totalEmployees - presentToday);
      const lateSubmissions = todayRecords.filter(r => r.status === 'AUTO_FLAGGED').length;

      // Range for monthly trend (last 30 days)
      const { startRange, endRange, bucketSize } = this.getAttendanceRange(period, endOfToday);

      const last30 = await prisma.attendances.findMany({
        where: {
          date: { gte: startRange, lte: endRange },
          ...(this.isAdmin ? {} : { userId: this.user?.id })
        },
        select: { date: true, userId: true }
      });

      // Aggregate counts by date
      const map = new Map<string, number>();
      last30.forEach(rec => {
        const key = rec.date.toISOString().split('T')[0];
        map.set(key, (map.get(key) || 0) + 1);
      });

      const monthlyAttendance: Array<{ date: string; present: number; absent: number }> = [];
      for (let i = bucketSize - 1; i >= 0; i--) {
        const d = new Date(endOfToday.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split('T')[0];
        const present = map.get(key) || 0;
        const absent = Math.max(0, totalEmployees - present);
        monthlyAttendance.push({ date: key, present, absent });
      }

      // Top performers (attendance rate over last 30 days)
      const userPresentCounts = new Map<number, number>();
      last30.forEach(rec => {
        userPresentCounts.set(rec.userId, (userPresentCounts.get(rec.userId) || 0) + 1);
      });
      const attendanceWindow = Math.max(bucketSize, 1);
      const topPerformerEntries = Array.from(userPresentCounts.entries())
        .map(([userId, count]) => ({
          userId,
          attendanceRate: attendanceWindow > 0 ? (count / attendanceWindow) * 100 : 0
        }))
        .sort((a, b) => b.attendanceRate - a.attendanceRate)
        .slice(0, 5);

      let performerNames: Record<string, string> = {};
      if (topPerformerEntries.length > 0) {
        const performerIds = topPerformerEntries.map(entry => entry.userId);
        const performers = await prisma.users.findMany({
          where: { id: { in: performerIds } },
          select: { id: true, name: true, email: true }
        });
        performerNames = performers.reduce<Record<string, string>>((acc, performer) => {
          acc[performer.id.toString()] = performer.name || performer.email || `User ${performer.id}`;
          return acc;
        }, {});
      }

      const topPerformers = topPerformerEntries.map(entry => ({
        name: performerNames[entry.userId.toString()] || `User ${entry.userId}`,
        attendanceRate: Math.round(entry.attendanceRate * 10) / 10
      }));

      return {
        totalEmployees,
        presentToday,
        absentToday,
        lateSubmissions,
        monthlyAttendance,
        topPerformers
      };
    } catch (error) {
      console.error('Error generating attendance report:', error);
      throw new Error('Failed to generate attendance report');
    }
  }

  private filterByPeriod<T extends { createdAt?: string; date?: string; createdAtUTC?: string; createdDate?: string }>(
    data: T[],
    period: 'week' | 'month' | 'quarter' | 'year'
  ): T[] {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0);
    }

    return data.filter(item => {
      const itemDate = item.createdAt || item.date || item.createdAtUTC || item.createdDate;
      if (!itemDate) return false;
      return new Date(itemDate) >= startDate;
    });
  }

  private getAttendanceRange(period: 'week' | 'month' | 'quarter' | 'year', endOfToday: Date) {
    const daysByPeriod: Record<typeof period, number> = {
      week: 7,
      month: 30,
      quarter: 90,
      year: 365
    };
    const bucketSize = daysByPeriod[period] || 30;
    const startRange = new Date(endOfToday.getTime() - (bucketSize - 1) * 24 * 60 * 60 * 1000);
    return { startRange, endRange: endOfToday, bucketSize };
  }

  // Monthly trends are now calculated with real data in generateSalesReport method

  async generatePipelineReport(period: 'week' | 'month' | 'quarter' | 'year'): Promise<any> {
    try {
      // Fetch pipeline data from pipelines table
      const pipelines = await prisma.pipelines.findMany({
        where: this.isAdmin ? {} : { ownerId: parseInt(this.scopedUserId || '0') },
        include: {
          companies: true,
          users: true,
        }
      });

      // Filter pipelines by period
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }

      const filteredPipelines = pipelines.filter(pipeline => {
        return pipeline.createdAt >= startDate;
      });

      const dayMs = 1000 * 60 * 60 * 24;
      const closedWonStatuses = new Set([
        'DELIVERED',
        'INSTALLATION_STARTED',
        'INSTALLATION_COMPLETE',
        'PAYMENT_RECEIVED',
        'PROJECT_COMPLETE'
      ]);

      const statusToDealStage = (status: string): DealStage => {
        switch (status) {
          case 'ORDER_RECEIVED':
          case 'ORDER_PROCESSING':
          case 'CONTRACT_SIGNING':
            return DealStage.PROPOSAL;
          case 'PRODUCTION_STARTED':
          case 'QUALITY_CHECK':
            return DealStage.NEGOTIATION;
          case 'PACKING_SHIPPING':
          case 'SHIPPED':
            return DealStage.FINAL_APPROVAL;
          case 'DELIVERED':
          case 'INSTALLATION_STARTED':
          case 'INSTALLATION_COMPLETE':
          case 'PAYMENT_RECEIVED':
          case 'PROJECT_COMPLETE':
            return DealStage.CLOSED_WON;
          case 'ON_HOLD':
          case 'DELAYED':
            return DealStage.ON_HOLD;
          case 'CANCELLED':
          case 'DISPUTED':
            return DealStage.CANCELLED;
          case 'LOST_TO_COMPETITOR':
            return DealStage.LOST_TO_COMPETITOR;
          default:
            return DealStage.PROPOSAL;
        }
      };

      // Calculate stage distribution
      const stageDistribution: Record<string, number> = {};
      const stageValues: Record<string, number> = {};
      
      filteredPipelines.forEach(pipeline => {
        const stage = this.mapPipelineStatus(pipeline.status);
        stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
        stageValues[stage] = (stageValues[stage] || 0) + (pipeline.orderValue || 0);
      });

      // Calculate metrics
      const totalDeals = filteredPipelines.length;
      const totalValue = filteredPipelines.reduce((sum, p) => sum + (p.orderValue || 0), 0);
      const weightedValue = filteredPipelines.reduce((sum, p) => {
        const probability = (p.progressPercentage || 0) / 100;
        return sum + ((p.orderValue || 0) * probability);
      }, 0);
      const averageProbability = filteredPipelines.length > 0
        ? filteredPipelines.reduce((sum, p) => sum + (p.progressPercentage || 0), 0) / filteredPipelines.length / 100
        : 0;

      const velocityDeals: WeightedDeal[] = filteredPipelines.map(pipeline => {
        const stage = statusToDealStage(pipeline.status);
        const orderDate = pipeline.orderDate ? new Date(pipeline.orderDate) : new Date(pipeline.createdAt);
        const pipelineAgeDays = Math.max(1, Math.round((now.getTime() - orderDate.getTime()) / dayMs));

        const closedDateCandidate = pipeline.actualInstallDate
          || pipeline.actualDeliveryDate
          || pipeline.paymentDate
          || pipeline.updatedAt;
        const closedDate = closedWonStatuses.has(pipeline.status)
          ? new Date(closedDateCandidate)
          : undefined;

        const salesCycleDays = closedDate
          ? Math.max(1, Math.round((closedDate.getTime() - orderDate.getTime()) / dayMs))
          : undefined;

        const rawProbability = (pipeline.progressPercentage || 0) / 100;
        const probability = Math.min(Math.max(rawProbability, 0.1), 1);
        const dealSize = pipeline.orderValue || 0;
        const weightedDeal: WeightedDeal = {
          id: pipeline.id.toString(),
          name: pipeline.name,
          value: dealSize,
          stage,
          probability,
          weightedValue: dealSize * probability,
          expectedCloseDate: pipeline.expectedDeliveryDate ? new Date(pipeline.expectedDeliveryDate) : undefined,
          daysInStage: pipelineAgeDays,
          velocityScore: pipeline.progressPercentage || 0,
          riskScore: 50,
          priority: 'MEDIUM',
          lastActivity: new Date(pipeline.updatedAt),
          ownerId: pipeline.ownerId.toString(),
          ownerName: pipeline.users?.name || undefined,
          ownerEmail: pipeline.users?.email || undefined,
          companyName: pipeline.companies?.name || undefined,
          orderDate,
          closedDate,
          pipelineAgeDays,
          salesCycleDays
        };

        return weightedDeal;
      });

      const velocityDetails = WeightedPipelineService.calculateVelocityMetrics(velocityDeals);
      const velocity = velocityDetails.velocityPerMonth;

      const closedDeals = filteredPipelines.filter(p =>
        p.status === 'PROJECT_COMPLETE' || p.status === 'PAYMENT_RECEIVED'
      );

      return {
        metrics: {
          totalDeals,
          totalValue,
          weightedValue,
          averageProbability,
          velocity,
          velocityDetails,
          stageDistribution,
          stageValues,
          conversionRate: closedDeals.length / Math.max(totalDeals, 1)
        },
        deals: filteredPipelines.slice(0, 100), // Limit to 100 for performance
        recommendations: this.generatePipelineRecommendations(stageDistribution, averageProbability, velocityDetails)
      };
    } catch (error) {
      console.error('Error generating pipeline report:', error);
      throw new Error('Failed to generate pipeline report');
    }
  }

  async generateForecastReport(period: 'week' | 'month' | 'quarter' | 'year'): Promise<any> {
    try {
      const opportunities = await this.repos.opportunities.list();
      const filteredOpportunities = this.filterByPeriod(opportunities, period);
      
      const scopedOpportunities = this.isAdmin
        ? filteredOpportunities
        : filteredOpportunities.filter(opp => opp.ownerUserId === this.scopedUserId);

      // Calculate historical conversion rate
      const closedDeals = scopedOpportunities.filter(opp => 
        opp.stage === 'CLOSED_WON' || opp.stage === 'CLOSED_LOST'
      );
      const wonDeals = scopedOpportunities.filter(opp => opp.stage === 'CLOSED_WON');
      const historicalConversionRate = closedDeals.length > 0 
        ? wonDeals.length / closedDeals.length 
        : 0.3; // Default 30% conversion

      // Get pipeline opportunities
      const pipelineOpps = scopedOpportunities.filter(opp => 
        opp.stage !== 'CLOSED_WON' && opp.stage !== 'CLOSED_LOST'
      );

      // Calculate weighted forecast
      const weightedForecast = pipelineOpps.reduce((sum, opp) => {
        const probability = this.getStageProbability(opp.stage);
        return sum + ((opp.dealSize || 0) * probability);
      }, 0);

      // Calculate optimistic and pessimistic forecasts
      const optimisticForecast = pipelineOpps.reduce((sum, opp) => {
        const probability = Math.min(this.getStageProbability(opp.stage) * 1.3, 1);
        return sum + ((opp.dealSize || 0) * probability);
      }, 0);

      const pessimisticForecast = pipelineOpps.reduce((sum, opp) => {
        const probability = this.getStageProbability(opp.stage) * 0.7;
        return sum + ((opp.dealSize || 0) * probability);
      }, 0);

      // Monthly forecast projection
      const monthlyProjection = [];
      for (let i = 1; i <= 6; i++) {
        const month = new Date();
        month.setMonth(month.getMonth() + i);
        const monthName = month.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        
        // Simple linear projection with some variance
        const baseValue = weightedForecast / 3;
        const variance = (Math.random() - 0.5) * 0.2; // +/- 10% variance
        const projectedValue = baseValue * (1 + variance) * (1 + i * 0.05); // 5% growth per month
        
        monthlyProjection.push({
          month: monthName,
          forecast: Math.round(projectedValue),
          confidence: Math.max(0.5, 0.9 - i * 0.1) // Confidence decreases over time
        });
      }

      return {
        currentPipeline: pipelineOpps.reduce((sum, opp) => sum + (opp.dealSize || 0), 0),
        weightedForecast,
        optimisticForecast,
        pessimisticForecast,
        historicalConversionRate,
        monthlyProjection,
        confidenceScore: 0.75, // Based on data quality
        riskFactors: this.identifyRiskFactors(pipelineOpps),
        recommendations: this.generateForecastRecommendations(weightedForecast, historicalConversionRate)
      };
    } catch (error) {
      console.error('Error generating forecast report:', error);
      throw new Error('Failed to generate forecast report');
    }
  }

  private mapPipelineStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'ORDER_RECEIVED': 'Proposal',
      'ORDER_PROCESSING': 'Proposal',
      'CONTRACT_SIGNING': 'Negotiation',
      'PRODUCTION_STARTED': 'Negotiation',
      'QUALITY_CHECK': 'Negotiation',
      'PACKING_SHIPPING': 'Final Approval',
      'SHIPPED': 'Final Approval',
      'DELIVERED': 'Closed Won',
      'INSTALLATION_STARTED': 'Closed Won',
      'INSTALLATION_COMPLETE': 'Closed Won',
      'PAYMENT_RECEIVED': 'Closed Won',
      'PROJECT_COMPLETE': 'Closed Won',
      'ON_HOLD': 'On Hold',
      'DELAYED': 'On Hold',
      'CANCELLED': 'Closed Lost',
      'DISPUTED': 'On Hold',
      'LOST_TO_COMPETITOR': 'Closed Lost'
    };
    return statusMap[status] || 'Prospecting';
  }

  private getStageProbability(stage: string): number {
    const probabilities: Record<string, number> = {
      'PROSPECTING': 0.1,
      'QUALIFICATION': 0.2,
      'PROPOSAL': 0.4,
      'NEGOTIATION': 0.6,
      'FINAL_APPROVAL': 0.8,
      'CLOSED_WON': 1.0,
      'CLOSED_LOST': 0
    };
    return probabilities[stage] || 0.1;
  }

  private generatePipelineRecommendations(
    stageDistribution: Record<string, number>,
    avgProbability: number,
    velocityMetrics: PipelineVelocityMetrics
  ): string[] {
    const recommendations = [];
    const dealsPerMonth = velocityMetrics.dealsPerMonth;
    const revenueVelocity = velocityMetrics.velocityPerMonth;
    const averageDealSize = velocityMetrics.averageDealSize;
    
    if (avgProbability < 0.3) {
      recommendations.push('Focus on qualifying leads better to improve overall pipeline probability');
    }
    if (dealsPerMonth < 1) {
      recommendations.push('Pipeline velocity is critically low - focus on moving qualified deals through to close');
    } else if (dealsPerMonth < 3) {
      recommendations.push('Increase deal momentum to convert more opportunities each month');
    }
    if (revenueVelocity < averageDealSize) {
      recommendations.push('Monthly revenue velocity trails the average deal size - shorten the sales cycle to improve throughput');
    }
    if (stageDistribution['On Hold'] > 5) {
      recommendations.push('Review and re-engage deals on hold to prevent pipeline stagnation');
    }
    if (stageDistribution['Prospecting'] > stageDistribution['Closed Won']) {
      recommendations.push('Improve conversion funnel - too many deals stuck in early stages');
    }
    
    return recommendations;
  }

  private identifyRiskFactors(opportunities: any[]): string[] {
    const risks = [];
    const stuckDeals = opportunities.filter(opp => {
      const daysSinceUpdate = (Date.now() - new Date(opp.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 30;
    });
    
    if (stuckDeals.length > 0) {
      risks.push(`${stuckDeals.length} deals haven't been updated in 30+ days`);
    }
    
    const highValueDeals = opportunities.filter(opp => opp.dealSize > 1000000);
    if (highValueDeals.length > 0) {
      risks.push(`${highValueDeals.length} high-value deals require special attention`);
    }
    
    return risks;
  }

  private generateForecastRecommendations(forecast: number, conversionRate: number): string[] {
    const recommendations = [];
    
    if (conversionRate < 0.25) {
      recommendations.push('Historical conversion rate is below 25% - focus on deal qualification');
    }
    if (forecast < 1000000) {
      recommendations.push('Pipeline value is below target - increase prospecting activities');
    }
    recommendations.push('Consider seasonal patterns when evaluating forecast accuracy');
    
    return recommendations;
  }
}
