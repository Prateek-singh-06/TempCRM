"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import {
  FileText, TrendingUp, Users, Calendar as CalendarIcon, Download, RefreshCw, Loader2,
  BarChart3, Clock, UserCheck, UserX, Target, AlertCircle, AlertTriangle, Zap, Activity,
  Lightbulb, Brain, DollarSign, ArrowUp, ArrowDown, ChevronRight, Eye, Filter, Sparkles,
  CalendarDays, X, CheckCircle, XCircle, AlertOctagon, TrendingDown
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart,
  ComposedChart, Line, AreaChart, Area, PieChart, Pie, Cell, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];

export default function CompleteReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [quotationReport, setQuotationReport] = useState<QuotationReport | null>(null);
  const [attendanceReport, setAttendanceReport] = useState<AttendanceReport | null>(null);
  const [forecastReport, setForecastReport] = useState<any>(null);
  const [pipelineReport, setPipelineReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("sales");

  useEffect(() => {
    generateReports();
  }, [selectedPeriod]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getGrowthIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="h-3 w-3" />;
    if (value < 0) return <ArrowDown className="h-3 w-3" />;
    return null;
  };

  const generateReports = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [salesResponse, quotationsResponse, attendanceResponse, forecastResponse, pipelineResponse] = await Promise.all([
        fetch(`/api/reports?type=sales&period=${selectedPeriod}`),
        fetch(`/api/reports?type=quotation&period=${selectedPeriod}`),
        fetch(`/api/reports?type=attendance&period=${selectedPeriod}`),
        fetch(`/api/forecast?period=${selectedPeriod}&confidence=0.8`),
        fetch(`/api/pipeline/weighted?period=${selectedPeriod}`)
      ]);

      const [salesData, quotationsData, attendanceData, forecastData, pipelineData] = await Promise.all([
        salesResponse.ok ? salesResponse.json() : null,
        quotationsResponse.ok ? quotationsResponse.json() : null,
        attendanceResponse.ok ? attendanceResponse.json() : null,
        forecastResponse.ok ? forecastResponse.json() : null,
        pipelineResponse.ok ? pipelineResponse.json() : null
      ]);

      if (salesData?.data) setSalesReport(salesData.data);
      if (quotationsData?.data) setQuotationReport(quotationsData.data);
      if (attendanceData?.data) setAttendanceReport(attendanceData.data);
      if (forecastData) setForecastReport(forecastData);
      if (pipelineData) setPipelineReport(pipelineData);

    } catch (err) {
      setError("Failed to load reports");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const exportReport = async (format: 'excel' | 'pdf') => {
    window.open(`/api/export?type=${activeTab}&format=${format}&period=${selectedPeriod}`, '_blank');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Comprehensive business analytics</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => generateReports(true)} disabled={isRefreshing} variant="outline" size="icon">
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>

          <Button onClick={() => exportReport('excel')} variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Button onClick={() => exportReport('pdf')} variant="outline" size="icon">
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-2 p-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="quotations">Quotations</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          </TabsList>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    {getGrowthIcon(12.5)}
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(salesReport?.totalRevenue || 0)}</p>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    {getGrowthIcon(8.3)}
                  </div>
                  <p className="text-2xl font-bold">{salesReport?.totalDeals || 0}</p>
                  <p className="text-sm text-gray-600">Closed Deals</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    {getGrowthIcon((salesReport?.conversionRate || 0) > 30 ? 5 : -2)}
                  </div>
                  <p className="text-2xl font-bold">{salesReport?.conversionRate || 0}%</p>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                    {getGrowthIcon(3.7)}
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(salesReport?.averageDealSize || 0)}</p>
                  <p className="text-sm text-gray-600">Avg Deal Size</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesReport?.monthlyTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pipeline Stages</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesReport?.pipelineStages || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Quotations Tab */}
          <TabsContent value="quotations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <Badge variant="outline">{quotationReport?.totalQuotations || 0}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{quotationReport?.totalQuotations || 0}</p>
                  <p className="text-sm text-gray-600">Total Quotations</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <Badge variant="warning">{quotationReport?.pendingQuotations || 0}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{quotationReport?.pendingQuotations || 0}</p>
                  <p className="text-sm text-gray-600">Pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <Badge variant="success">{quotationReport?.acceptedQuotations || 0}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{quotationReport?.acceptedQuotations || 0}</p>
                  <p className="text-sm text-gray-600">Accepted</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <AlertOctagon className="h-5 w-5 text-red-600" />
                    <Badge variant="destructive">{quotationReport?.overdueQuotations || 0}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{quotationReport?.overdueQuotations || 0}</p>
                  <p className="text-sm text-gray-600">Overdue</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quotation Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Pending', value: quotationReport?.pendingQuotations || 0, fill: '#F59E0B' },
                          { name: 'Accepted', value: quotationReport?.acceptedQuotations || 0, fill: '#10B981' },
                          { name: 'Rejected', value: quotationReport?.rejectedQuotations || 0, fill: '#EF4444' },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                      >
                        {[0, 1, 2].map((index) => (
                          <Cell key={`cell-${index}`} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Clients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(quotationReport?.topClients || []).slice(0, 5).map((client, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            index === 0 ? "bg-green-500" : "bg-gray-400"
                          )} />
                          <span className="font-medium">{client.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(client.value)}</p>
                          <p className="text-sm text-gray-600">{client.quotations} quotes</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <Badge>{attendanceReport?.totalEmployees || 0}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{attendanceReport?.totalEmployees || 0}</p>
                  <p className="text-sm text-gray-600">Total Employees</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <UserCheck className="h-5 w-5 text-green-600" />
                    <Badge variant="success">{attendanceReport?.presentToday || 0}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{attendanceReport?.presentToday || 0}</p>
                  <p className="text-sm text-gray-600">Present Today</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <UserX className="h-5 w-5 text-red-600" />
                    <Badge variant="destructive">{attendanceReport?.absentToday || 0}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{attendanceReport?.absentToday || 0}</p>
                  <p className="text-sm text-gray-600">Absent Today</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <Badge variant="warning">{attendanceReport?.lateSubmissions || 0}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{attendanceReport?.lateSubmissions || 0}</p>
                  <p className="text-sm text-gray-600">Late Submissions</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Attendance Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={attendanceReport?.monthlyAttendance || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="present" stackId="1" stroke="#10B981" fill="#10B981" />
                      <Area type="monotone" dataKey="absent" stackId="1" stroke="#EF4444" fill="#EF4444" />
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performers (Attendance Rate)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(attendanceReport?.topPerformers || []).map((performer, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className="w-6 h-6">{index + 1}</Badge>
                          <span className="font-medium">{performer.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={performer.attendanceRate} className="w-24" />
                          <span className="text-sm font-bold">{performer.attendanceRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <Badge variant="success">Optimistic</Badge>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(forecastReport?.forecast?.optimistic || 0)}</p>
                  <p className="text-sm text-gray-600">Best Case</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <Badge>Expected</Badge>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(forecastReport?.forecast?.expected || 0)}</p>
                  <p className="text-sm text-gray-600">Most Likely</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    <Badge variant="destructive">Pessimistic</Badge>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(forecastReport?.forecast?.pessimistic || 0)}</p>
                  <p className="text-sm text-gray-600">Worst Case</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    <Badge variant="outline">{formatPercentage(forecastReport?.confidence || 0)}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{formatPercentage(forecastReport?.confidence || 0)}</p>
                  <p className="text-sm text-gray-600">Confidence</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Forecast</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={forecastReport?.monthlyForecast || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="pessimistic" fill="#FEE2E2" stroke="#EF4444" />
                      <Line type="monotone" dataKey="expected" stroke="#3B82F6" strokeWidth={2} />
                      <Area type="monotone" dataKey="optimistic" fill="#D1FAE5" stroke="#10B981" />
                      <Legend />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Forecast Factors</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={forecastReport?.factors || []}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="factor" />
                      <PolarRadiusAxis />
                      <Radar name="Impact" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pipeline Tab */}
          <TabsContent value="pipeline" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    {getGrowthIcon(15.8)}
                  </div>
                  <p className="text-2xl font-bold">{pipelineReport?.metrics?.totalDeals || 0}</p>
                  <p className="text-sm text-gray-600">Active Deals</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    {getGrowthIcon(22.4)}
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(pipelineReport?.metrics?.totalValue || 0)}</p>
                  <p className="text-sm text-gray-600">Total Value</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    {getGrowthIcon(9.3)}
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(pipelineReport?.metrics?.weightedValue || 0)}</p>
                  <p className="text-sm text-gray-600">Weighted Value</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Zap className="h-5 w-5 text-orange-600" />
                    {getGrowthIcon(11.7)}
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(pipelineReport?.metrics?.velocity || 0)}</p>
                  <p className="text-sm text-gray-600">Revenue Velocity (USD/month)</p>
                  {pipelineReport?.metrics?.velocityDetails && (
                    <p className="text-xs text-gray-500 mt-2">
                      ≈ {pipelineReport.metrics.velocityDetails.dealsPerMonth.toFixed(1)} deals/month · Win rate {(pipelineReport.metrics.velocityDetails.winRate * 100).toFixed(1)}%
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pipeline Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(pipelineReport?.metrics?.stageDistribution || {}).map(([stage, count]) => ({
                          name: stage,
                          value: count,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {Object.entries(pipelineReport?.metrics?.stageDistribution || {}).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AI Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(pipelineReport?.recommendations || []).map((rec: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
