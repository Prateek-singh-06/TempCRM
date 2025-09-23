"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  LayoutGrid,
  List,
  Target,
  BarChart3,
  PieChart,
  Zap,
} from "lucide-react";
import { DealStage, WeightedDeal, PipelineMetrics } from "@/lib/weightedPipeline";
import { toast } from "sonner";

// Remove old mock data - now using real weighted pipeline data

export default function PipelinePage() {
  const [deals, setDeals] = useState<WeightedDeal[]>([]);
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');


  useEffect(() => {
    fetchWeightedPipeline(selectedPeriod);
  }, [selectedPeriod]);

  const fetchWeightedPipeline = async (period: 'week' | 'month' | 'quarter' | 'year') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pipeline/weighted?period=${period}`);
      const data = await response.json();

      if (response.ok) {
        setDeals(data.deals || []);
        setMetrics(data.metrics);
        setRecommendations(data.recommendations || []);
      } else {
        setError(data.error || 'Failed to fetch weighted pipeline');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  };

  // Filter deals
  const filteredDeals = deals.filter(
    (deal) =>
      deal.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by pipeline stage (Kanban) - Pipeline-specific statuses
  const stages: { name: DealStage; color: string; label: string; pipelineStatus: string }[] = [
    { name: DealStage.PROPOSAL, color: "bg-blue-500", label: "Order Processing", pipelineStatus: "ORDER_RECEIVED,ORDER_PROCESSING,CONTRACT_SIGNING" },
    { name: DealStage.NEGOTIATION, color: "bg-yellow-500", label: "Production", pipelineStatus: "PRODUCTION_STARTED,QUALITY_CHECK" },
    { name: DealStage.FINAL_APPROVAL, color: "bg-orange-500", label: "Shipping", pipelineStatus: "PACKING_SHIPPING,SHIPPED" },
    { name: DealStage.CLOSED_WON, color: "bg-green-500", label: "Delivered", pipelineStatus: "DELIVERED,INSTALLATION_STARTED,INSTALLATION_COMPLETE,PAYMENT_RECEIVED,PROJECT_COMPLETE" },
    { name: DealStage.ON_HOLD, color: "bg-red-500", label: "On Hold", pipelineStatus: "ON_HOLD,DELAYED" },
  ];

  const dealsByStage = stages.reduce(
    (acc: Record<string, WeightedDeal[]>, stage) => {
      acc[stage.name] = filteredDeals.filter(
        (deal: WeightedDeal) => deal.stage === stage.name
      );
      return acc;
    },
    {} as Record<string, WeightedDeal[]>
  );

  const formatCurrency = (value: number): string => {
    const safeValue = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(safeValue);
  };

  const velocityDetails = metrics?.velocityDetails;

  // Helper functions
  const getStageColor = (stage: DealStage) => {
    switch (stage) {
      case DealStage.LEAD_GENERATED: return "bg-purple-100 text-purple-800";
      case DealStage.INITIAL_CONTACT: return "bg-pink-100 text-pink-800";
      case DealStage.NEEDS_ANALYSIS: return "bg-indigo-100 text-indigo-800";
      case DealStage.PROSPECTING: return "bg-gray-100 text-gray-800";
      case DealStage.QUALIFICATION: return "bg-blue-100 text-blue-800";
      case DealStage.VALUE_PROPOSITION: return "bg-cyan-100 text-cyan-800";
      case DealStage.PROPOSAL_PREPARATION: return "bg-teal-100 text-teal-800";
      case DealStage.PROPOSAL: return "bg-yellow-100 text-yellow-800";
      case DealStage.PROPOSAL_REVIEW: return "bg-amber-100 text-amber-800";
      case DealStage.NEGOTIATION: return "bg-orange-100 text-orange-800";
      case DealStage.CONTRACT_REVIEW: return "bg-red-100 text-red-800";
      case DealStage.FINAL_APPROVAL: return "bg-rose-100 text-rose-800";
      case DealStage.CLOSED_WON: return "bg-green-100 text-green-800";
      case DealStage.CLOSED_LOST: return "bg-red-100 text-red-800";
      case DealStage.ON_HOLD: return "bg-yellow-100 text-yellow-800";
      case DealStage.CANCELLED: return "bg-gray-100 text-gray-800";
      case DealStage.LOST_TO_COMPETITOR: return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return "bg-red-100 text-red-800";
      case 'MEDIUM': return "bg-yellow-100 text-yellow-800";
      case 'LOW': return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Map database status values to frontend display values
  const getDisplayStatus = (dbStatus: string | undefined): string => {
    console.log("getDisplayStatus called with:", dbStatus);
    const reverseMapping: Record<string, string> = {
      'ORDER_RECEIVED': 'incoming',
      'ORDER_PROCESSING': 'incoming',
      'CONTRACT_SIGNING': 'incoming',
      'PRODUCTION_STARTED': 'working',
      'QUALITY_CHECK': 'working',
      'PACKING_SHIPPING': 'working',
      'SHIPPED': 'working',
      'DELIVERED': 'completed',
      'INSTALLATION_STARTED': 'completed',
      'INSTALLATION_COMPLETE': 'completed',
      'PAYMENT_RECEIVED': 'completed',
      'PROJECT_COMPLETE': 'completed'
    };
    const result = reverseMapping[dbStatus || ''] || dbStatus || '';
    console.log("getDisplayStatus returning:", result);
    return result;
  };

  // Color coding for pipeline status like opportunity stages
  const getStatusColor = (status: string | undefined): string => {
    const displayStatus = getDisplayStatus(status);
    const statusColors: Record<string, string> = {
      'incoming': 'bg-blue-100 text-blue-800',
      'working': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800'
    };
    return statusColors[displayStatus] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadgeColor = (status: string | undefined): string => {
    const displayStatus = getDisplayStatus(status);
    const badgeColors: Record<string, string> = {
      'incoming': 'bg-blue-500',
      'working': 'bg-yellow-500',
      'completed': 'bg-green-500'
    };
    return badgeColors[displayStatus] || 'bg-gray-500';
  };

  // Handle status change (like stage in opportunities)
  const handleStatusChange = async (dealId: string, newStatus: string) => {
    console.log("Frontend: handleStatusChange called", { dealId, newStatus });

    try {
      // Map frontend status values to database enum values
      const statusMapping: Record<string, string> = {
        'incoming': 'ORDER_RECEIVED',
        'working': 'PRODUCTION_STARTED',
        'completed': 'PROJECT_COMPLETE'
      };

      const dbStatus = statusMapping[newStatus] || newStatus;
      console.log("Frontend: Mapped status", { newStatus, dbStatus });

      const response = await fetch(`/api/pipeline/weighted`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pipelineId: dealId,
          status: dbStatus,
        }),
      });

      console.log("Frontend: API response status", response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log("Frontend: API response data", responseData);
        if (responseData.immediateSaleCreated) {
          toast.success("Status updated and moved to immediate sales!");
        } else {
          toast.success("Status updated successfully");
        }
        fetchWeightedPipeline(selectedPeriod); // Refresh the list
      } else {
        const errorData = await response.json();
        console.error("Status update failed:", errorData);
        toast.error(`Failed to update status: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };



  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading weighted pipeline...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
      <Button onClick={() => fetchWeightedPipeline(selectedPeriod)}>Try Again</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto p-4 lg:p-6">
          {/* Compact Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Pipeline Overview</h1>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                    Track your sales pipeline with weighted analytics
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as 'week' | 'month' | 'quarter' | 'year')}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                    <SelectItem value="quarter">Last 90 days</SelectItem>
                    <SelectItem value="year">Last 365 days</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <Button
                    variant={viewMode === "kanban" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("kanban")}
                    className="gap-2"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Kanban
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="gap-2"
                  >
                    <List className="h-4 w-4" />
                    Table
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Metrics Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Total Deals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {metrics?.totalDeals || 0}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Active opportunities</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Weighted Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(metrics?.weightedValue || 0)}
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Probability-adjusted</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Velocity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(velocityDetails?.velocityPerMonth ?? metrics?.velocity ?? 0)}
                </div>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Revenue/month</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Conversion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {((metrics?.conversionRate || 0) * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Win rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Card className="mb-8 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-orange-700 dark:text-orange-300">
                  <AlertTriangle className="h-5 w-5" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded">
                      <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                      <span className="text-sm text-orange-700 dark:text-orange-300">{rec}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Kanban View */}
          {viewMode === "kanban" ? (
            <div className="flex gap-6 overflow-x-auto pb-6">
              {stages.map((stage) => (
                <div key={stage.name} className="flex-shrink-0 w-80">
                  {/* Stage Header */}
                  <div className={`${stage.color} text-white p-4 rounded-t-xl shadow-lg`}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-lg">{stage.label}</h3>
                      <Badge variant="secondary" className="bg-white/20 text-white font-semibold">
                        {dealsByStage[stage.name]?.length || 0}
                      </Badge>
                    </div>
                    <div className="text-sm opacity-90 font-medium">
                      {formatCurrency(
                        dealsByStage[stage.name]
                          ?.reduce((acc: number, deal: WeightedDeal) => acc + deal.weightedValue, 0) || 0
                      )}
                    </div>
                  </div>

                  {/* Stage Content */}
                  <div className="bg-white dark:bg-gray-800 min-h-[500px] p-4 space-y-4 rounded-b-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    {dealsByStage[stage.name]?.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <div className="text-4xl mb-2">📋</div>
                        <p className="text-sm">No deals in this stage</p>
                      </div>
                    ) : (
                      dealsByStage[stage.name]?.map((deal: WeightedDeal) => (
                        <Card
                          key={deal.id}
                          className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500 hover:border-l-blue-600 cursor-pointer"
                        >
                          <CardContent className="p-4">
                            {/* Deal Header */}
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                                  {deal.name}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {deal.companyName || 'No company'}
                                </p>
                              </div>
                              {deal.riskScore > 70 && (
                                <Badge variant="destructive" className="text-xs ml-2 flex-shrink-0">
                                  High Risk
                                </Badge>
                              )}
                            </div>

                            {/* Deal Metrics */}
                            <div className="space-y-2 mb-3">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Value</span>
                                <span className="text-sm font-bold text-green-600">
                                  {formatCurrency(deal.value)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Probability</span>
                                <span className="text-sm font-bold text-blue-600">
                                  {(deal.probability * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Weighted</span>
                                <span className="text-sm font-bold text-purple-600">
                                  {formatCurrency(deal.weightedValue)}
                                </span>
                              </div>
                            </div>

                            {/* Priority and Status Badges */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge className={`${getPriorityColor(deal.priority)} text-xs`}>
                                {deal.priority}
                              </Badge>
                              <Badge className={`${getStatusColor(deal.status)} text-xs`}>
                                {getDisplayStatus(deal.status) || 'Unknown'}
                              </Badge>
                            </div>

                            {/* Status Update */}
                            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                              <Select
                                value={getDisplayStatus(deal.status) || ""}
                                onValueChange={(value) => handleStatusChange(deal.id, value)}
                              >
                                <SelectTrigger className="w-full h-8 text-xs">
                                  <SelectValue placeholder="Update status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="incoming">Incoming</SelectItem>
                                  <SelectItem value="working">Working</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-800">
                        <TableHead className="font-semibold">Deal</TableHead>
                        <TableHead className="font-semibold">Customer</TableHead>
                        <TableHead className="font-semibold">Value</TableHead>
                        <TableHead className="font-semibold">Probability</TableHead>
                        <TableHead className="font-semibold">Priority</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Owner</TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <div className="text-4xl mb-2">📊</div>
                            <p>No deals found matching your search</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDeals.map((deal: WeightedDeal) => (
                          <TableRow
                            key={deal.id}
                            className={`transition-colors ${
                              getDisplayStatus(deal.status) === 'working'
                                ? 'bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            <TableCell>
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {deal.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  ID: {deal.id}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {deal.companyName || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {deal.classification || 'Small Business'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-green-600 font-bold">
                                {formatCurrency(deal.value)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Weighted: {formatCurrency(deal.weightedValue)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="text-blue-600 font-semibold">
                                  {(deal.probability * 100).toFixed(0)}%
                                </div>
                                <div className="w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${deal.probability * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getPriorityColor(deal.priority)} text-xs`}>
                                {deal.priority}
                              </Badge>
                              {deal.riskScore > 70 && (
                                <div className="mt-1">
                                  <Badge variant="destructive" className="text-xs">
                                    High Risk
                                  </Badge>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(deal.status)} text-xs`}>
                                {getDisplayStatus(deal.status) || 'Unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {deal.ownerName ? (
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {deal.ownerName}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {deal.ownerEmail}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400">Unassigned</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={getDisplayStatus(deal.status) || ""}
                                onValueChange={(value) => handleStatusChange(deal.id, value)}
                              >
                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                  <SelectValue placeholder="Update" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="incoming">Incoming</SelectItem>
                                  <SelectItem value="working">Working</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
