"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, TrendingDown, Target, DollarSign, Users, Activity,
  Clock, Calendar, Award, BarChart3, ArrowUp, ArrowDown,
  Zap, CheckCircle, XCircle, AlertTriangle, Info, Loader2
} from "lucide-react";
import dynamic from "next/dynamic";

// Dynamic imports for charts
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false }) as any;
const ResponsiveContainer = dynamic(() => import("recharts").then(mod => mod.ResponsiveContainer as any), { ssr: false }) as any;
const LineChart = dynamic(() => import("recharts").then(mod => mod.LineChart as any), { ssr: false }) as any;
const BarChart = dynamic(() => import("recharts").then(mod => mod.BarChart as any), { ssr: false }) as any;
const AreaChart = dynamic(() => import("recharts").then(mod => mod.AreaChart as any), { ssr: false }) as any;
const RadialBarChart = dynamic(() => import("recharts").then(mod => mod.RadialBarChart as any), { ssr: false }) as any;
const Line = dynamic(() => import("recharts").then(mod => mod.Line as any), { ssr: false }) as any;
const Bar = dynamic(() => import("recharts").then(mod => mod.Bar as any), { ssr: false }) as any;
const Area = dynamic(() => import("recharts").then(mod => mod.Area as any), { ssr: false }) as any;
const RadialBar = dynamic(() => import("recharts").then(mod => mod.RadialBar as any), { ssr: false }) as any;
const XAxis = dynamic(() => import("recharts").then(mod => mod.XAxis as any), { ssr: false }) as any;
const YAxis = dynamic(() => import("recharts").then(mod => mod.YAxis as any), { ssr: false }) as any;
const CartesianGrid = dynamic(() => import("recharts").then(mod => mod.CartesianGrid as any), { ssr: false }) as any;
const Tooltip = dynamic(() => import("recharts").then(mod => mod.Tooltip as any), { ssr: false }) as any;
const Legend = dynamic(() => import("recharts").then(mod => mod.Legend as any), { ssr: false }) as any;
const Cell = dynamic(() => import("recharts").then(mod => mod.Cell as any), { ssr: false }) as any;

interface PerformanceData {
  conversionRates: {
    leadToOpportunity: number;
    opportunityToPipeline: number;
    pipelineToWon: number;
  };
  revenue: {
    current: number;
    target: number;
    growth: number;
    trend: "up" | "down" | "stable";
  };
  salesVelocity: {
    averageDealSize: number;
    averageSalesCycle: number;
    winRate: number;
    numberOfOpportunities: number;
  };
  teamPerformance: Array<{
    name: string;
    deals: number;
    revenue: number;
    conversion: number;
    activity: number;
  }>;
  monthlyMetrics: Array<{
    month: string;
    revenue: number;
    deals: number;
    newLeads: number;
    conversion: number;
  }>;
  pipelineHealth: {
    totalValue: number;
    stalled: number;
    atRisk: number;
    healthy: number;
  };
}

export default function PerformanceMetrics({ metrics }: { metrics: any }) {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  useEffect(() => {
    fetchPerformanceData();
  }, [selectedPeriod]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      
      // Fetch data from multiple endpoints
      const [analyticsRes, opportunitiesRes, activitiesRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/opportunities'),
        fetch('/api/activities/summary?days=30')
      ]);

      const [analytics, opportunities, activities] = await Promise.all([
        analyticsRes.json(),
        opportunitiesRes.json(),
        activitiesRes.json()
      ]);

      // Process and structure the data
      const data: PerformanceData = {
        conversionRates: {
          leadToOpportunity: analytics?.conversionRates?.leadToOpportunity || metrics?.conversionRates?.leadToOpportunity || 0,
          opportunityToPipeline: analytics?.conversionRates?.opportunityToPipeline || metrics?.conversionRates?.opportunityToPipeline || 0,
          pipelineToWon: calculateWinRate(opportunities?.opportunities || [])
        },
        revenue: {
          current: analytics?.monthlyTarget?.achieved || 0,
          target: analytics?.monthlyTarget?.target || 0,
          growth: calculateGrowth(analytics),
          trend: analytics?.insights?.conversionTrend === "up" ? "up" : "down"
        },
        salesVelocity: calculateSalesVelocity(opportunities?.opportunities || []),
        teamPerformance: processTeamPerformance(activities?.summary || []),
        monthlyMetrics: generateMonthlyMetrics(analytics),
        pipelineHealth: analyzePipelineHealth(opportunities?.opportunities || [])
      };

      setPerformanceData(data);
    } catch (error) {
      console.error("Error fetching performance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWinRate = (opportunities: any[]) => {
    const won = opportunities.filter(o => o.stage === 'CLOSED_WON').length;
    const closed = opportunities.filter(o => o.stage === 'CLOSED_WON' || o.stage === 'CLOSED_LOST').length;
    return closed > 0 ? (won / closed) * 100 : 0;
  };

  const calculateGrowth = (analytics: any) => {
    // Calculate month-over-month growth
    const current = analytics?.monthlyTarget?.achieved || 0;
    const previous = analytics?.previousMonth?.achieved || current * 0.8; // Estimate if not available
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  };

  const calculateSalesVelocity = (opportunities: any[]) => {
    const won = opportunities.filter(o => o.stage === 'CLOSED_WON');
    const avgDealSize = won.length > 0 
      ? won.reduce((sum, o) => sum + (o.dealSize || 0), 0) / won.length 
      : 0;
    
    const avgCycle = won.length > 0
      ? won.reduce((sum, o) => {
          const created = new Date(o.createdDate);
          const closed = o.closedDate ? new Date(o.closedDate) : new Date();
          return sum + Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / won.length
      : 30;

    return {
      averageDealSize: avgDealSize,
      averageSalesCycle: avgCycle,
      winRate: calculateWinRate(opportunities),
      numberOfOpportunities: opportunities.length
    };
  };

  const processTeamPerformance = (activities: any[]) => {
    return activities.map(member => ({
      name: member.name || `User ${member.userId}`,
      deals: member.opportunities || 0,
      revenue: member.revenue || 0,
      conversion: member.conversionRate || 0,
      activity: (member.calls || 0) + (member.emails || 0) + (member.meetings || 0)
    }));
  };

  const generateMonthlyMetrics = (analytics: any) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => ({
      month,
      revenue: Math.random() * 1000000 + 500000, // Replace with actual data
      deals: Math.floor(Math.random() * 50 + 20),
      newLeads: Math.floor(Math.random() * 100 + 50),
      conversion: Math.random() * 30 + 10
    }));
  };

  const analyzePipelineHealth = (opportunities: any[]) => {
    const total = opportunities.reduce((sum, o) => sum + (o.dealSize || 0), 0);
    const stalled = opportunities.filter(o => {
      const lastUpdate = new Date(o.updatedDate || o.createdDate);
      const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceUpdate > 30 && o.stage !== 'CLOSED_WON' && o.stage !== 'CLOSED_LOST';
    }).length;
    
    const atRisk = opportunities.filter(o => {
      const closeDate = o.expectedCloseDate ? new Date(o.expectedCloseDate) : null;
      return closeDate && closeDate < new Date() && o.stage !== 'CLOSED_WON' && o.stage !== 'CLOSED_LOST';
    }).length;

    return {
      totalValue: total,
      stalled: stalled,
      atRisk: atRisk,
      healthy: opportunities.length - stalled - atRisk
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-gray-600">Unable to load performance data</p>
      </div>
    );
  }

  const salesVelocityScore = 
    (performanceData.salesVelocity.numberOfOpportunities * 
     performanceData.salesVelocity.winRate * 
     performanceData.salesVelocity.averageDealSize) / 
    performanceData.salesVelocity.averageSalesCycle;

  return (
    <div className="space-y-6">
      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Performance */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Revenue Performance
              </span>
              {performanceData.revenue.trend === "up" ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
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

        {/* Conversion Funnel */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs">Lead → Opp</span>
                <span className="text-sm font-bold">{performanceData.conversionRates.leadToOpportunity.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Opp → Pipeline</span>
                <span className="text-sm font-bold">{performanceData.conversionRates.opportunityToPipeline.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Win Rate</span>
                <span className="text-sm font-bold text-green-600">{performanceData.conversionRates.pipelineToWon.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Velocity */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Sales Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {salesVelocityScore.toFixed(0)}
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Deal</span>
                  <span>{formatCurrency(performanceData.salesVelocity.averageDealSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Cycle</span>
                  <span>{performanceData.salesVelocity.averageSalesCycle.toFixed(0)} days</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Health */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-950 dark:to-red-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Pipeline Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatCurrency(performanceData.pipelineHealth.totalValue)}
              </div>
              <div className="flex gap-2">
                <Badge variant="default" className="text-xs bg-green-600">
                  {performanceData.pipelineHealth.healthy} Healthy
                </Badge>
                <Badge variant="destructive" className="text-xs">
                  {performanceData.pipelineHealth.atRisk} At Risk
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance Trend */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Monthly Performance Trend
            </CardTitle>
            <CardDescription>Revenue, deals, and conversion trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData.monthlyMetrics}>
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
                  stroke="#3B82F6" 
                  strokeWidth={2} 
                  name="Revenue"
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="conversion" 
                  stroke="#10B981" 
                  strokeWidth={2} 
                  name="Conversion %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team Performance Ranking */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Team Performance Ranking
            </CardTitle>
            <CardDescription>Top performers by revenue and activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceData.teamPerformance
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5)
                .map((member, index) => (
                  <div key={member.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-gray-600">{member.activity} activities</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(member.revenue)}</p>
                      <p className="text-xs text-gray-600">{member.deals} deals</p>
                    </div>
                  </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Velocity Components */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-600" />
            Sales Velocity Analysis
          </CardTitle>
          <CardDescription>
            Key factors driving sales momentum
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{performanceData.salesVelocity.numberOfOpportunities}</p>
              <p className="text-sm text-gray-600">Opportunities</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{performanceData.salesVelocity.winRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-600">Win Rate</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{formatCurrency(performanceData.salesVelocity.averageDealSize)}</p>
              <p className="text-sm text-gray-600">Avg Deal Size</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{performanceData.salesVelocity.averageSalesCycle.toFixed(0)}</p>
              <p className="text-sm text-gray-600">Days to Close</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}