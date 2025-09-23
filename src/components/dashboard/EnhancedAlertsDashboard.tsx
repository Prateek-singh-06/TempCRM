"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Filter,
  Flame,
  Info,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Settings,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  XCircle,
  Zap,
  Archive,
  Trash2,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  critical: "#EF4444",
  high: "#F59E0B",
  medium: "#3B82F6",
  low: "#10B981",
  info: "#8B5CF6",
  chart: ["#EF4444", "#F59E0B", "#3B82F6", "#10B981", "#8B5CF6"],
};

type AlertPriority = 'critical' | 'high' | 'medium' | 'low' | 'info';
type AlertCategory = 'overdue' | 'deadline' | 'performance' | 'attendance' | 'system' | 'opportunity' | 'customer';
type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'archived';

interface Alert {
  id: string;
  title: string;
  description: string;
  priority: AlertPriority;
  category: AlertCategory;
  status: AlertStatus;
  timestamp: string;
  dueDate?: string;
  assignedTo?: string;
  relatedEntity?: {
    type: string;
    id: string;
    name: string;
    url?: string;
  };
  actions?: Array<{
    label: string;
    action: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  }>;
  metadata?: Record<string, any>;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  category: AlertCategory;
  condition: string;
  priority: AlertPriority;
  enabled: boolean;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  byPriority: Record<AlertPriority, number>;
  byCategory: Record<AlertCategory, number>;
  trend: Array<{
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;
}

export default function EnhancedAlertsDashboard({ metrics }: { metrics: any }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null);
  const [selectedTab, setSelectedTab] = useState("active");
  const [filterPriority, setFilterPriority] = useState<AlertPriority | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<AlertCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlertData();
  }, [metrics]);

  const fetchAlertData = async () => {
    setLoading(true);
    try {
      // Fetch data from multiple endpoints
      const [opportunities, activities, attendance] = await Promise.all([
        fetch('/api/opportunities').then(res => res.json()),
        fetch('/api/activities').then(res => res.json()),
        fetch('/api/attendance').then(res => res.json()),
      ]);

      // Process alerts from different sources
      const processedAlerts = processAlerts(opportunities, activities, attendance, metrics);
      const processedRules = generateAlertRules();
      const stats = calculateAlertStats(processedAlerts);

      setAlerts(processedAlerts);
      setAlertRules(processedRules);
      setAlertStats(stats);
    } catch (error) {
      console.error('Error fetching alert data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAlerts = (opportunities: any, activities: any, attendance: any, metrics: any): Alert[] => {
    const alerts: Alert[] = [];
    const now = new Date();

    const overdueFollowups = Array.isArray(metrics?.overdueFollowups) ? metrics.overdueFollowups : [];
    overdueFollowups.forEach((item: any, index: number) => {
      alerts.push({
        id: `overdue-${index}`,
        title: `Overdue Follow-up: ${item.company}`,
        description: `${item.opportunity} is ${item.daysOverdue} day${item.daysOverdue === 1 ? '' : 's'} overdue.`,
        priority: item.daysOverdue > 7 ? 'critical' : item.daysOverdue > 3 ? 'high' : 'medium',
        category: 'overdue',
        status: 'active',
        timestamp: new Date(now.getTime() - item.daysOverdue * 86400000).toISOString(),
        dueDate: item.dueDate,
        relatedEntity: {
          type: 'opportunity',
          id: item.id || `opp-${index}`,
          name: item.opportunity,
          url: `/opportunities/${item.id || index}`,
        },
        actions: [
          { label: 'View Details', action: 'view', variant: 'outline' },
          { label: 'Send Reminder', action: 'remind', variant: 'default' },
        ],
        metadata: {
          daysOverdue: item.daysOverdue,
          assignedTo: item.assignedTo,
        },
      });
    });

    const opportunityList = Array.isArray(opportunities?.opportunities)
      ? opportunities.opportunities
      : Array.isArray(opportunities)
        ? opportunities
        : [];

    opportunityList.forEach((opp: any) => {
      const stage = String(opp.stage || opp.status || '').toUpperCase();
      const probability = Number(opp.probability ?? opp.winProbability ?? 0);
      const dealSize = Number(opp.dealSize ?? 0);
      const companyName = opp.companies?.name || opp.company || 'Unnamed company';
      const opportunityName = opp.name || 'Opportunity';
      const ownerName = opp.users?.name || opp.assignedTo || 'Unassigned';

      const targetDate = opp.expectedCloseDate || opp.closeDate || opp.nextFollowupDate;
      if (targetDate) {
        const closeDate = new Date(targetDate);
        const daysUntil = Math.floor((closeDate.getTime() - now.getTime()) / 86400000);
        if (daysUntil >= 0 && daysUntil <= 7) {
          alerts.push({
            id: `deadline-${opp.id}`,
            title: `Upcoming Deadline: ${companyName}`,
            description: `${opportunityName} closes in ${daysUntil} day${daysUntil === 1 ? '' : 's'}.`,
            priority: daysUntil <= 2 ? 'high' : 'medium',
            category: 'deadline',
            status: 'active',
            timestamp: now.toISOString(),
            dueDate: closeDate.toISOString(),
            assignedTo: ownerName,
            relatedEntity: {
              type: 'opportunity',
              id: opp.id,
              name: opportunityName,
              url: `/opportunities/${opp.id}`,
            },
            actions: [
              { label: 'Review Deal', action: 'review', variant: 'default' },
              { label: 'Update Status', action: 'update', variant: 'outline' },
            ],
          });
        }
      }

      if (['NEGOTIATION', 'PROPOSAL'].includes(stage) && probability > 0 && probability < 35) {
        alerts.push({
          id: `at-risk-${opp.id}`,
          title: `At-Risk Deal: ${opportunityName}`,
          description: `Win probability is ${formatPercentage(probability)}, indicating elevated risk.`,
          priority: 'high',
          category: 'opportunity',
          status: 'active',
          timestamp: now.toISOString(),
          relatedEntity: {
            type: 'opportunity',
            id: opp.id,
            name: opportunityName,
            url: `/opportunities/${opp.id}`,
          },
          actions: [
            { label: 'Add Plan', action: 'plan', variant: 'default' },
            { label: 'Review Notes', action: 'notes', variant: 'outline' },
          ],
        });
      }

      if (!['CLOSED_WON', 'CLOSED_LOST'].includes(stage) && dealSize >= 250000) {
        alerts.push({
          id: `high-value-${opp.id}`,
          title: 'High-Value Opportunity',
          description: `${opportunityName} valued at ${formatCurrency(dealSize)} needs immediate attention.`,
          priority: 'high',
          category: 'opportunity',
          status: 'active',
          timestamp: now.toISOString(),
          relatedEntity: {
            type: 'opportunity',
            id: opp.id,
            name: opportunityName,
            url: `/opportunities/${opp.id}`,
          },
          metadata: {
            probability,
            owner: ownerName,
          },
          actions: [
            { label: 'Strategy Session', action: 'strategy', variant: 'default' },
            { label: 'View Opportunity', action: 'view', variant: 'outline' },
          ],
        });
      }
    });

    const conversionRate = Number(metrics?.conversionRates?.pipelineToWon ?? metrics?.conversionRate ?? 0);
    if (conversionRate > 0 && conversionRate < 15) {
      alerts.push({
        id: 'perf-conversion',
        title: 'Conversion Rate Below Target',
        description: `Pipeline to won conversion is ${formatPercentage(conversionRate)}, below the 20% goal.`,
        priority: 'high',
        category: 'performance',
        status: 'active',
        timestamp: now.toISOString(),
        metadata: {
          currentRate: conversionRate,
          targetRate: 20,
        },
        actions: [
          { label: 'Review Funnel', action: 'analytics', variant: 'default' },
          { label: 'Plan Coaching', action: 'coaching', variant: 'outline' },
        ],
      });
    }

    const revenueGrowth = Number(metrics?.realTimeMetrics?.revenueGrowth ?? 0);
    if (revenueGrowth < 0) {
      alerts.push({
        id: 'perf-revenue',
        title: 'Revenue Decline Detected',
        description: 'Revenue growth has turned negative compared to the previous period.',
        priority: 'critical',
        category: 'performance',
        status: 'active',
        timestamp: now.toISOString(),
        actions: [
          { label: 'Open Forecast', action: 'forecast', variant: 'default' },
          { label: 'Schedule Review', action: 'review', variant: 'outline' },
        ],
      });
    }

    const churnRate = Number(metrics?.realTimeMetrics?.churnRate ?? 0);
    if (churnRate > 0.1) {
      alerts.push({
        id: 'cust-churn',
        title: 'Customer Churn Risk',
        description: `Churn rate is ${formatPercentage(churnRate * 100)}, exceeding the safe threshold.`,
        priority: 'high',
        category: 'customer',
        status: 'active',
        timestamp: now.toISOString(),
        actions: [
          { label: 'View Accounts', action: 'accounts', variant: 'default' },
          { label: 'Plan Campaign', action: 'campaign', variant: 'outline' },
        ],
      });
    }

    const missingMembers = Array.isArray(metrics?.attendance?.missing) ? metrics.attendance.missing : [];
    const fallbackMissing = Array.isArray(attendance?.missing) ? attendance.missing : [];
    const missingList = missingMembers.length > 0 ? missingMembers : fallbackMissing;
    if (missingList.length > 0) {
      alerts.push({
        id: 'attendance-missing',
        title: 'Team Members Absent',
        description: `${missingList.length} team member${missingList.length === 1 ? '' : 's'} have not checked in today.`,
        priority: 'medium',
        category: 'attendance',
        status: 'active',
        timestamp: now.toISOString(),
        metadata: {
          missingMembers: missingList,
        },
        actions: [
          { label: 'View Details', action: 'view', variant: 'outline' },
          { label: 'Send Reminder', action: 'remind', variant: 'default' },
        ],
      });
    }

    const activityList = Array.isArray(activities?.activities)
      ? activities.activities
      : Array.isArray(activities)
        ? activities
        : [];
    if (activityList.length > 0) {
      const latestActivityTimestamp = activityList.reduce((latest: Date, activity: any) => {
        const reference = activity.timestamp || activity.occurredAt || activity.createdAt;
        if (!reference) return latest;
        const parsed = new Date(reference);
        return parsed > latest ? parsed : latest;
      }, new Date(0));

      if (latestActivityTimestamp.getTime() > 0 && (now.getTime() - latestActivityTimestamp.getTime()) > 48 * 60 * 60 * 1000) {
        alerts.push({
          id: 'activity-gap',
          title: 'No Recent Team Activity',
          description: 'No team activity has been logged in the last 48 hours.',
          priority: 'medium',
          category: 'performance',
          status: 'active',
          timestamp: now.toISOString(),
          actions: [
            { label: 'Plan Outreach', action: 'outreach', variant: 'default' },
            { label: 'Assign Tasks', action: 'tasks', variant: 'outline' },
          ],
        });
      }
    } else {
      alerts.push({
        id: 'activity-none',
        title: 'Activity Log Empty',
        description: 'No recent activities were found for your team.',
        priority: 'info',
        category: 'performance',
        status: 'active',
        timestamp: now.toISOString(),
        actions: [
          { label: 'Log Activity', action: 'log', variant: 'default' },
        ],
      });
    }

    const aiAlerts = Array.isArray(metrics?.aiInsights?.alerts) ? metrics.aiInsights.alerts : [];
    aiAlerts.forEach((message: string, index: number) => {
      const sanitizedMessage = typeof message === 'string' && message.trim().length > 0
        ? message.trim().replace(/\.$/, '')
        : 'AI insight available';
      alerts.push({
        id: `ai-alert-${index}`,
        title: 'AI Insight',
        description: `${sanitizedMessage}.`,
        priority: 'info',
        category: 'system',
        status: 'active',
        timestamp: now.toISOString(),
      });
    });

    const priorityOrder: Record<AlertPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      info: 4,
    };

    return alerts.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  };

  const generateAlertRules = (): AlertRule[] => {
    return [
      {
        id: 'rule-1',
        name: 'Overdue Tasks',
        description: 'Alert when tasks are overdue by more than three days.',
        category: 'overdue',
        condition: 'daysOverdue > 3',
        priority: 'high',
        enabled: true,
        notifications: { email: true, push: true, sms: false },
      },
      {
        id: 'rule-2',
        name: 'Low Conversion Rate',
        description: 'Alert when conversion rate drops below 10%.',
        category: 'performance',
        condition: 'conversionRate < 10',
        priority: 'high',
        enabled: true,
        notifications: { email: true, push: false, sms: false },
      },
      {
        id: 'rule-3',
        name: 'Upcoming Deadlines',
        description: 'Alert for deals closing within seven days.',
        category: 'deadline',
        condition: 'daysUntilClose <= 7',
        priority: 'medium',
        enabled: true,
        notifications: { email: false, push: true, sms: false },
      },
      {
        id: 'rule-4',
        name: 'Team Attendance',
        description: 'Alert when team members are absent.',
        category: 'attendance',
        condition: 'absenceCount > 0',
        priority: 'low',
        enabled: true,
        notifications: { email: false, push: true, sms: false },
      },
      {
        id: 'rule-5',
        name: 'High-Value Opportunity',
        description: 'Alert for opportunities above $100,000.',
        category: 'opportunity',
        condition: 'dealValue > 100000',
        priority: 'high',
        enabled: false,
        notifications: { email: true, push: true, sms: true },
      },
    ];
  };

  const calculateAlertStats = (alerts: Alert[]): AlertStats => {
    const stats: AlertStats = {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'active').length,
      acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
      resolved: alerts.filter(a => a.status === 'resolved').length,
      byPriority: {
        critical: alerts.filter(a => a.priority === 'critical').length,
        high: alerts.filter(a => a.priority === 'high').length,
        medium: alerts.filter(a => a.priority === 'medium').length,
        low: alerts.filter(a => a.priority === 'low').length,
        info: alerts.filter(a => a.priority === 'info').length,
      },
      byCategory: {
        overdue: alerts.filter(a => a.category === 'overdue').length,
        deadline: alerts.filter(a => a.category === 'deadline').length,
        performance: alerts.filter(a => a.category === 'performance').length,
        attendance: alerts.filter(a => a.category === 'attendance').length,
        system: alerts.filter(a => a.category === 'system').length,
        opportunity: alerts.filter(a => a.category === 'opportunity').length,
        customer: alerts.filter(a => a.category === 'customer').length,
      },
      trend: generateTrendData(alerts),
    };
    return stats;
  };

  const generateTrendData = (alerts: Alert[]): AlertStats['trend'] => {
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayMap: Record<number, string> = {
      0: 'Sun',
      1: 'Mon',
      2: 'Tue',
      3: 'Wed',
      4: 'Thu',
      5: 'Fri',
      6: 'Sat',
    };

    const base = dayOrder.map(day => ({
      date: day,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }));

    const indexByDay = new Map(dayOrder.map((day, index) => [day, index]));
    const today = new Date();
    const defaultDayLabel = dayOrder[(today.getDay() + 6) % 7];

    alerts.forEach(alert => {
      const timestamp = alert.timestamp ? new Date(alert.timestamp) : null;
      const mappedDay = timestamp ? dayMap[timestamp.getDay()] : undefined;
      const dayLabel = mappedDay || defaultDayLabel;
      const entryIndex = indexByDay.get(dayLabel);
      if (entryIndex === undefined) {
        return;
      }
      const entry = base[entryIndex];
      const priorityKey = alert.priority === 'info' ? 'low' : alert.priority;
      entry[priorityKey as 'critical' | 'high' | 'medium' | 'low'] += 1;
    });

    return base;
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

  const getPriorityIcon = (priority: AlertPriority) => {
    switch (priority) {
      case 'critical': return <Flame className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <AlertCircle className="h-4 w-4" />;
      case 'low': return <Info className="h-4 w-4" />;
      case 'info': return <Info className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: AlertPriority) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-green-600 bg-green-100';
      case 'info': return 'text-purple-600 bg-purple-100';
    }
  };

  const getCategoryIcon = (category: AlertCategory) => {
    switch (category) {
      case 'overdue': return <Clock className="h-4 w-4" />;
      case 'deadline': return <Calendar className="h-4 w-4" />;
      case 'performance': return <TrendingDown className="h-4 w-4" />;
      case 'attendance': return <Users className="h-4 w-4" />;
      case 'system': return <Settings className="h-4 w-4" />;
      case 'opportunity': return <DollarSign className="h-4 w-4" />;
      case 'customer': return <User className="h-4 w-4" />;
    }
  };

  const handleAlertAction = (alertId: string, action: string) => {
    console.log(`Handling action ${action} for alert ${alertId}`);
    // Implement actual action handlers
    if (action === 'acknowledge') {
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, status: 'acknowledged' as AlertStatus } : a
      ));
    } else if (action === 'resolve') {
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, status: 'resolved' as AlertStatus } : a
      ));
    } else if (action === 'archive') {
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, status: 'archived' as AlertStatus } : a
      ));
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterPriority !== 'all' && alert.priority !== filterPriority) return false;
    if (filterCategory !== 'all' && alert.category !== filterCategory) return false;
    if (searchQuery && !alert.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !alert.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    if (selectedTab === 'active') return alert.status === 'active';
    if (selectedTab === 'acknowledged') return alert.status === 'acknowledged';
    if (selectedTab === 'resolved') return alert.status === 'resolved';
    if (selectedTab === 'all') return true;
    
    return true;
  });

  const timeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading || !alertStats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Bell className="h-8 w-8 animate-pulse text-blue-500" />
          <p className="text-sm text-gray-600">Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Alert Center</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage and respond to critical notifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAlertData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </div>
      </div>

      {/* Alert Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertStats.total}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {alertStats.active} active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flame className="h-4 w-4 text-red-600" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{alertStats.byPriority.critical}</div>
            <p className="text-xs text-gray-600 mt-1">Immediate action required</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{alertStats.byPriority.high}</div>
            <p className="text-xs text-gray-600 mt-1">Attention needed</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{alertStats.acknowledged}</div>
            <p className="text-xs text-gray-600 mt-1">Being handled</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{alertStats.resolved}</div>
            <p className="text-xs text-gray-600 mt-1">Completed today</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Trends and Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Alert Trends
            </CardTitle>
            <CardDescription>Weekly alert volume by priority.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={alertStats.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="critical" stackId="1" stroke={COLORS.critical} fill={COLORS.critical} />
                <Area type="monotone" dataKey="high" stackId="1" stroke={COLORS.high} fill={COLORS.high} />
                <Area type="monotone" dataKey="medium" stackId="1" stroke={COLORS.medium} fill={COLORS.medium} />
                <Area type="monotone" dataKey="low" stackId="1" stroke={COLORS.low} fill={COLORS.low} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-purple-600" />
              Alert Categories
            </CardTitle>
            <CardDescription>Distribution by category.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={Object.entries(alertStats.byCategory).map(([key, value]) => ({ name: key, value }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {Object.entries(alertStats.byCategory).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List with Filters */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Active Alerts</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-48"
                />
              </div>
              <Select value={filterPriority} onValueChange={(value: any) => setFilterPriority(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={(value: any) => setFilterCategory(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="opportunity">Opportunity</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="active">Active ({alertStats.active})</TabsTrigger>
              <TabsTrigger value="acknowledged">Acknowledged ({alertStats.acknowledged})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({alertStats.resolved})</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {filteredAlerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No alerts found matching your criteria</p>
                  </div>
                ) : (
                  filteredAlerts.map((alert) => (
                    <Card key={alert.id} className={`border shadow-sm hover:shadow-md transition-all ${
                      alert.status === 'resolved' ? 'opacity-60' : ''
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2 rounded-lg ${getPriorityColor(alert.priority)}`}>
                              {getPriorityIcon(alert.priority)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold text-gray-900 dark:text-white">{alert.title}</h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{alert.description}</p>
                                </div>
                                <Badge variant="outline" className="ml-2">
                                  {getCategoryIcon(alert.category)}
                                  <span className="ml-1">{alert.category}</span>
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {timeAgo(alert.timestamp)}
                                </span>
                                {alert.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Due: {new Date(alert.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                                {alert.assignedTo && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    Assigned
                                  </span>
                                )}
                                {alert.relatedEntity && (
                                  <a 
                                    href={alert.relatedEntity.url || '#'} 
                                    className="flex items-center gap-1 text-blue-600 hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {alert.relatedEntity.name}
                                  </a>
                                )}
                              </div>

                              {alert.actions && alert.actions.length > 0 && (
                                <div className="flex items-center gap-2 mt-3">
                                  {alert.actions.map((action, idx) => (
                                    <Button
                                      key={idx}
                                      variant={action.variant || 'outline'}
                                      size="sm"
                                      onClick={() => handleAlertAction(alert.id, action.action)}
                                    >
                                      {action.label}
                                    </Button>
                                  ))}
                                  {alert.status === 'active' && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Acknowledge
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAlertAction(alert.id, 'resolve')}
                                      >
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Resolve
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>

      {/* Alert Rules Configuration */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Alert Rules
          </CardTitle>
          <CardDescription>Configure automatic alert generation rules.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alertRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-4">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(checked) => {
                      setAlertRules(prev => prev.map(r => 
                        r.id === rule.id ? { ...r, enabled: checked } : r
                      ));
                    }}
                  />
                  <div>
                    <h4 className="font-medium">{rule.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {getCategoryIcon(rule.category)}
                        <span className="ml-1">{rule.category}</span>
                      </Badge>
                      <Badge className={`text-xs ${getPriorityColor(rule.priority)}`}>
                        {rule.priority}
                      </Badge>
                      <div className="flex items-center gap-2 text-xs">
                        {rule.notifications.email && <Mail className="h-3 w-3" />}
                        {rule.notifications.push && <Bell className="h-3 w-3" />}
                        {rule.notifications.sms && <MessageSquare className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
