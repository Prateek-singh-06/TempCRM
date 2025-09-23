import { createPrismaRepos } from './repositories/prismaRepos';

export interface DashboardMetrics {
  conversionRate: number;
  leadSources: Array<{ source: string; count: number; percentage: number }>;
  pipeline: Array<{ stage: string; count: number; color: string }>;
  monthlyTarget: { target: number; achieved: number };
  attendance: {
    total: number;
    submitted: number;
    missing: Array<{ name: string; id: string }>;
  };
  overdueFollowups: Array<{
    company: string;
    opportunity: string;
    dueDate: string;
    daysOverdue: number;
  }>;
  pendingQuotations: {
    total: number;
    pending: number;
    sent: number;
    accepted: number;
    rejected: number;
    overdue: number;
    totalValue: number;
  };
  salesPerformance: {
    monthlyRevenue: number;
    quarterlyGrowth: number;
    topPerformers: Array<{ name: string; sales: number }>;
  };
}

export class AnalyticsService {
  private repos = createPrismaRepos();

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      // Fetch data from multiple sources
      const [leads, opportunities, quotations] = await Promise.all([
        this.repos.leads.list(),
        this.repos.opportunities.list(),
        this.repos.pendingQuotations.list()
      ]);

      // Get attendance data (mock for now - would need attendance repo)
      const attendance: any[] = []; // TODO: Implement attendance repository

      // Calculate conversion rate
      const totalLeads = leads.length;
      const convertedLeads = opportunities.filter(opp => opp.stage === 'CLOSED_WON').length;
      const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

      // Calculate lead sources
      const leadSourceMap = new Map<string, number>();
      leads.forEach(lead => {
        const source = lead.source || 'Unknown';
        leadSourceMap.set(source, (leadSourceMap.get(source) || 0) + 1);
      });

      const leadSources = Array.from(leadSourceMap.entries()).map(([source, count]) => ({
        source,
        count,
        percentage: Math.round((count / totalLeads) * 100)
      }));

      // Calculate pipeline stages
      const pipelineStages = [
        { stage: 'Prospecting', status: 'PROSPECTING', color: 'bg-blue-500' },
        { stage: 'Qualified', status: 'QUALIFICATION', color: 'bg-indigo-500' },
        { stage: 'Proposal Sent', status: 'PROPOSAL', color: 'bg-purple-500' },
        { stage: 'Negotiation', status: 'NEGOTIATION', color: 'bg-pink-500' },
        { stage: 'Closed Won', status: 'CLOSED_WON', color: 'bg-green-500' },
        { stage: 'Closed Lost', status: 'CLOSED_LOST', color: 'bg-red-500' }
      ];

      const pipeline = pipelineStages.map(({ stage, status, color }) => ({
        stage,
        count: opportunities.filter(opp => opp.stage === status).length,
        color
      }));

      // Calculate monthly target (mock for now)
      const monthlyTarget = { target: 10, achieved: convertedLeads };

      // Calculate attendance metrics (mock for now)
      const attendanceMetrics = {
        total: 12, // Mock total employees
        submitted: 8, // Mock submitted count
        missing: [
          { name: "John Doe", id: "1" },
          { name: "Jane Smith", id: "2" },
          { name: "Mike Johnson", id: "3" },
          { name: "Sarah Williams", id: "4" }
        ]
      };

      // Calculate overdue followups
      const overdueFollowups = opportunities
        .filter(opp => opp.nextFollowupDate && new Date(opp.nextFollowupDate) < new Date())
        .map(opp => ({
          company: 'Company Name', // TODO: Get from company relation
          opportunity: opp.name || 'Unknown Opportunity',
          dueDate: opp.nextFollowupDate || '',
          daysOverdue: Math.ceil((new Date().getTime() - new Date(opp.nextFollowupDate || '').getTime()) / (1000 * 60 * 60 * 24))
        }))
        .slice(0, 5); // Limit to top 5

      // Calculate pending quotations metrics
      const pendingQuotationsMetrics = {
        total: quotations.length,
        pending: quotations.filter(q => q.status === 'PENDING').length,
        sent: quotations.filter(q => q.status === 'SENT').length,
        accepted: quotations.filter(q => q.status === 'ACCEPTED').length,
        rejected: quotations.filter(q => q.status === 'REJECTED').length,
        overdue: quotations.filter(q => {
          if (!q.quotationDeadline) return false;
          return new Date(q.quotationDeadline) < new Date();
        }).length,
        totalValue: quotations.reduce((sum, q) => sum + (q.orderValue || 0), 0)
      };

      // Calculate sales performance (mock for now)
      const salesPerformance = {
        monthlyRevenue: pendingQuotationsMetrics.totalValue,
        quarterlyGrowth: 15, // Mock percentage
        topPerformers: [] // Mock data
      };

      return {
        conversionRate,
        leadSources,
        pipeline,
        monthlyTarget,
        attendance: attendanceMetrics,
        overdueFollowups,
        pendingQuotations: pendingQuotationsMetrics,
        salesPerformance
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      // Return mock data as fallback
      return this.getMockMetrics();
    }
  }

  private getMockMetrics(): DashboardMetrics {
    return {
      conversionRate: 35,
      leadSources: [
        { source: "Referral", count: 45, percentage: 40 },
        { source: "Web", count: 30, percentage: 27 },
        { source: "Cold Call", count: 20, percentage: 18 },
        { source: "Event", count: 15, percentage: 13 },
        { source: "Other", count: 2, percentage: 2 }
      ],
      pipeline: [
        { stage: "Prospecting", count: 12, color: "bg-blue-500" },
        { stage: "Qualified", count: 8, color: "bg-indigo-500" },
        { stage: "Proposal Sent", count: 5, color: "bg-purple-500" },
        { stage: "Negotiation", count: 3, color: "bg-pink-500" },
        { stage: "Closed Won", count: 2, color: "bg-green-500" },
        { stage: "Closed Lost", count: 1, color: "bg-red-500" }
      ],
      monthlyTarget: { target: 10, achieved: 6 },
      attendance: {
        total: 12,
        submitted: 8,
        missing: [
          { name: "John Doe", id: "1" },
          { name: "Jane Smith", id: "2" },
          { name: "Mike Johnson", id: "3" },
          { name: "Sarah Williams", id: "4" }
        ]
      },
      overdueFollowups: [
        { company: "Tech Corp", opportunity: "Enterprise Deal", dueDate: "2024-01-15", daysOverdue: 2 },
        { company: "Global Industries", opportunity: "Consulting Project", dueDate: "2024-01-14", daysOverdue: 3 },
        { company: "StartUp Inc", opportunity: "SaaS Implementation", dueDate: "2024-01-10", daysOverdue: 7 }
      ],
      pendingQuotations: {
        total: 0,
        pending: 0,
        sent: 0,
        accepted: 0,
        rejected: 0,
        overdue: 0,
        totalValue: 0
      },
      salesPerformance: {
        monthlyRevenue: 0,
        quarterlyGrowth: 15,
        topPerformers: []
      }
    };
  }
}
