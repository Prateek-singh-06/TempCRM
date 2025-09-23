"use client";

import { useState, useEffect } from "react";
import NotificationBell from "@/components/NotificationBell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp,
  Users,
  AlertCircle,
  Calendar,
  Target,
  Clock,
  Building2,
  UserCheck,
  UserX,
  Loader2,
  Activity,
  BarChart3,
  Zap,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Bell,
  Settings,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Brain
} from "lucide-react";
import Link from "next/link";
import { useNotifications } from "@/lib/hooks/useNotifications";
import GraphicalView from "@/components/dashboard/GraphicalView";
import EnhancedGraphicalView from "@/components/dashboard/EnhancedGraphicalView";
import EnhancedPerformanceDashboard from "@/components/dashboard/EnhancedPerformanceDashboard";
import EnhancedAlertsDashboard from "@/components/dashboard/EnhancedAlertsDashboard";
import EnhancedTeamDashboard from "@/components/dashboard/EnhancedTeamDashboard";
import PerformanceMetrics from "@/components/dashboard/PerformanceMetrics";

type RecentActivityItem = {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string; // ISO
  icon?: string;
  color?: string;
  url?: string;
};

// Dashboard metrics interface
interface DashboardMetrics {
  conversionRate?: number;
  conversionRates: {
    leadToOpportunity: number;
    opportunityToPipeline: number;
  };
  leadSources: Array<{ source: string; count: number; percentage: number }>;
  pipeline: Array<{ stage: string; count: number; color: string }>;
  totals: {
    leads: number;
    opportunities: number;
    companies: number;
    overdueFollowUps: number;
  };
  insights: {
    topPerformingSource: { source: string; count: number; percentage: number } | null;
    conversionTrend: string;
    pipelineHealth: number;
  };
  monthlyTarget: {
    target: number;
    achieved: number;
  };
  attendance: {
    total: number;
    submitted: number;
    missing: Array<{ name: string; id: string }>;
    present: Array<{ name: string; id: string; time?: string }>;
  };
  overdueFollowups: Array<{
    company: string;
    opportunity: string;
    dueDate: string;
    daysOverdue: number;
  }>;
}

type OverdueFollowUpItem = {
  id: string;
  actionDescription: string;
  followUpDate?: string;
  linkedType?: 'LEAD' | 'OPPORTUNITY' | 'PIPELINE' | 'NONE';
  linkedName?: string;
  linkedOpportunityId?: string;
  linkedLeadId?: string;
  linkedPipelineId?: string;
  daysOverdue: number;
  assignedTo: string;
  notes?: string;
  overdueReason?: string;
};

const formatPercentage = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  const normalized = Math.round(value * 10) / 10;
  return Number.isInteger(normalized) ? normalized.toFixed(0) : normalized.toFixed(1);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US').format(value);
};

export default function DashboardPage() {
  const [animateCharts, setAnimateCharts] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState<'statistical' | 'graphical'>('statistical');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState('all');
  const [exportFormat, setExportFormat] = useState('excel');
  const [isExporting, setIsExporting] = useState(false);
  const { sendNotification } = useNotifications();
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const [overdueQueue, setOverdueQueue] = useState<OverdueFollowUpItem[]>([]);
  const [activeOverdue, setActiveOverdue] = useState<OverdueFollowUpItem | null>(null);
  const [overdueDialogOpen, setOverdueDialogOpen] = useState(false);
  const [overdueReason, setOverdueReason] = useState('');
  const [overdueSubmitting, setOverdueSubmitting] = useState(false);
  const [overdueError, setOverdueError] = useState<string | null>(null);
  const pendingOverdueCount = overdueQueue.length;

  const leadToOpportunityRate = metrics?.conversionRates?.leadToOpportunity ?? metrics?.conversionRate ?? 0;
  const opportunityToPipelineRate = metrics?.conversionRates?.opportunityToPipeline ?? 0;
  const funnelDropOff = Math.max(leadToOpportunityRate - opportunityToPipelineRate, 0);

  useEffect(() => {
    // Trigger animations after component mounts
    setTimeout(() => setAnimateCharts(true), 100);
    
    // Fetch real data
    fetchDashboardData();
    fetchOverdueFollowups();

    // Set up real-time data refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000); // 30 seconds

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch analytics and recent activity in parallel
      const [analyticsRes, activityRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/recent-activity')
      ]);
      const [analyticsData, activityData] = await Promise.all([
        analyticsRes.json(),
        activityRes.json()
      ]);

      if (analyticsRes.ok) {
        setMetrics(analyticsData);
      } else {
        setError(analyticsData.error || 'Failed to fetch dashboard data');
      }

      if (activityRes.ok) {
        setRecentActivities(Array.isArray(activityData.activities) ? activityData.activities : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOverdueFollowups = async () => {
    try {
      const response = await fetch('/api/daily-followups?showOverdue=true&requireAcknowledgement=true');
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      const items: OverdueFollowUpItem[] = Array.isArray(data?.dailyFollowUps)
        ? data.dailyFollowUps
            .filter((item: any) => {
              if (!item?.isOverdue) return false;
              if (item?.linkedType && item.linkedType !== 'NONE') return true;
              return Boolean(item?.salesDealId);
            })
            .map((item: any) => ({
              id: item.id?.toString?.() ?? String(item.id),
              actionDescription: item.actionDescription,
              followUpDate: item.followUpDate,
              linkedType: item.linkedType,
              linkedName: item.linkedName,
              linkedOpportunityId: item.linkedOpportunityId,
              linkedLeadId: item.linkedLeadId,
              linkedPipelineId: item.linkedPipelineId,
              daysOverdue: Math.max(1, item.daysOverdue ?? Math.abs(item.daysUntilFollowUp ?? 1)),
              assignedTo: item.assignedTo,
              notes: item.notes,
              overdueReason: item.overdueReason,
            }))
        : [];

      if (items.length > 0) {
        setOverdueQueue(items);
        setActiveOverdue(items[0]);
        setOverdueDialogOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch overdue follow-ups', err);
    }
  };

  useEffect(() => {
    if (activeOverdue) {
      setOverdueReason(activeOverdue.overdueReason || '');
      setOverdueError(null);
    } else {
      setOverdueReason('');
    }
  }, [activeOverdue?.id]);

  const handleOverdueDialogChange = (open: boolean) => {
    if (!open && overdueQueue.length > 0) {
      return;
    }
    setOverdueDialogOpen(open);
  };

  const handleSubmitOverdueReason = async () => {
    if (!activeOverdue) return;
    console.log('Saving overdue reason:', overdueReason);

    const trimmed = overdueReason.trim();
    if (!trimmed) {
      setOverdueError('Please add a quick note on why this follow-up slipped.');
      return;
    }

    try {
      setOverdueSubmitting(true);
      setOverdueError(null);
      const response = await fetch(`/api/daily-followups?id=${activeOverdue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overdueReason: trimmed })
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.error || 'Failed to save overdue reason');
      }

      const remaining = overdueQueue.filter(item => item.id !== activeOverdue.id);
      setOverdueQueue(remaining);

      if (remaining.length > 0) {
        setActiveOverdue(remaining[0]);
      } else {
        setActiveOverdue(null);
        setOverdueDialogOpen(false);
      }
      setOverdueReason('');
    } catch (err) {
      console.error('Unable to submit overdue reason', err);
      setOverdueError(err instanceof Error ? err.message : 'Unable to submit overdue reason');
    } finally {
      setOverdueSubmitting(false);
    }
  };

  // Attendance-aware Test Notify
  const handleTestNotify = async () => {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const isoDate = `${yyyy}-${mm}-${dd}`;

      const res = await fetch(`/api/attendance?date=${isoDate}`);
      const data = await res.json();
      const hasAttendance = Array.isArray(data.attendance) && data.attendance.length > 0;

      if (!hasAttendance) {
        await sendNotification({
          title: 'Attendance Reminder',
          message: "You haven't submitted today's attendance. Please mark it now.",
          type: 'warning',
          url: '/attendance',
          sendPush: true
        });
      } else {
        await sendNotification({
          title: 'Attendance Check',
          message: 'Attendance already submitted for today. Great job!',
          type: 'success',
          url: '/attendance',
          sendPush: false
        });
      }
    } catch (e) {
      console.error('Test Notify failed', e);
    }
  };

  // Simple relative time formatter
  const timeAgo = (iso: string) => {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = Math.max(0, now - then);
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
    const d = Math.floor(h / 24);
    return `${d} day${d === 1 ? '' : 's'} ago`;
  };

  const dotColorForType = (type?: string) => {
    switch (type) {
      case 'lead_update':
      case 'lead_created':
        return 'bg-green-500';
      case 'opportunity_created':
      case 'opportunity_update':
        return 'bg-blue-500';
      case 'attendance_submitted':
        return 'bg-purple-500';
      default:
        return 'bg-indigo-500';
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const exportUrl = `/api/export?type=${exportType}&format=${exportFormat}`;

      // Create a temporary link element to trigger download
      const link = document.createElement('a');
      link.href = exportUrl;
      link.style.display = 'none';

      // Set filename based on format
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = exportFormat === 'pdf' ? 'pdf' : 'xlsx';
      link.download = `crm-${exportType}-report-${timestamp}.${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Send success notification
      sendNotification({
        title: "Export Completed",
        message: `Your ${exportFormat.toUpperCase()} report has been downloaded successfully.`,
        type: "success"
      });

      setExportDialogOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      sendNotification({
        title: "Export Failed",
        message: "Failed to export data. Please try again.",
        type: "error"
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="container mx-auto p-6">
            {/* Loading Header */}
            <div className="flex justify-between items-center mb-8">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-64 mb-2"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-96"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-32"></div>
              </div>
            </div>

            {/* Loading Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 bg-white dark:bg-gray-800 rounded-lg shadow"></div>
                </div>
              ))}
            </div>

            {/* Loading Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="animate-pulse">
                <div className="h-80 bg-white dark:bg-gray-800 rounded-lg shadow"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-80 bg-white dark:bg-gray-800 rounded-lg shadow"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Button onClick={fetchDashboardData}>Try Again</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Dialog
        open={overdueDialogOpen && Boolean(activeOverdue)}
        onOpenChange={handleOverdueDialogChange}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Overdue follow-up needs your update</DialogTitle>
            <DialogDescription>
              Add a short note so the team knows why this lead or deal slipped.
            </DialogDescription>
          </DialogHeader>
          {activeOverdue && (
            <div className="space-y-5">
              <div className="rounded-xl border border-red-100 bg-red-50/80 p-4 shadow-inner">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-600">
                      <Badge variant="outline" className="border-red-400/60 bg-red-100/60 text-red-700">
                        {activeOverdue.linkedType === 'PIPELINE'
                          ? 'Pipeline'
                          : activeOverdue.linkedType || 'Follow-up'}
                      </Badge>
                      {pendingOverdueCount > 1 && (
                        <span>{pendingOverdueCount} in queue</span>
                      )}
                    </div>
                    <p className="mt-2 text-base font-semibold text-red-900">
                      {activeOverdue.linkedName || activeOverdue.actionDescription}
                    </p>
                    <p className="text-sm text-red-700/90">
                      {activeOverdue.actionDescription}
                    </p>
                  </div>
                  <Badge variant="destructive" className="bg-red-600 text-white">
                    {activeOverdue.daysOverdue}d overdue
                  </Badge>
                </div>
                <div className="mt-3 space-y-1 text-xs text-red-700/80">
                  {activeOverdue.followUpDate && (
                    <p>
                      Scheduled for{' '}
                      {new Date(activeOverdue.followUpDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                  <p>Owner: {activeOverdue.assignedTo}</p>
                  {activeOverdue.notes && (
                    <p className="italic">Notes: {activeOverdue.notes}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Why did this follow-up get delayed?
                </p>
                <Textarea
                  value={overdueReason}
                  onChange={(event) => setOverdueReason(event.target.value)}
                  placeholder="Example: Client asked to reschedule / waiting for paperwork / out of office"
                  className="min-h-[120px] resize-none"
                />
                {overdueError && (
                  <p className="text-xs text-red-600">{overdueError}</p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {pendingOverdueCount > 1
                    ? `${pendingOverdueCount} overdue follow-ups need attention`
                    : 'Last overdue follow-up in your queue'}
                </span>
                <Button
                  onClick={handleSubmitOverdueReason}
                  disabled={overdueSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {overdueSubmitting ? 'Saving...' : 'Submit reason'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto p-6 space-y-6">
          {/* Enhanced Header - Accessible */}
          <header
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 mb-8 shadow-2xl"
            role="banner"
            aria-labelledby="dashboard-title"
          >
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm" aria-hidden="true">
                      <Zap className="h-8 w-8 text-white" />
                    </div>
          <div>
            <h1 id="dashboard-title" className="text-4xl font-bold text-white">CRM Operations Hub</h1>
            <Badge className="bg-orange-500/20 text-white border-white/30 mt-1" aria-label="Live operations indicator">
              <Activity className="h-3 w-3 mr-1" aria-hidden="true" />
              Live Operations
            </Badge>
          </div>
                  </div>
                  <p className="text-emerald-100 text-lg max-w-2xl" aria-describedby="dashboard-title">
                    Real-time operational dashboard for immediate actions, team coordination, and quick business decisions
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <NotificationBell />
                  <time className="text-right text-white" aria-label="Current date">
                    <p className="text-sm text-blue-100">Today</p>
                    <p className="text-lg font-semibold">
                      {new Date().toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </time>
                </div>
              </div>

              {/* Quick Actions - Accessible */}
              <nav className="flex flex-wrap gap-3 mt-6" aria-label="Quick actions">
                <Button
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                  onClick={fetchDashboardData}
                  aria-label="Refresh dashboard data"
                >
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Refresh Data
                </Button>

                {/* View mode toggles */}
                <div className="ml-0 md:ml-2 inline-flex rounded-xl overflow-hidden border border-white/20 backdrop-blur-sm">
                  <Button
                    variant={viewMode === 'statistical' ? 'default' : 'outline'}
                    onClick={() => setViewMode('statistical')}
                    className={`${viewMode === 'statistical' ? 'bg-white/20 text-white' : 'bg-white/10 text-white'} hover:bg-white/20 rounded-none`}
                    aria-label="Switch to statistical view"
                  >
                    Statistical View
                  </Button>
                  <Button
                    variant={viewMode === 'graphical' ? 'default' : 'outline'}
                    onClick={() => setViewMode('graphical')}
                    className={`${viewMode === 'graphical' ? 'bg-white/20 text-white' : 'bg-white/10 text-white'} hover:bg-white/20 rounded-none`}
                    aria-label="Switch to graphical view"
                  >
                    Graphical View
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                  asChild
                  aria-label="Navigate to advanced analytics page"
                >
                  <Link href="/analytics">
                    <BarChart3 className="h-4 w-4 mr-2" aria-hidden="true" />
                    Advanced Analytics
                  </Link>
                </Button>
                <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105"
                      aria-label="Export dashboard data"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 border-0 shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                          <Download className="h-6 w-6 text-white" />
                        </div>
                        Export Dashboard Data
                      </DialogTitle>
                      <DialogDescription className="text-base">
                        Choose your preferred export format and data type. AI-powered PDF reports include intelligent insights and beautiful visualizations.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                      {/* Export Type Selection */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Data Type
                        </label>
                        <Select value={exportType} onValueChange={setExportType}>
                          <SelectTrigger className="bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                All Data
                              </div>
                            </SelectItem>
                            <SelectItem value="leads">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Leads Only
                              </div>
                            </SelectItem>
                            <SelectItem value="opportunities">
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Opportunities Only
                              </div>
                            </SelectItem>
                            <SelectItem value="analytics">
                              <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" />
                                Analytics Report
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Export Format Selection */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Export Format
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setExportFormat('excel')}
                            className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                              exportFormat === 'excel'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-lg'
                                : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-2">
                              <FileSpreadsheet className="h-8 w-8 text-green-600" />
                              <span className="font-semibold text-sm">Excel Report</span>
                              <span className="text-xs text-slate-500 text-center">
                                Structured data with highlighting
                              </span>
                            </div>
                          </button>

                          <button
                            onClick={() => setExportFormat('pdf')}
                            className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                              exportFormat === 'pdf'
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20 shadow-lg'
                                : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-purple-300'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-2">
                              <div className="relative">
                                <FileText className="h-8 w-8 text-red-600" />
                                <Brain className="h-4 w-4 text-purple-600 absolute -top-1 -right-1 bg-white rounded-full p-0.5" />
                              </div>
                              <span className="font-semibold text-sm">AI PDF Report</span>
                              <span className="text-xs text-slate-500 text-center">
                                Charts & AI insights
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Format Description */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex-shrink-0">
                            <Sparkles className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">
                              {exportFormat === 'pdf' ? 'AI-Powered PDF Report' : 'Enhanced Excel Report'}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {exportFormat === 'pdf'
                                ? 'Includes AI-generated insights, beautiful charts, and intelligent summarization powered by machine learning algorithms.'
                                : 'Professional formatting with proper headings, numbering, and intelligent data highlighting for easy analysis.'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <Button
                        variant="outline"
                        onClick={() => setExportDialogOpen(false)}
                        className="flex-1"
                        disabled={isExporting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleExport}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                        disabled={isExporting}
                      >
                        {isExporting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Export {exportFormat.toUpperCase()}
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </nav>
            </div>
          </header>

          {/* Main Dashboard Content */}
          {viewMode === 'graphical' ? (
            <div className="space-y-8">
              <GraphicalView metrics={metrics} />
              {/* Enhanced Comprehensive Graphical View */}
              <div className="mt-12">
                <EnhancedGraphicalView metrics={metrics} />
              </div>
            </div>
          ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid w-full grid-cols-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/20 dark:border-gray-700/20 shadow-lg">
              <TabsTrigger value="overview" className="flex items-center gap-2 font-medium transition-all duration-200 data-[state=active]:bg-white/20 data-[state=active]:shadow-md">
                <Activity className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2 font-medium transition-all duration-200 data-[state=active]:bg-white/20 data-[state=active]:shadow-md">
                <TrendingUp className="h-4 w-4" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-2 font-medium transition-all duration-200 data-[state=active]:bg-white/20 data-[state=active]:shadow-md">
                <Users className="h-4 w-4" />
                Team
              </TabsTrigger>
              <TabsTrigger value="alerts" className="flex items-center gap-2 font-medium transition-all duration-200 data-[state=active]:bg-white/20 data-[state=active]:shadow-md">
                <AlertCircle className="h-4 w-4" />
                Alerts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              {/* Key Insights Banner - Data Storytelling */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white shadow-2xl">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold">Key Insights Today</h3>
                  </div>
                  <p className="text-indigo-100 text-sm max-w-2xl">
                    Your conversion rate is trending upward with {metrics?.attendance?.submitted || 0} active team members.
                    Focus on the {metrics?.overdueFollowups?.length || 0} overdue tasks to maintain momentum.
                  </p>
                </div>
              </div>

              {/* Enhanced Metrics Cards - Inverted Pyramid Structure */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800 hover:shadow-2xl hover:scale-105 transition-all duration-500 group cursor-pointer">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500"></div>
                  <div className="absolute top-4 right-4 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-bold text-green-700 dark:text-green-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors duration-300">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        Conversion Rate
                      </div>
                      <Badge className="bg-green-100 text-green-700 text-xs px-2 py-1 font-medium">Live</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Primary Conversion Rate */}
                    <div className="space-y-1">
                      <div className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
                        Lead → Opportunity
                      </div>
                      <div className="text-3xl font-bold text-green-800 dark:text-green-200">
                        {formatPercentage(leadToOpportunityRate)}%
                      </div>
                      <Progress value={leadToOpportunityRate} className="h-2" />
                    </div>
                    
                    {/* Secondary Conversion Rate */}
                    <div className="rounded-lg border border-green-200/50 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/20 p-3">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
                          Opportunity → Pipeline
                        </div>
                        <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                          {formatPercentage(opportunityToPipelineRate)}%
                        </div>
                        <Progress value={opportunityToPipelineRate} className="h-2" />
                      </div>
                    </div>
                    
                    {/* Metrics Summary */}
                    <div className="pt-2 border-t border-green-200/30 dark:border-green-700/30 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-green-700 dark:text-green-300 font-medium">
                          Funnel drop-off:
                        </span>
                        <span className="text-green-800 dark:text-green-200 font-bold">
                          {formatPercentage(funnelDropOff)} pts
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">
                          Live data sync
                        </span>
                        <span className="text-gray-500 dark:text-gray-500 text-[10px]">
                          Updated from CRM
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 hover:shadow-2xl hover:scale-105 transition-all duration-500 group cursor-pointer">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500"></div>
                  <div className="absolute top-4 right-4 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-bold text-blue-700 dark:text-blue-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors duration-300">
                          <Target className="h-4 w-4" />
                        </div>
                        Monthly Target
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 text-xs px-2 py-1 font-medium">Active</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                        {formatNumber(metrics?.monthlyTarget?.achieved || 0)}
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        of {formatNumber(metrics?.monthlyTarget?.target || 0)} target
                      </div>
                    </div>
                    <Progress
                      value={metrics?.monthlyTarget?.target ? (metrics.monthlyTarget.achieved / metrics.monthlyTarget.target) * 100 : 0}
                      className="h-3"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                        <ArrowUp className="h-3 w-3" />
                        On track this month
                      </div>
                      <span className="text-gray-500 dark:text-gray-400">
                        {Math.round(((metrics?.monthlyTarget?.achieved || 0) / (metrics?.monthlyTarget?.target || 1)) * 100)}% complete
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 hover:shadow-2xl hover:scale-105 transition-all duration-500 group cursor-pointer">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500"></div>
                  <div className="absolute top-4 right-4 w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-bold text-purple-700 dark:text-purple-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors duration-300">
                          <Calendar className="h-4 w-4" />
                        </div>
                        Team Attendance
                      </div>
                      <Badge className="bg-purple-100 text-purple-700 text-xs px-2 py-1 font-medium">Today</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                        {metrics?.attendance?.submitted || 0} / {metrics?.attendance?.total || 0}
                      </div>
                      <div className="text-sm text-purple-600 dark:text-purple-400">
                        team members present
                      </div>
                    </div>
                    <Progress 
                      value={((metrics?.attendance?.submitted || 0) / (metrics?.attendance?.total || 1)) * 100}
                      className="h-3"
                    />
                    <div className="flex justify-between text-xs">
                      <div className="flex gap-3">
                        <span className="flex items-center text-green-600 dark:text-green-400 font-medium">
                          <UserCheck className="h-3 w-3 mr-1" />
                          {metrics?.attendance?.submitted || 0} Present
                        </span>
                        <span className="flex items-center text-red-600 dark:text-red-400 font-medium">
                          <UserX className="h-3 w-3 mr-1" />
                          {metrics?.attendance?.missing?.length || 0} Missing
                        </span>
                      </div>
                      <span className="text-purple-600 dark:text-purple-400 font-bold">
                        {Math.round(((metrics?.attendance?.submitted || 0) / (metrics?.attendance?.total || 1)) * 100)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800 hover:shadow-2xl hover:scale-105 transition-all duration-500 group cursor-pointer">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500"></div>
                  <div className="absolute top-4 right-4 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-bold text-orange-700 dark:text-orange-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors duration-300">
                          <Clock className="h-4 w-4" />
                        </div>
                        Overdue Tasks
                      </div>
                      <Badge variant="destructive" className="text-xs px-2 py-1 font-medium">Urgent</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                        {metrics?.overdueFollowups?.length || 0} Tasks
                      </div>
                      <div className="text-sm text-orange-600 dark:text-orange-400">
                        require immediate attention
                      </div>
                    </div>
                    <div className="pt-2">
                      <Button variant="outline" size="sm" className="w-full text-orange-600 border-orange-600 hover:bg-orange-50 transition-colors duration-200" asChild>
                        <Link href="/opportunities">
                          View Details
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions Section - Asymmetrical Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                {/* Main Action Card - Larger */}
                <Card className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-purple-500/10 rounded-full -mr-16 -mt-16"></div>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                      <div className="p-3 bg-blue-500/10 rounded-xl">
                        <Zap className="h-6 w-6 text-blue-600" />
                      </div>
                      Quick Actions
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">
                      Most common tasks to boost your productivity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Button variant="outline" size="sm" className="h-20 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-200 transition-colors duration-200" asChild>
                        <Link href="/leads">
                          <Users className="h-5 w-5 text-blue-600" />
                          <span className="text-xs font-medium">Add Lead</span>
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="h-20 flex flex-col gap-2 hover:bg-green-50 hover:border-green-200 transition-colors duration-200" asChild>
                        <Link href="/opportunities">
                          <Target className="h-5 w-5 text-green-600" />
                          <span className="text-xs font-medium">New Opportunity</span>
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="h-20 flex flex-col gap-2 hover:bg-purple-50 hover:border-purple-200 transition-colors duration-200" asChild>
                        <Link href="/attendance-log">
                          <Calendar className="h-5 w-5 text-purple-600" />
                          <span className="text-xs font-medium">Attendance</span>
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-20 flex flex-col gap-2 hover:bg-orange-50 hover:border-orange-200 transition-colors duration-200"
                        onClick={handleTestNotify}
                      >
                        <Bell className="h-5 w-5 text-orange-600" />
                        <span className="text-xs font-medium">Test Notify</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Side Panel - Smaller */}
                <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 border border-indigo-200 dark:border-indigo-800">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full -mr-12 -mt-12"></div>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-bold text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                      <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Activity className="h-4 w-4" />
                      </div>
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                      {recentActivities.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-indigo-500/5 transition-colors duration-200">
                          <div className={`w-2 h-2 ${dotColorForType(item.type)} rounded-full mt-2 flex-shrink-0`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-indigo-800 dark:text-indigo-200 truncate">{item.url ? <a href={item.url} className="hover:underline">{item.title}</a> : item.title}</p>
                            {item.description && (
                              <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 truncate">{item.description}</p>
                            )}
                            <p className="text-xs text-indigo-600 dark:text-indigo-400">{timeAgo(item.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                    {recentActivities.length === 0 && (
                      <div className="text-xs text-indigo-600 dark:text-indigo-400">No recent activity found</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <EnhancedPerformanceDashboard metrics={metrics} />
              <div className="mt-8">
                <PerformanceMetrics metrics={metrics} />
              </div>
            </TabsContent>

            <TabsContent value="team" className="space-y-6">
              <EnhancedTeamDashboard metrics={metrics} />
            </TabsContent>

            <TabsContent value="alerts" className="space-y-6">
              <EnhancedAlertsDashboard metrics={metrics} />
            </TabsContent>
          </Tabs>
          )}
      </div>
    </div>
    </>
  );
}
