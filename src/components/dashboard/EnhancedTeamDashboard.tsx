"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { ScrollArea } from "@/components/ui/scroll-area";
import AttendanceMonitoringSystem from "./AttendanceMonitoringSystem";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  Users,
  UserCheck,
  UserX,
  Activity,
  Calendar,
  Clock,
  Target,
  Award,
  TrendingUp,
  TrendingDown,
  Mail,
  Phone,
  Video,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Briefcase,
  Star,
  Shield,
  Zap,
  Brain,
  Heart,
  Coffee,
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

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  avatar?: string;
  status: 'active' | 'away' | 'offline';
  performance: {
    revenue: number;
    deals: number;
    activities: number;
    conversionRate: number;
    customerSatisfaction: number;
  };
  attendance: {
    present: number;
    absent: number;
    late: number;
    totalDays: number;
  };
  workload: {
    tasks: number;
    opportunities: number;
    meetings: number;
    capacity: number;
  };
  skills: Array<{
    name: string;
    level: number;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

interface TeamMetrics {
  totalMembers: number;
  activeMembers: number;
  teamRevenue: number;
  teamDeals: number;
  averagePerformance: number;
  attendanceRate: number;
  collaboration: {
    meetings: number;
    sharedDeals: number;
    internalMessages: number;
    knowledgeSharing: number;
  };
  departmentBreakdown: Array<{
    name: string;
    count: number;
    revenue: number;
    performance: number;
  }>;
  activityHeatmap: Array<{
    day: string;
    hour: number;
    value: number;
  }>;
  activityHeatmapMax: number;
  workloadDistribution: Array<{
    name: string;
    tasks: number;
    capacity: number;
    utilization: number;
  }>;
  activityTimeline: Array<{
    hour: number;
    time: string;
    activities: number;
  }>;
  teamSkills: Array<{
    skill: string;
    value: number;
  }>;
}

export default function EnhancedTeamDashboard({ metrics }: { metrics: any }) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedView, setSelectedView] = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamData();
  }, [metrics]);

  const fetchTeamData = async () => {
    setLoading(true);

    const safeFetchJson = async (url: string) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Team dashboard: ${url} responded with ${response.status}`);
          return null;
        }
        return await response.json();
      } catch (error) {
        console.error(`Team dashboard: failed to fetch ${url}`, error);
        return null;
      }
    };

    const todayIso = new Date().toISOString().split('T')[0];

    try {
      const [
        membersPayload,
        opportunitiesPayload,
        activitiesPayload,
        activitySummaryPayload,
        attendancePayload,
      ] = await Promise.all([
        safeFetchJson('/api/members'),
        safeFetchJson('/api/opportunities'),
        safeFetchJson('/api/activities?scope=team&days=90'),
        safeFetchJson('/api/activities/summary?days=90'),
        safeFetchJson(`/api/attendance?date=${todayIso}`),
      ]);

      const members = (Array.isArray(membersPayload?.members)
        ? membersPayload.members
        : Array.isArray(membersPayload)
          ? membersPayload
          : []
      ).filter(
        (m: any) => !['admin', 'Admin', 'SuperAdmin', 'superadmin'].includes(m.role)
      );
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
      const activitySummary = Array.isArray(activitySummaryPayload?.summary)
        ? activitySummaryPayload.summary
        : [];
      const attendanceRecords = Array.isArray(attendancePayload?.attendance)
        ? attendancePayload.attendance
        : Array.isArray(attendancePayload)
          ? attendancePayload
          : [];

      const processedMembers = processTeamMembers({
        members,
        opportunities,
        activities,
        activitySummary,
        attendance: attendanceRecords,
        analytics: metrics,
      });
      const processedMetrics = processTeamMetrics({
        members: processedMembers,
        opportunities,
        activitySummary,
        activities,
      });

      setTeamMembers(processedMembers);
      setTeamMetrics(processedMetrics);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTeamMembers = ({
    members,
    opportunities,
    activities,
    activitySummary,
    attendance,
    analytics,
  }: {
    members: any[];
    opportunities: any[];
    activities: any[];
    activitySummary: any[];
    attendance: any[];
    analytics: any;
  }): TeamMember[] => {
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];

    const normalizedOpportunities = (Array.isArray(opportunities) ? opportunities : []).map((opp: any) => ({
      ...opp,
      stage: String(opp.stage || opp.status || '').toUpperCase(),
      ownerId: Number(opp.ownerId ?? opp.ownerUserId ?? opp.users?.id ?? opp.userId ?? 0),
      dealValue: Number(opp.closedValue ?? opp.dealSize ?? 0),
      createdAt: opp.createdDate ? new Date(opp.createdDate) : opp.createdAt ? new Date(opp.createdAt) : null,
      updatedAt: opp.updatedAt ? new Date(opp.updatedAt) : opp.updatedAtUTC ? new Date(opp.updatedAtUTC) : null,
      wonDate: opp.wonDate ? new Date(opp.wonDate) : null,
    }));

    const opportunitiesByOwner = new Map<number, typeof normalizedOpportunities>();
    normalizedOpportunities.forEach(opp => {
      if (!opp.ownerId) return;
      if (!opportunitiesByOwner.has(opp.ownerId)) {
        opportunitiesByOwner.set(opp.ownerId, []);
      }
      opportunitiesByOwner.get(opp.ownerId)!.push(opp);
    });

    const summaryByUser = new Map<number, any>();
    (Array.isArray(activitySummary) ? activitySummary : []).forEach((summary: any) => {
      const userId = Number(summary.userId ?? 0);
      if (!userId) return;
      summaryByUser.set(userId, summary);
    });

    const attendanceStatsByUser = new Map<number, { days: Set<string>; present: Set<string>; late: number }>();
    const ensureAttendanceEntry = (userId: number) => {
      if (!attendanceStatsByUser.has(userId)) {
        attendanceStatsByUser.set(userId, { days: new Set(), present: new Set(), late: 0 });
      }
      return attendanceStatsByUser.get(userId)!;
    };
    const registerAttendance = (userId: number, dateKey: string | null, status: string) => {
      if (!userId || !dateKey) {
        return;
      }
      const entry = ensureAttendanceEntry(userId);
      entry.days.add(dateKey);
      if (['APPROVED', 'PRESENT', 'SUBMITTED'].includes(status)) {
        entry.present.add(dateKey);
      }
      if (['LATE', 'AUTO_FLAGGED'].includes(status)) {
        entry.late += 1;
      }
    };

    (Array.isArray(attendance) ? attendance : []).forEach((record: any) => {
      const userId = Number(record.userId ?? record.user_id ?? record.user?.id ?? 0);
      if (!userId) return;
      const status = String(record.status || record.attendanceStatus || '').toUpperCase();
      const rawDate = record.date || record.attendanceDate || record.submittedAt || record.createdAt;
      const dateKey = rawDate ? new Date(rawDate).toISOString().split('T')[0] : null;
      registerAttendance(userId, dateKey, status);
    });

    const analyticsAttendance = analytics?.attendance;
    if (analyticsAttendance?.present) {
      analyticsAttendance.present.forEach((item: any) => {
        const userId = Number(item.id ?? item.userId ?? 0);
        if (!userId) return;
        registerAttendance(userId, todayKey, 'PRESENT');
      });
    }

    const processedMembers = (Array.isArray(members) ? members : []).map((member: any) => {
      const userId = Number(member.id ?? member.userId ?? 0);
      const memberOpportunities = opportunitiesByOwner.get(userId) ?? [];
      const wonDeals = memberOpportunities.filter(opp => opp.stage === 'CLOSED_WON');
      const openDeals = memberOpportunities.filter(opp => !['CLOSED_WON', 'CLOSED_LOST'].includes(opp.stage));
      const revenue = wonDeals.reduce((sum, deal) => sum + (deal.dealValue ?? 0), 0);
      const summary = summaryByUser.get(userId);
      const totalActivities = summary
        ? ['calls', 'emails', 'meetings', 'demos', 'proposals', 'followUps', 'visits']
            .map(key => Number(summary[key] ?? 0))
            .reduce((sum, value) => sum + value, 0)
        : Number(member._count?.activities ?? 0);
      const meetings = Number(summary?.meetings ?? 0);
      const attendanceStats = attendanceStatsByUser.get(userId);
      const totalAttendanceDays = attendanceStats ? attendanceStats.days.size : 0;
      const presentDays = attendanceStats ? attendanceStats.present.size : 0;
      const lateCount = attendanceStats ? attendanceStats.late : 0;
      const totalDeals = memberOpportunities.length;
      const conversionRate = totalDeals > 0 ? (wonDeals.length / totalDeals) * 100 : 0;
      const attendanceRatio = totalAttendanceDays > 0 ? (presentDays / totalAttendanceDays) * 100 : 0;
      const customerSatisfaction = Math.max(
        65,
        Math.min(100, 60 + conversionRate * 0.4 + attendanceRatio * 0.3 + (totalActivities > 0 ? 5 : 0)),
      );

      let status: 'active' | 'away' | 'offline' = 'offline';
      if (presentDays > 0 || totalActivities > 0) {
        status = 'active';
      } else if (openDeals.length > 0) {
        status = 'away';
      }

      const workloadTasks = totalActivities + openDeals.length;
      const workloadCapacity = Math.max(workloadTasks + 20, 40);

      const skills = deriveSkills({
        conversionRate,
        meetings,
        totalActivities,
        revenue,
        openDeals: openDeals.length,
      });

      const recentActivity = buildRecentActivity({
        summary,
        openDeals,
        wonDeals,
        now,
      });

      return {
        id: String(userId),
        name: member.name || 'Unknown',
        role: member.role || undefined,
        department: member.department || 'General',
        email: member.email || '',
        phone: member.phone || '',
        status,
        performance: {
          revenue,
          deals: totalDeals,
          activities: totalActivities,
          conversionRate,
          customerSatisfaction,
        },
        attendance: {
          present: presentDays,
          absent: totalAttendanceDays > 0 ? Math.max(totalAttendanceDays - presentDays, 0) : 0,
          late: lateCount,
          totalDays: totalAttendanceDays > 0 ? totalAttendanceDays : Math.max(presentDays, 1),
        },
        workload: {
          tasks: workloadTasks,
          opportunities: openDeals.length,
          meetings,
          capacity: workloadCapacity,
        },
        skills,
        recentActivity,
      } as TeamMember;
    });

    const sortedMembers = processedMembers.sort((a, b) => b.performance.revenue - a.performance.revenue);
    return sortedMembers.map((member, index) => ({ ...member, rank: index + 1 }));
  };

  const processTeamMetrics = ({
    members,
    opportunities,
    activitySummary,
    activities,
  }: {
    members: TeamMember[];
    opportunities: any[];
    activitySummary: any[];
    activities: any[];
  }): TeamMetrics => {
    const totalMembers = members.length;
    const teamRevenue = members.reduce((sum, member) => sum + member.performance.revenue, 0);
    const teamDeals = members.reduce((sum, member) => sum + member.performance.deals, 0);
    const activeMembers = members.filter(member => member.status === 'active').length;
    const averagePerformance = totalMembers > 0
      ? members.reduce((sum, member) => sum + member.performance.conversionRate, 0) / totalMembers
      : 0;
    const attendanceRate = totalMembers > 0
      ? (members.reduce((sum, member) => {
          const ratio = member.attendance.totalDays > 0
            ? member.attendance.present / member.attendance.totalDays
            : 0;
          return sum + ratio;
        }, 0) / totalMembers) * 100
      : 0;

    const departmentNames = Array.from(new Set(members.map(member => member.department || 'General')));
    const departmentBreakdown = departmentNames.map(department => {
      const deptMembers = members.filter(member => member.department === department);
      const count = deptMembers.length;
      const revenue = deptMembers.reduce((sum, member) => sum + member.performance.revenue, 0);
      const performance = count > 0
        ? deptMembers.reduce((sum, member) => sum + member.performance.conversionRate, 0) / count
        : 0;
      return { name: department, count, revenue, performance };
    });

    const summaryTotals = (Array.isArray(activitySummary) ? activitySummary : []).reduce((acc, item) => {
      ['meetings', 'calls', 'emails', 'followUps', 'proposals', 'demos'].forEach(key => {
        const numeric = Number(item[key] ?? 0);
        acc[key] = (acc[key] ?? 0) + numeric;
      });
      return acc;
    }, {} as Record<string, number>);

    const collaboration = {
      meetings: summaryTotals.meetings ?? 0,
      sharedDeals: (Array.isArray(opportunities) ? opportunities : []).filter((opp: any) => {
        const stage = String(opp.stage || opp.status || '').toUpperCase();
        return !['CLOSED_WON', 'CLOSED_LOST'].includes(stage) && Number(opp.probability ?? 0) >= 50;
      }).length,
      internalMessages: summaryTotals.emails ?? 0,
      knowledgeSharing: (summaryTotals.followUps ?? 0) + (summaryTotals.proposals ?? 0),
    };

    const normalizedActivities = (Array.isArray(activities) ? activities : []).map((activity: any) => ({
      ...activity,
      occurredAt: activity.occurredAt
        ? new Date(activity.occurredAt)
        : activity.timestamp
          ? new Date(activity.timestamp)
          : activity.createdAt
            ? new Date(activity.createdAt)
            : null,
    }));

    const { heatmap: activityHeatmap, maxValue: activityHeatmapMax } = buildActivityHeatmap(normalizedActivities);
    const activityTimeline = buildActivityTimeline(normalizedActivities);
    const teamSkills = buildTeamSkillsOverview(members);

    const baseNameCounts = members.reduce((acc, member) => {
      const base = (member.name || 'Member').split(' ')[0];
      acc.set(base, (acc.get(base) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());

    const workloadDistribution = members.map(member => {
      const base = (member.name || 'Member').split(' ')[0] || 'Member';
      const needsDisambiguation = (baseNameCounts.get(base) ?? 0) > 1;
      const labelSuffix = needsDisambiguation ? ` (${String(member.id).slice(-4)})` : '';
      const displayName = `${base}${labelSuffix}`;
      const utilization = member.workload.capacity > 0
        ? Math.min(100, (member.workload.tasks / member.workload.capacity) * 100)
        : 0;
      return {
        name: displayName,
        tasks: member.workload.tasks,
        capacity: member.workload.capacity,
        utilization,
      };
    });

    return {
      totalMembers,
      activeMembers,
      teamRevenue,
      teamDeals,
      averagePerformance,
      attendanceRate,
      collaboration,
      departmentBreakdown,
      activityHeatmap,
      activityHeatmapMax,
      workloadDistribution,
      activityTimeline,
      teamSkills,
    };
  };

  const deriveSkills = ({
    conversionRate,
    meetings,
    totalActivities,
    revenue,
    openDeals,
  }: {
    conversionRate: number;
    meetings: number;
    totalActivities: number;
    revenue: number;
    openDeals: number;
  }): TeamMember['skills'] => {
    const skills: TeamMember['skills'] = [];

    if (conversionRate > 0) {
      skills.push({ name: 'Deal Conversion', level: Math.min(95, Math.round(conversionRate)) });
    }
    if (meetings > 0) {
      skills.push({ name: 'Relationship Management', level: Math.min(90, 60 + meetings * 4) });
    }
    if (totalActivities > 0) {
      skills.push({ name: 'Engagement', level: Math.min(90, 50 + totalActivities * 2) });
    }
    if (revenue > 0) {
      const revenueScore = Math.min(95, 60 + Math.log10(revenue + 1) * 12);
      skills.push({ name: 'Revenue Impact', level: Math.round(revenueScore) });
    }
    if (openDeals > 0) {
      skills.push({ name: 'Pipeline Management', level: Math.min(90, 55 + openDeals * 5) });
    }

    if (skills.length === 0) {
      skills.push({ name: 'Customer Focus', level: 70 });
    }

    return skills.slice(0, 4);
  };

  const buildRecentActivity = ({
    summary,
    openDeals,
    wonDeals,
    now,
  }: {
    summary: any;
    openDeals: any[];
    wonDeals: any[];
    now: Date;
  }): TeamMember['recentActivity'] => {
    const items: TeamMember['recentActivity'] = [];
    if (wonDeals.length > 0) {
      items.push({
        type: 'deal',
        description: `Closed ${wonDeals.length} deal${wonDeals.length === 1 ? '' : 's'} recently`,
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      });
    }
    const calls = Number(summary?.calls ?? 0);
    if (calls > 0) {
      items.push({
        type: 'call',
        description: `Logged ${calls} call${calls === 1 ? '' : 's'} this period`,
        timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      });
    }
    const meetings = Number(summary?.meetings ?? 0);
    if (meetings > 0) {
      items.push({
        type: 'meeting',
        description: `Held ${meetings} meeting${meetings === 1 ? '' : 's'} with clients`,
        timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      });
    }
    if (openDeals.length > 0) {
      items.push({
        type: 'task',
        description: `Managing ${openDeals.length} active opportunit${openDeals.length === 1 ? 'y' : 'ies'}`,
        timestamp: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(),
      });
    }

    return items.slice(0, 3);
  };

  const buildActivityHeatmap = (
    activities: any[],
  ): { heatmap: TeamMetrics['activityHeatmap']; maxValue: number } => {
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const heatmap = new Map<string, number>();
    let maxValue = 0;

    activities.forEach(activity => {
      const occurredAt: Date | null = activity.occurredAt instanceof Date ? activity.occurredAt : null;
      if (!occurredAt) return;
      const day = dayLabels[occurredAt.getDay()];
      const hour = occurredAt.getHours();
      if (hour < 6 || hour > 21) return;
      const key = `${day}-${hour}`;
      const nextValue = (heatmap.get(key) ?? 0) + 1;
      heatmap.set(key, nextValue);
      if (nextValue > maxValue) {
        maxValue = nextValue;
      }
    });

    const heatmapData = Array.from(heatmap.entries()).map(([key, value]) => {
      const [day, hour] = key.split('-');
      return { day, hour: Number(hour), value };
    });

    return { heatmap: heatmapData, maxValue };
  };

  const buildActivityTimeline = (activities: any[]): TeamMetrics['activityTimeline'] => {
    const buckets = new Map<number, number>();

    activities.forEach(activity => {
      const occurredAt: Date | null = activity.occurredAt instanceof Date ? activity.occurredAt : null;
      if (!occurredAt) {
        return;
      }
      const hour = occurredAt.getHours();
      if (hour < 6 || hour > 21) {
        return;
      }
      buckets.set(hour, (buckets.get(hour) ?? 0) + 1);
    });

    const defaultHours = Array.from({ length: 10 }, (_, index) => index + 9);
    const hours = buckets.size > 0
      ? Array.from(buckets.keys()).sort((a, b) => a - b)
      : defaultHours;

    return hours.map(hour => ({
      hour,
      time: formatHourLabel(hour),
      activities: buckets.get(hour) ?? 0,
    }));
  };

  const buildTeamSkillsOverview = (members: TeamMember[]): TeamMetrics['teamSkills'] => {
    const aggregate = new Map<string, { total: number; count: number }>();

    members.forEach(member => {
      member.skills.forEach(skill => {
        const entry = aggregate.get(skill.name) ?? { total: 0, count: 0 };
        entry.total += skill.level;
        entry.count += 1;
        aggregate.set(skill.name, entry);
      });
    });

    const skills = Array.from(aggregate.entries()).map(([skill, { total, count }]) => ({
      skill,
      value: count > 0 ? Math.round(total / count) : 0,
    }));

    return skills
      .filter(entry => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  };

  const formatHourLabel = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const normalized = hour % 12 || 12;
    return `${normalized} ${period}`;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-3 w-3" />;
      case 'email': return <Mail className="h-3 w-3" />;
      case 'meeting': return <Video className="h-3 w-3" />;
      case 'deal': return <Briefcase className="h-3 w-3" />;
      case 'task': return <CheckCircle className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  if (loading || !teamMetrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Users className="h-8 w-8 animate-pulse text-blue-500" />
          <p className="text-sm text-gray-600">Loading team data...</p>
        </div>
      </div>
    );
  }

  const heatmapPeak = Math.max(teamMetrics.activityHeatmapMax ?? 0, 1);
  const activityTimelineData = teamMetrics.activityTimeline;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Team Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monitor team performance, collaboration, and workload.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <UserCheck className="h-3 w-3 mr-1" />
            {teamMetrics.activeMembers} Active
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            <Users className="h-3 w-3 mr-1" />
            {teamMetrics.totalMembers} Total
          </Badge>
        </div>
      </div>

      {/* Team Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{teamMetrics.averagePerformance.toFixed(1)}%</div>
              <Progress value={teamMetrics.averagePerformance} className="h-2" />
              <p className="text-xs text-gray-600">Average conversion rate</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Attendance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{teamMetrics.attendanceRate.toFixed(1)}%</div>
              <Progress value={teamMetrics.attendanceRate} className="h-2" />
              <p className="text-xs text-gray-600">Based on recent attendance records</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Team Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{formatCurrency(teamMetrics.teamRevenue)}</div>
              <p className="text-xs text-gray-600">{teamMetrics.teamDeals} deals closed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Collaboration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Meetings</span>
                <span className="font-bold">{teamMetrics.collaboration.meetings}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Shared Deals</span>
                <span className="font-bold">{teamMetrics.collaboration.sharedDeals}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Messages</span>
                <span className="font-bold">{teamMetrics.collaboration.internalMessages}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="workload">Workload</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Performance */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Department Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={teamMetrics.departmentBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(value) => formatCurrency(value).replace('$', '')}
                      width={60}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      width={40}
                    />
                    <Tooltip
                      formatter={(value: number, seriesName) => {
                        const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                        if (seriesName === 'Revenue') {
                          return [formatCurrency(numericValue), seriesName];
                        }
                        if (seriesName === 'Performance') {
                          return [`${numericValue.toFixed(1)}%`, seriesName];
                        }
                        return [numericValue, seriesName];
                      }}
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      fill={COLORS.primary}
                      name="Revenue"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="performance"
                      stroke={COLORS.success}
                      strokeWidth={2}
                      name="Performance"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Team Skills Radar */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  Team Skills Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamMetrics.teamSkills.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={teamMetrics.teamSkills}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="skill" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        name="Team Skills"
                        dataKey="value"
                        stroke={COLORS.purple}
                        fill={COLORS.purple}
                        fillOpacity={0.6}
                      />
                      <Tooltip
                        formatter={(value: number) => {
                          const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                          return [`${numericValue.toFixed(0)} / 100`, 'Average level'];
                        }}
                      />
                  </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500">
                    Skill insights appear once team activity data is available.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Collaboration Metrics */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-600" />
                Team Collaboration Metrics
              </CardTitle>
              <CardDescription>How well the team works together</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Video className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{teamMetrics.collaboration.meetings}</p>
                  <p className="text-sm text-gray-600">Team Meetings</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <Briefcase className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{teamMetrics.collaboration.sharedDeals}</p>
                  <p className="text-sm text-gray-600">Shared Deals</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <MessageSquare className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{teamMetrics.collaboration.internalMessages}</p>
                  <p className="text-sm text-gray-600">Messages</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <Brain className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{teamMetrics.collaboration.knowledgeSharing}</p>
                  <p className="text-sm text-gray-600">Knowledge Shares</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Detailed view of all team members</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <Card key={member.id} className="border shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="relative">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(member.status)}`} />
                            </div>
                            <div>
                              <h4 className="font-semibold">{member.name}</h4>
                              <p className="text-sm text-gray-600">{member.role}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {member.email}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {member.phone}
                                </span>
                                <Badge variant="secondary">{member.department}</Badge>
                              </div>
                              
                              {/* Skills */}
                              <div className="flex flex-wrap gap-2 mt-3">
                                {member.skills.map((skill) => (
                                  <div key={skill.name} className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-xs">
                                      {skill.name}
                                    </Badge>
                                    <Progress value={skill.level} className="w-12 h-1" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {/* Performance Metrics */}
                          <div className="text-right space-y-2">
                            <div>
                              <p className="text-2xl font-bold">{formatCurrency(member.performance.revenue)}</p>
                              <p className="text-xs text-gray-600">Revenue</p>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {member.performance.deals} deals
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {member.performance.conversionRate.toFixed(1)}% conv
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {/* Activity highlights */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium">Activity Highlights</p>
                            <Badge variant="outline" className="text-[0.6rem] uppercase tracking-wide">
                              Auto-generated
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">
                            Summaries derived from logged deals and activities.
                          </p>
                          <div className="space-y-2">
                            {member.recentActivity.map((activity, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                                {getActivityIcon(activity.type)}
                                <span>{activity.description}</span>
                                <span className="text-gray-400 ml-auto">
                                  {new Date(activity.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Activity Heatmap
              </CardTitle>
              <CardDescription>Team activity patterns throughout the week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-[auto,1fr] gap-4">
                  <div className="flex flex-col justify-around text-sm text-gray-600">
                    <span>9 AM</span>
                    <span>12 PM</span>
                    <span>3 PM</span>
                    <span>6 PM</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => (
                      <div key={day} className="space-y-2">
                        <p className="text-sm font-medium text-center">{day}</p>
                        {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((hour) => {
                          const activity = teamMetrics.activityHeatmap.find(
                            a => a.day === day && a.hour === hour
                          );
                          const intensity = activity && heatmapPeak > 0
                            ? Math.min(1, activity.value / heatmapPeak)
                            : 0;
                          return (
                            <div
                              key={hour}
                              className="h-6 rounded"
                              style={{
                                backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                              }}
                              title={`${day} ${hour}:00 - ${activity?.value || 0} activities`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>Less active</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }, (_, idx) => (idx + 1) / 5).map((fraction) => {
                      const alpha = Math.min(1, fraction);
                      const approximateCount = Math.round(alpha * heatmapPeak);
                      return (
                        <div
                          key={fraction}
                          className="w-6 h-6 rounded"
                          style={{
                            backgroundColor: `rgba(59, 130, 246, ${alpha})`,
                          }}
                          title={`≈${approximateCount} activities`}
                        />
                      );
                    })}
                  </div>
                  <span>More active</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Team Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityTimelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={activityTimelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis allowDecimals={false} tickFormatter={(value) => `${Math.max(0, value)}`} />
                    <Tooltip
                      formatter={(value: number) => {
                        const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                        return [`${numericValue} activities`, 'Recorded'];
                      }}
                    />
                    <Line type="monotone" dataKey="activities" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500">
                  Activity timeline data becomes available as soon as events are logged.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workload Tab */}
        <TabsContent value="workload" className="space-y-4">
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-purple-600" />
                Workload Distribution
              </CardTitle>
              <CardDescription>Derived from recorded activities and open opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={teamMetrics.workloadDistribution} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={140} />
                  <Tooltip
                    formatter={(value: number, seriesName) => {
                      const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                      const label = seriesName === 'Current Tasks' ? 'Tasks' : 'Capacity';
                      return [numericValue, label];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="tasks" fill={COLORS.primary} name="Current Tasks" />
                  <Bar dataKey="capacity" fill={COLORS.chart[5]} name="Total Capacity" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Utilization Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {teamMembers.map((member) => {
              const utilization = (member.workload.tasks / member.workload.capacity) * 100;
              const utilizationColor = utilization > 80 ? 'text-red-600' : 
                                     utilization > 60 ? 'text-yellow-600' : 
                                     'text-green-600';
              
              return (
                <Card key={member.id} className="border-0 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{member.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Utilization</span>
                        <span className={`text-lg font-bold ${utilizationColor}`}>
                          {utilization.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={utilization} className="h-2" />
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-gray-600">Tasks</p>
                          <p className="text-sm font-bold">{member.workload.tasks}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Opps</p>
                          <p className="text-sm font-bold">{member.workload.opportunities}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Meetings</p>
                          <p className="text-sm font-bold">{member.workload.meetings}</p>
                        </div>
                      </div>
                      {utilization > 80 && (
                        <Badge variant="destructive" className="w-full justify-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Overloaded
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <AttendanceMonitoringSystem metrics={metrics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
