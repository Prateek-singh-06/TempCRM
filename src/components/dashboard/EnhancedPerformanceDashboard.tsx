"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Award,
  Zap,
  Activity,
  ArrowUp,
  ArrowDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  Filter,
  Calendar,
  Download,
  RefreshCw,
} from "lucide-react";

const COLORS = {
  primary: "#3B82F6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  purple: "#8B5CF6",
  pink: "#EC4899",
  chart: ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"],
};

interface PerformanceMetrics {
  revenue: {
    current: number;
    target: number;
    growth: number;
    trend: "up" | "down";
    forecast: number;
  };
  deals: {
    won: number;
    lost: number;
    pending: number;
    averageSize: number;
    averageCycle: number;
  };
  conversion: {
    leadToOpportunity: number;
    opportunityToPipeline: number;
    pipelineToWon: number;
    overallRate: number;
  };
  team: Array<{
    id: string;
    name: string;
    role?: string;
    revenue: number;
    deals: number;
    activities: number;
    conversionRate: number;
    averageDealSize: number;
    rank: number;
  }>;
  salesFunnel: Array<{
    stage: string;
    value: number;
    count: number;
    conversion: number;
    averageTime: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    deals: number;
    activities: number;
    conversionRate: number;
  }>;
  kpis: {
    salesVelocity: number;
    customerAcquisitionCost: number;
    customerLifetimeValue: number;
    netPromoterScore: number;
    churnRate: number;
  };
  pipeline: {
    openValue: number;
    weightedValue: number;
    coverageRatio: number;
    velocityStatus: "healthy" | "watch" | "atRisk";
  };
}

export default function EnhancedPerformanceDashboard({ metrics }: { metrics: any }) {
  const [timeRange, setTimeRange] = useState("month");
  const [teamFilter, setTeamFilter] = useState("all");
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, [timeRange, teamFilter, metrics]);

  const fetchPerformanceData = async () => {
    setLoading(true);

    const safeFetchJson = async (url: string) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Performance dashboard: ${url} responded with ${response.status}`);
          return null;
        }
        return await response.json();
      } catch (error) {
        console.error(`Performance dashboard: failed to fetch ${url}`, error);
        return null;
      }
    };

    const rangeDays = (() => {
      switch (timeRange) {
        case "week":
          return 7;
        case "quarter":
          return 90;
        case "year":
          return 365;
        default:
          return 30;
      }
    })();

    try {
      const [
        leadsPayload,
        opportunitiesPayload,
        activitiesPayload,
        attendancePayload,
        activitySummaryPayload,
      ] = await Promise.all([
        safeFetchJson('/api/leads'),
        safeFetchJson('/api/opportunities'),
        safeFetchJson(`/api/activities?scope=team&days=${rangeDays}`),
        safeFetchJson('/api/attendance'),
        safeFetchJson('/api/activities/summary?days=90'),
      ]);

      const leads = Array.isArray(leadsPayload?.leads)
        ? leadsPayload.leads
        : Array.isArray(leadsPayload)
          ? leadsPayload
          : [];
      const opportunities = Array.isArray(opportunitiesPayload?.opportunities)
        ? opportunitiesPayload.opportunities
        : Array.isArray(opportunitiesPayload)
          ? opportunitiesPayload
          : [];
      const activities = Array.isArray(activitiesPayload?.activities)
        ? activitiesPayload.activities
        : Array.isArray(activitiesPayload)
          ? activitiesPayload
          : [];
      const attendance = Array.isArray(attendancePayload?.attendance)
        ? attendancePayload.attendance
        : Array.isArray(attendancePayload)
          ? attendancePayload
          : [];
      const activitySummary = Array.isArray(activitySummaryPayload?.summary)
        ? activitySummaryPayload.summary
        : [];

      const processedData = processPerformanceMetrics({
        leads,
        opportunities,
        activities,
        attendance,
        activitySummary,
        analytics: metrics,
      });

      setPerformanceData(processedData);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processPerformanceMetrics = ({
    leads,
    opportunities,
    activities,
    attendance,
    activitySummary,
    analytics,
  }: {
    leads: any[];
    opportunities: any[];
    activities: any[];
    attendance: any[];
    activitySummary: any[];
    analytics: any;
  }): PerformanceMetrics => {
    const normalizedLeads = (Array.isArray(leads) ? leads : []).map((lead: any) => ({
      ...lead,
      createdAt: lead.createdDate ? new Date(lead.createdDate) : lead.createdAt ? new Date(lead.createdAt) : null,
      qualificationStage: String(lead.qualificationStage || lead.status || '').toUpperCase(),
    }));

    const normalizedOpportunities = (Array.isArray(opportunities) ? opportunities : []).map((opp: any) => {
      const stage = String(opp.stage || opp.status || '').toUpperCase();
      return {
        ...opp,
        stage,
        ownerId: Number(opp.ownerId ?? opp.ownerUserId ?? opp.users?.id ?? opp.userId ?? 0),
        dealValue: Number(opp.closedValue ?? opp.dealSize ?? 0),
        probability: Number(opp.probability ?? opp.winProbability ?? 0),
        createdAt: opp.createdDate ? new Date(opp.createdDate) : opp.createdAt ? new Date(opp.createdAt) : null,
        updatedAt: opp.updatedAt ? new Date(opp.updatedAt) : opp.updatedAtUTC ? new Date(opp.updatedAtUTC) : null,
        wonDate: opp.wonDate ? new Date(opp.wonDate) : null,
      };
    });

    const normalizedActivities = (Array.isArray(activities) ? activities : []).map((activity: any) => ({
      ...activity,
      occurredAt: activity.timestamp
        ? new Date(activity.timestamp)
        : activity.occurredAt
          ? new Date(activity.occurredAt)
          : activity.createdAt
            ? new Date(activity.createdAt)
            : null,
    }));

    const normalizedAttendance = (Array.isArray(attendance) ? attendance : []).map((record: any) => ({
      ...record,
      userId: Number(record.userId ?? record.user_id ?? record.user?.id ?? 0),
    }));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const valueOf = (deal: any) => Number(deal.dealValue ?? 0);
    const effectiveCloseDate = (deal: any) => deal.wonDate ?? deal.updatedAt ?? deal.createdAt ?? now;

    const wonDeals = normalizedOpportunities.filter(opp => opp.stage === 'CLOSED_WON');
    const lostDeals = normalizedOpportunities.filter(opp => opp.stage === 'CLOSED_LOST');
    const openDeals = normalizedOpportunities.filter(opp => !['CLOSED_WON', 'CLOSED_LOST'].includes(opp.stage));
    const negotiationDeals = normalizedOpportunities.filter(opp => opp.stage === 'NEGOTIATION');

    const currentPeriodDeals = wonDeals.filter(deal => effectiveCloseDate(deal) >= startOfMonth);
    const previousPeriodDeals = wonDeals.filter(deal => {
      const closeDate = effectiveCloseDate(deal);
      return closeDate >= startOfPrevMonth && closeDate < startOfMonth;
    });

    const monthlyRevenue = currentPeriodDeals.reduce((sum, deal) => sum + valueOf(deal), 0);
    const totalRevenue = wonDeals.reduce((sum, deal) => sum + valueOf(deal), 0);
    const currentRevenue = monthlyRevenue > 0 ? monthlyRevenue : totalRevenue;
    const previousRevenue = previousPeriodDeals.reduce((sum, deal) => sum + valueOf(deal), 0);
    const revenueGrowth = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : currentRevenue > 0
        ? 100
        : 0;

    const targetRevenue = Number((
      analytics?.monthlyTarget?.target ??
      analytics?.realTimeMetrics?.totalRevenue ??
      (currentRevenue || totalRevenue) * 1.2
    ) || 1000000);

    const openPipelineValue = openDeals.reduce((sum, deal) => sum + valueOf(deal), 0);
    const weightedPipelineValue = openDeals.reduce((sum, deal) => sum + valueOf(deal) * ((deal.probability || 0) / 100), 0);
    const forecastRevenue = currentRevenue + weightedPipelineValue;

    const averageCycle = (() => {
      const durations = wonDeals
        .map(deal => {
          if (!deal.createdAt) return null;
          const closeDate = effectiveCloseDate(deal);
          const diff = (closeDate.getTime() - deal.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return Number.isFinite(diff) && diff >= 0 ? diff : null;
        })
        .filter((value): value is number => value !== null);

      if (durations.length === 0) {
        return 0;
      }

      return Math.round(durations.reduce((sum, days) => sum + days, 0) / durations.length);
    })();

    const dealMetrics = {
      won: wonDeals.length,
      lost: lostDeals.length,
      pending: openDeals.length,
      averageSize: wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0,
      averageCycle,
    };

    const pipelineStages = ['PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'];
    const pipelineOpportunities = normalizedOpportunities.filter(opp => pipelineStages.includes(opp.stage));

    const conversionMetrics = {
      leadToOpportunity: normalizedLeads.length > 0 ? (normalizedOpportunities.length / normalizedLeads.length) * 100 : 0,
      opportunityToPipeline: normalizedOpportunities.length > 0 ? (pipelineOpportunities.length / normalizedOpportunities.length) * 100 : 0,
      pipelineToWon: pipelineOpportunities.length > 0 ? (wonDeals.length / pipelineOpportunities.length) * 100 : 0,
      overallRate: normalizedLeads.length > 0 ? (wonDeals.length / normalizedLeads.length) * 100 : 0,
    };

    const teamPerformance = processTeamPerformance({
      opportunities: normalizedOpportunities,
      activitySummary,
      attendance: normalizedAttendance,
    });

    const salesFunnel = buildSalesFunnel({
      leads: normalizedLeads,
      opportunities: normalizedOpportunities,
      negotiationDeals,
      wonDeals,
      dealMetrics,
    });

    const monthlyTrends = generateMonthlyTrends({
      leads: normalizedLeads,
      opportunities: normalizedOpportunities,
      activities: normalizedActivities,
      wonDeals,
    });

    const salesVelocity = calculateSalesVelocity({ deals: dealMetrics, conversion: conversionMetrics });

    const churnRate = Number(analytics?.realTimeMetrics?.churnRate ?? 0.05);
    const churnRatePercent = Math.round(churnRate * 1000) / 10;
    const totalActivities = normalizedActivities.length;
    const newCustomers = wonDeals.length > 0 ? wonDeals.length : currentPeriodDeals.length;
    const estimatedMarketingSpend = totalActivities * 45;
    const customerAcquisitionCost = newCustomers > 0 ? estimatedMarketingSpend / newCustomers : 0;
    const revenuePerCustomer = newCustomers > 0 ? totalRevenue / newCustomers : totalRevenue;
    const customerLifetimeValue = churnRate > 0 ? revenuePerCustomer * (1 / churnRate) : revenuePerCustomer * 5;
    const netPromoterScore = Math.round(
      Math.max(
        0,
        Math.min(100, 70 + (analytics?.realTimeMetrics?.revenueGrowth ?? 0) * 100 - churnRatePercent / 2),
      ),
    );

    const coverageRatio = targetRevenue > 0 ? openPipelineValue / targetRevenue : 0;
    const velocityStatus: 'healthy' | 'watch' | 'atRisk' = salesVelocity > dealMetrics.averageSize
      ? 'healthy'
      : salesVelocity > dealMetrics.averageSize * 0.5
        ? 'watch'
        : 'atRisk';

    return {
      revenue: {
        current: currentRevenue,
        target: targetRevenue,
        growth: revenueGrowth,
        trend: revenueGrowth >= 0 ? "up" : "down",
        forecast: forecastRevenue,
      },
      deals: dealMetrics,
      conversion: conversionMetrics,
      team: teamPerformance,
      salesFunnel,
      monthlyTrends,
      kpis: {
        salesVelocity,
        customerAcquisitionCost,
        customerLifetimeValue,
        netPromoterScore,
        churnRate: churnRatePercent,
      },
      pipeline: {
        openValue: openPipelineValue,
        weightedValue: weightedPipelineValue,
        coverageRatio,
        velocityStatus,
      },
    };
  };

  const processTeamPerformance = ({
    opportunities,
    activitySummary,
    attendance,
  }: {
    opportunities: any[];
    activitySummary: any[];
    attendance: any[];
  }): PerformanceMetrics['team'] => {
    const activityCountByUser = new Map<number, number>();
    (Array.isArray(activitySummary) ? activitySummary : []).forEach((summary: any) => {
      const userId = Number(summary.userId ?? 0);
      if (!userId) return;
      const total = ['calls', 'emails', 'meetings', 'demos', 'proposals', 'followUps', 'visits']
        .map(key => Number(summary[key] ?? 0))
        .reduce((sum, value) => sum + value, 0);
      activityCountByUser.set(userId, total);
    });

    const attendanceByUser = new Map<number, number>();
    (Array.isArray(attendance) ? attendance : []).forEach((record: any) => {
      const userId = Number(record.userId ?? 0);
      if (!userId) return;
      const status = String(record.status || record.attendanceStatus || '').toUpperCase();
      if (['APPROVED', 'PRESENT', 'SUBMITTED', 'WAITING'].includes(status)) {
        attendanceByUser.set(userId, (attendanceByUser.get(userId) ?? 0) + 1);
      }
    });

    const teamMap = new Map<number, {
      id: number;
      name: string;
      role?: string;
      deals: number;
      wonDeals: number;
      revenue: number;
      totalDealValue: number;
    }>();

    (Array.isArray(opportunities) ? opportunities : []).forEach((opp: any) => {
      const ownerId = Number(opp.ownerId ?? 0);
      if (!ownerId) return;

      if (!teamMap.has(ownerId)) {
        teamMap.set(ownerId, {
          id: ownerId,
          name: opp.users?.name || `User ${ownerId}`,
          role: opp.users?.role,
          deals: 0,
          wonDeals: 0,
          revenue: 0,
          totalDealValue: 0,
        });
      }

      const entry = teamMap.get(ownerId)!;
      if (!entry.role && opp.users?.role) {
        entry.role = opp.users.role;
      }
      entry.deals += 1;
      entry.totalDealValue += Number(opp.dealValue ?? 0);
      if (opp.stage === 'CLOSED_WON') {
        entry.wonDeals += 1;
        entry.revenue += Number(opp.dealValue ?? 0);
      }
    });

    const team = Array.from(teamMap.values()).map(member => {
      const attendanceDays = attendanceByUser.get(member.id) ?? 0;
      const activities = activityCountByUser.get(member.id) ?? attendanceDays;
      const conversionRate = member.deals > 0 ? (member.wonDeals / member.deals) * 100 : 0;
      const averageDealSize = member.wonDeals > 0
        ? member.revenue / member.wonDeals
        : member.deals > 0
          ? member.totalDealValue / member.deals
          : 0;

      return {
        id: String(member.id),
        name: member.name,
        role: member.role,
        revenue: member.revenue,
        deals: member.deals,
        activities,
        conversionRate,
        averageDealSize,
        rank: 0,
      };
    });

    const sorted = team.sort((a, b) => b.revenue - a.revenue);
    return sorted.map((member, index) => ({ ...member, rank: index + 1 }));
  };

  const buildSalesFunnel = ({
    leads,
    opportunities,
    negotiationDeals,
    wonDeals,
    dealMetrics,
  }: {
    leads: any[];
    opportunities: any[];
    negotiationDeals: any[];
    wonDeals: any[];
    dealMetrics: PerformanceMetrics['deals'];
  }): PerformanceMetrics['salesFunnel'] => {
    const qualifiedStages = ['QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'];
    const qualifiedLeads = leads.filter(lead => qualifiedStages.includes(lead.qualificationStage));
    const activeOpportunities = opportunities.filter(opp => opp.stage !== 'CLOSED_LOST');

    const averageDays = (collection: any[], dateAccessor: (item: any) => Date | null) => {
      const days = collection
        .map(item => {
          const date = dateAccessor(item);
          if (!date) return null;
          const diff = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
          return Number.isFinite(diff) && diff >= 0 ? diff : null;
        })
        .filter((value): value is number => value !== null);

      if (days.length === 0) {
        return 0;
      }

      return Math.round(days.reduce((sum, value) => sum + value, 0) / days.length);
    };

    const funnelStages = [
      {
        stage: 'Leads',
        count: leads.length,
        value: leads.length,
        averageTime: averageDays(leads, lead => lead.createdAt),
      },
      {
        stage: 'Qualified',
        count: qualifiedLeads.length,
        value: qualifiedLeads.length,
        averageTime: averageDays(qualifiedLeads, lead => lead.createdAt),
      },
      {
        stage: 'Opportunities',
        count: activeOpportunities.length,
        value: activeOpportunities.reduce((sum, opp) => sum + Number(opp.dealValue ?? 0), 0),
        averageTime: averageDays(activeOpportunities, opp => opp.createdAt),
      },
      {
        stage: 'Negotiation',
        count: negotiationDeals.length,
        value: negotiationDeals.reduce((sum, opp) => sum + Number(opp.dealValue ?? 0), 0),
        averageTime: averageDays(negotiationDeals, opp => opp.createdAt),
      },
      {
        stage: 'Won',
        count: wonDeals.length,
        value: wonDeals.reduce((sum, opp) => sum + Number(opp.dealValue ?? 0), 0),
        averageTime: dealMetrics.averageCycle,
      },
    ];

    return funnelStages.map((stage, index, arr) => {
      const previousCount = index === 0 ? stage.count : arr[index - 1].count || 1;
      const conversion = previousCount > 0 ? (stage.count / previousCount) * 100 : 0;
      return {
        stage: stage.stage,
        value: stage.value,
        count: stage.count,
        conversion,
        averageTime: stage.averageTime,
      };
    });
  };

  const generateMonthlyTrends = ({
    leads,
    opportunities,
    activities,
    wonDeals,
  }: {
    leads: any[];
    opportunities: any[];
    activities: any[];
    wonDeals: any[];
  }): PerformanceMetrics['monthlyTrends'] => {
    const now = new Date();
    const months: PerformanceMetrics['monthlyTrends'] = [];

    for (let offset = 5; offset >= 0; offset--) {
      const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
      const label = start.toLocaleDateString('en-US', { month: 'short' });

      const leadsInMonth = leads.filter(lead => lead.createdAt && lead.createdAt >= start && lead.createdAt < end);
      const opportunitiesInMonth = opportunities.filter(opp => opp.createdAt && opp.createdAt >= start && opp.createdAt < end);
      const wonDealsInMonth = wonDeals.filter(deal => {
        const closeDate = deal.wonDate ?? deal.updatedAt ?? deal.createdAt;
        return closeDate && closeDate >= start && closeDate < end;
      });
      const activitiesInMonth = activities.filter(activity => activity.occurredAt && activity.occurredAt >= start && activity.occurredAt < end);

      const revenue = wonDealsInMonth.reduce((sum, deal) => sum + Number(deal.dealValue ?? 0), 0);
      const conversionRate = leadsInMonth.length > 0 ? (wonDealsInMonth.length / leadsInMonth.length) * 100 : 0;

      months.push({
        month: label,
        revenue,
        deals: opportunitiesInMonth.length,
        activities: activitiesInMonth.length,
        conversionRate,
      });
    }

    return months;
  };

  const calculateSalesVelocity = ({
    deals,
    conversion,
  }: {
    deals: PerformanceMetrics['deals'];
    conversion: PerformanceMetrics['conversion'];
  }) => {
    if (!deals || deals.averageCycle <= 0) {
      return 0;
    }

    const velocity = (deals.won * deals.averageSize * (conversion.overallRate / 100)) / deals.averageCycle;
    return Number.isFinite(velocity) ? velocity : 0;
  };

  const formatCurrency = (value: number) => {
    if (!Number.isFinite(value)) {
      return '$0';
    }

    const minimumFractionDigits = Math.abs(value) < 100 ? 2 : 0;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits,
      maximumFractionDigits: minimumFractionDigits,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    if (!Number.isFinite(value)) {
      return '0%';
    }

    return `${value.toFixed(1)}%`;
  };

  if (loading || !performanceData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-600">Loading performance data...</p>
        </div>
      </div>
    );
  }

  const coverageRatioDisplay = Number.isFinite(performanceData.pipeline.coverageRatio)
    ? `${performanceData.pipeline.coverageRatio.toFixed(1)}x`
    : '0.0x';
  const pipelineVelocityStatus = performanceData.pipeline.velocityStatus;
  const pipelineVelocityBadgeClass = pipelineVelocityStatus === 'healthy'
    ? 'bg-green-100 text-green-700'
    : pipelineVelocityStatus === 'watch'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700';
  const pipelineVelocityLabel = pipelineVelocityStatus === 'healthy'
    ? 'Healthy'
    : pipelineVelocityStatus === 'watch'
      ? 'Watchlist'
      : 'Needs Attention';
  const normalizedFilter = teamFilter.toLowerCase();
  const filteredTeam = normalizedFilter === 'all'
    ? performanceData.team
    : performanceData.team.filter(member => {
        const role = member.role?.toLowerCase() ?? '';
        return role && role.includes(normalizedFilter);
      });
  const teamToDisplay = filteredTeam.length > 0 ? filteredTeam : performanceData.team;

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Dashboard</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track your sales performance and team metrics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Team Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="sales">Sales Team</SelectItem>
              <SelectItem value="marketing">Marketing Team</SelectItem>
              <SelectItem value="support">Support Team</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={fetchPerformanceData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Revenue
              </span>
              {performanceData.revenue.trend === "up" ? (
                <ArrowUp className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatCurrency(performanceData.revenue.current)}
              </div>
              <Progress 
                value={(performanceData.revenue.current / performanceData.revenue.target) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Target: {formatCurrency(performanceData.revenue.target)}</span>
                <span className={`font-medium ${performanceData.revenue.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {performanceData.revenue.growth > 0 ? '+' : ''}{performanceData.revenue.growth.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Deals Won
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{performanceData.deals.won}</div>
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Won: {performanceData.deals.won}
                </Badge>
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  Lost: {performanceData.deals.lost}
                </Badge>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                  Pending: {performanceData.deals.pending}
                </Badge>
              </div>
              <div className="text-xs text-gray-600">
                Avg Size: {formatCurrency(performanceData.deals.averageSize)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Sales Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatCurrency(performanceData.kpis.salesVelocity)}/day
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Cycle</span>
                  <span>{performanceData.deals.averageCycle} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Win Rate</span>
                  <span>{formatPercentage(performanceData.conversion.pipelineToWon)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatPercentage(performanceData.conversion.overallRate)}
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Lead → Opp</span>
                  <span>{formatPercentage(performanceData.conversion.leadToOpportunity)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Opp → Won</span>
                  <span>{formatPercentage(performanceData.conversion.pipelineToWon)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Funnel and Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Funnel */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-600" />
              Sales Funnel
            </CardTitle>
            <CardDescription>Conversion through each stage.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <FunnelChart>
                <Tooltip />
                <Funnel
                  dataKey="value"
                  data={performanceData.salesFunnel}
                  isAnimationActive
                >
                  {performanceData.salesFunnel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                  ))}
                  <LabelList position="center" fill="#fff" stroke="none" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {performanceData.salesFunnel.map((stage, index) => (
                <div key={stage.stage} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS.chart[index % COLORS.chart.length] }}
                    />
                    <span className="font-medium">{stage.stage}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>{stage.count} items</span>
                    <span>{formatPercentage(stage.conversion)} conversion</span>
                    <span>{stage.averageTime}d avg</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Monthly revenue and activity trends.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke={COLORS.primary} 
                  strokeWidth={2} 
                  name="Revenue"
                  dot={{ fill: COLORS.primary }}
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="conversionRate" 
                  stroke={COLORS.success} 
                  strokeWidth={2} 
                  name="Conversion %"
                  dot={{ fill: COLORS.success }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-600">Avg Revenue</p>
                <p className="text-sm font-bold">
                  {formatCurrency(
                    performanceData.monthlyTrends.reduce((sum, m) => sum + m.revenue, 0) / 
                    performanceData.monthlyTrends.length
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Deals</p>
                <p className="text-sm font-bold">
                  {performanceData.monthlyTrends.reduce((sum, m) => sum + m.deals, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Forecast</p>
                <p className="text-sm font-bold text-blue-600">
                  {formatCurrency(performanceData.revenue.forecast)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Leaderboard */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-600" />
            Team Leaderboard
          </CardTitle>
          <CardDescription>Top performers ranked by revenue and activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamToDisplay.slice(0, 5).map((member, index) => (
              <div key={member.id} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-yellow-200' :
                    index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600 shadow-gray-200' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-200' :
                    'bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-200'
                  } shadow-lg`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{member.name}</p>
                    {member.role && (
                      <p className="text-xs text-gray-500 dark:text-gray-300 capitalize">{member.role}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {member.deals} deals
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {member.activities} activities
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {formatPercentage(member.conversionRate)} conv
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(member.revenue)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Avg deal: {formatCurrency(member.averageDealSize)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Customer Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">CAC</span>
                <span className="text-sm font-bold">{formatCurrency(performanceData.kpis.customerAcquisitionCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">CLV</span>
                <span className="text-sm font-bold">{formatCurrency(performanceData.kpis.customerLifetimeValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">CLV/CAC Ratio</span>
                <span className="text-sm font-bold text-green-600">
                  {(performanceData.kpis.customerLifetimeValue / performanceData.kpis.customerAcquisitionCost).toFixed(1)}x
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">NPS Score</span>
                <Badge className={`${
                  performanceData.kpis.netPromoterScore > 70 ? 'bg-green-100 text-green-700' :
                  performanceData.kpis.netPromoterScore > 30 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {performanceData.kpis.netPromoterScore}
                </Badge>
              </div>
              <Progress value={performanceData.kpis.netPromoterScore} className="h-2" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Churn Rate</span>
                <span className="text-sm font-bold text-red-600">{performanceData.kpis.churnRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Coverage Ratio</span>
                <span className="text-sm font-bold">{coverageRatioDisplay}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Weighted Pipeline</span>
                <span className="text-sm font-bold">
                  {formatCurrency(performanceData.pipeline.weightedValue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Deal Velocity</span>
                <Badge className={pipelineVelocityBadgeClass}>{pipelineVelocityLabel}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
