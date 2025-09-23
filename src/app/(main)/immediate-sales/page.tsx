"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  Eye,
  TrendingUp,
  AlertCircle,
  Loader2,
  Calendar,
  MapPin,
  Building2,
  Target,
  Award,
  Star,
  Zap,
  Shield,
  BarChart3,
  Download,
  FileText
} from "lucide-react";
import { OpportunityScoringService, OpportunityScore } from "@/lib/opportunityScoring";

interface ImmediateSale {
  id: string;
  projectId?: string;
  ownerId: string;
  contractor?: string;
  sizeClass?: string;
  km?: number;
  mt?: number;
  valueOfOrder?: number;
  quotationDate?: string;
  status: string;
  pic?: string;
  createdAt: string;
  updatedAt: string;
  // Additional computed fields
  daysSinceQuote?: number;
  isRecent?: boolean;
  valueCategory?: string;
  // Opportunity scoring
  opportunityScore?: OpportunityScore;
}

export default function ImmediateSalesPage() {
  const [sales, setSales] = useState<ImmediateSale[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [insights, setInsights] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSale, setSelectedSale] = useState<ImmediateSale | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ role: string; id: string } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    projectId: "",
    contractor: "",
    sizeClass: "",
    km: "",
    mt: "",
    valueOfOrder: "",
    quotationDate: "",
    status: "BIDDING",
    pic: ""
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setCurrentUser({ role: userData.role || 'user', id: userData.id });
    }
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/immediate-sales');
      const data = await response.json();

      if (response.ok) {
        const enhancedSales = data.immediateSales.map((sale: ImmediateSale) => {
          const daysSinceQuote = sale.quotationDate
            ? Math.floor((new Date().getTime() - new Date(sale.quotationDate).getTime()) / (1000 * 60 * 60 * 24))
            : 0;

          const isRecent = daysSinceQuote <= 30; // Within last 30 days

          let valueCategory = 'Low';
          if (sale.valueOfOrder) {
            if (sale.valueOfOrder > 1000000) valueCategory = 'Enterprise';
            else if (sale.valueOfOrder > 500000) valueCategory = 'High';
            else if (sale.valueOfOrder > 100000) valueCategory = 'Medium';
          }

          // Calculate opportunity score
          const opportunityScore = OpportunityScoringService.calculateOpportunityScore({
            dealSize: sale.valueOfOrder || 0,
            probability: sale.status === 'AWARDED' ? 0.9 : sale.status === 'BIDDING' ? 0.6 : 0.3,
            daysInPipeline: daysSinceQuote,
            competitorCount: 2, // Default assumption
            decisionMakerAccess: true, // Default assumption
            budgetApproved: sale.status === 'AWARDED',
            relationshipStrength: isRecent ? 'STRONG' : 'MODERATE',
            urgency: daysSinceQuote > 60 ? 'HIGH' : daysSinceQuote > 30 ? 'MEDIUM' : 'LOW',
            marketTiming: 'GOOD'
          });

          return {
            ...sale,
            daysSinceQuote,
            isRecent,
            valueCategory,
            opportunityScore: {
              ...opportunityScore,
              id: sale.id,
              name: `${sale.contractor || 'Unknown'} - ${sale.sizeClass || 'N/A'}`
            }
          };
        });

        setSales(enhancedSales);
        setAnalytics(data.analytics || {});
        setInsights(data.insights || {});
      } else {
        setError(data.error || 'Failed to fetch immediate sales');
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
      setError('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: string, format: 'excel' | 'pdf' = 'excel') => {
    try {
      const exportUrl = `/api/export?type=${type}&format=${format}`;
      window.open(exportUrl, '_blank');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export sales data. Please try again.');
    }
  };

  const handleFilteredExport = async (filterType: string) => {
    try {
      let exportUrl = '';

      if (filterType.startsWith('status-')) {
        // Export sales by status
        const status = filterType.replace('status-', '');
        const filteredSales = sales.filter(sale => sale.status === status);
        const exportData = { immediateSales: filteredSales };
        const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        exportUrl = url;
      } else if (filterType === 'search-results') {
        // Export current search results
        const filteredSales = sales.filter(sale => {
          const matchesSearch = (sale.contractor && sale.contractor.toLowerCase().includes(searchQuery.toLowerCase())) ||
                               (sale.pic && sale.pic.toLowerCase().includes(searchQuery.toLowerCase())) ||
                               (sale.sizeClass && sale.sizeClass.toLowerCase().includes(searchQuery.toLowerCase()));
          return matchesSearch;
        });
        const exportData = { immediateSales: filteredSales };
        const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        exportUrl = url;
      }

      window.open(exportUrl, '_blank');
    } catch (error) {
      console.error('Filtered export failed:', error);
      alert('Failed to export filtered data. Please try again.');
    }
  };

  const handleCreateSale = async () => {
    try {
      const response = await fetch('/api/immediate-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          km: formData.km ? parseFloat(formData.km) : undefined,
          mt: formData.mt ? parseFloat(formData.mt) : undefined,
          valueOfOrder: formData.valueOfOrder ? parseFloat(formData.valueOfOrder) : undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsCreateDialogOpen(false);
        setFormData({
          projectId: "", contractor: "", sizeClass: "", km: "", mt: "",
          valueOfOrder: "", quotationDate: "", status: "BIDDING", pic: ""
        });
        fetchSales();
      } else {
        alert(typeof data.error === 'string' ? data.error : data.error?.message || 'Failed to create sale');
      }
    } catch (error) {
      console.error('Error creating sale:', error);
      alert('Failed to create sale');
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = (sale.contractor && sale.contractor.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (sale.pic && sale.pic.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (sale.sizeClass && sale.sizeClass.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || sale.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: sales.length,
    totalValue: sales.reduce((sum, s) => sum + (s.valueOfOrder || 0), 0),
    totalKm: sales.reduce((sum, s) => sum + (s.km || 0), 0),
    totalMt: sales.reduce((sum, s) => sum + (s.mt || 0), 0),
    bidding: sales.filter(s => s.status === 'BIDDING').length,
    awarded: sales.filter(s => s.status === 'AWARDED').length,
    lost: sales.filter(s => s.status === 'LOST').length,
    recent: sales.filter(s => s.isRecent).length,
    enterprise: sales.filter(s => s.valueCategory === 'Enterprise').length,
    avgValue: sales.length > 0 ? sales.reduce((sum, s) => sum + (s.valueOfOrder || 0), 0) / sales.length : 0,
    // Opportunity scoring stats
    avgScore: sales.length > 0 ? sales.reduce((sum, s) => sum + (s.opportunityScore?.totalScore || 0), 0) / sales.length : 0,
    criticalPriority: sales.filter(s => s.opportunityScore?.priority === 'CRITICAL').length,
    highPriority: sales.filter(s => s.opportunityScore?.priority === 'HIGH').length,
    highRisk: sales.filter(s => s.opportunityScore?.riskLevel === 'HIGH' || s.opportunityScore?.riskLevel === 'CRITICAL').length
  };

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading immediate sales...</p>
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
            <Button onClick={fetchSales}>Try Again</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 p-8 mb-8 shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <DollarSign className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white">Immediate Sales</h1>
                      <Badge className="bg-orange-500/20 text-white border-white/30 mt-2">
                        ${stats.totalValue.toLocaleString()} Total Value
                      </Badge>
                    </div>
                  </div>
                  <p className="text-green-100 text-lg max-w-2xl">
                    Track quick wins, urgent opportunities, and immediate sales with real-time performance analytics
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={() => handleExport('immediate-sales', 'excel')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export All
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-white/10 border-red-200/20 text-white hover:bg-white/20"
                      onClick={() => handleExport('immediate-sales', 'pdf')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export All PDF
                    </Button>
                    {statusFilter !== "all" && (
                      <Button
                        variant="outline"
                        className="bg-green-500/20 border-green-300/30 text-white hover:bg-green-500/30"
                        onClick={() => handleFilteredExport(`status-${statusFilter}`)}
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        Export {statusFilter}
                      </Button>
                    )}
                    {searchQuery && (
                      <Button
                        variant="outline"
                        className="bg-purple-500/20 border-purple-300/30 text-white hover:bg-purple-500/30"
                        onClick={() => handleFilteredExport('search-results')}
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Export Search
                      </Button>
                    )}
                  </div>
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Sale
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add Immediate Sale</DialogTitle>
                        <DialogDescription>
                          Track a new immediate sales opportunity or quick win
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="contractor">Contractor</Label>
                          <Input
                            id="contractor"
                            value={formData.contractor}
                            onChange={(e) => setFormData({...formData, contractor: e.target.value})}
                            placeholder="Contractor name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="sizeClass">Size Class</Label>
                          <Input
                            id="sizeClass"
                            value={formData.sizeClass}
                            onChange={(e) => setFormData({...formData, sizeClass: e.target.value})}
                            placeholder="Size classification"
                          />
                        </div>
                        <div>
                          <Label htmlFor="km">Length (KM)</Label>
                          <Input
                            id="km"
                            type="number"
                            value={formData.km}
                            onChange={(e) => setFormData({...formData, km: e.target.value})}
                            placeholder="Length in kilometers"
                          />
                        </div>
                        <div>
                          <Label htmlFor="mt">Tonnage (MT)</Label>
                          <Input
                            id="mt"
                            type="number"
                            value={formData.mt}
                            onChange={(e) => setFormData({...formData, mt: e.target.value})}
                            placeholder="Tonnage in metric tons"
                          />
                        </div>
                        <div>
                          <Label htmlFor="valueOfOrder">Order Value ($)</Label>
                          <Input
                            id="valueOfOrder"
                            type="number"
                            value={formData.valueOfOrder}
                            onChange={(e) => setFormData({...formData, valueOfOrder: e.target.value})}
                            placeholder="Order value in USD"
                          />
                        </div>
                        <div>
                          <Label htmlFor="quotationDate">Quotation Date</Label>
                          <Input
                            id="quotationDate"
                            type="date"
                            value={formData.quotationDate}
                            onChange={(e) => setFormData({...formData, quotationDate: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BIDDING">Bidding</SelectItem>
                              <SelectItem value="ONGOING">Ongoing</SelectItem>
                              <SelectItem value="AWARDED">Awarded</SelectItem>
                              <SelectItem value="LOST">Lost</SelectItem>
                              <SelectItem value="PENDING">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="pic">PIC (Person In Charge)</Label>
                          <Input
                            id="pic"
                            value={formData.pic}
                            onChange={(e) => setFormData({...formData, pic: e.target.value})}
                            placeholder="Person in charge"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateSale}>
                          Add Sale
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full -mr-8 -mt-8"></div>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                  Total Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  ${stats.totalValue.toLocaleString()}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {stats.total} opportunities
                </p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 border-indigo-200 dark:border-indigo-800">
              <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full -mr-8 -mt-8"></div>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Star className="h-4 w-4 text-indigo-600" />
                  </div>
                  Avg Opportunity Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">
                  {stats.avgScore.toFixed(1)}
                </div>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Out of 100</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full -mr-8 -mt-8"></div>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Zap className="h-4 w-4 text-purple-600" />
                  </div>
                  Critical Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">{stats.criticalPriority}</div>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Needs immediate action</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
              <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-full -mr-8 -mt-8"></div>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-2">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Shield className="h-4 w-4 text-orange-600" />
                  </div>
                  High Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">{stats.highRisk}</div>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">At risk of loss</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search sales by contractor, PIC, or size..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="BIDDING">Bidding</SelectItem>
                    <SelectItem value="ONGOING">Ongoing</SelectItem>
                    <SelectItem value="AWARDED">Awarded</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Sales Table */}
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-green-500 rounded-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                Sales Opportunities
                <Badge variant="outline" className="ml-2">
                  {filteredSales.length} sales
                </Badge>
              </CardTitle>
              <CardDescription>
                Track immediate sales opportunities and quick wins
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-700">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Contractor</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Size Class</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Order Value</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Score</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Priority</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Risk</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">KM/MT</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Status</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">PIC</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Quote Date</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-medium">{sale.contractor || '-'}</TableCell>
                        <TableCell>{sale.sizeClass || '-'}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-green-600">
                            ${(sale.valueOfOrder || 0).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${
                              sale.opportunityScore?.totalScore && sale.opportunityScore.totalScore > 75
                                ? 'text-green-600'
                                : sale.opportunityScore?.totalScore && sale.opportunityScore.totalScore > 50
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}>
                              {sale.opportunityScore?.totalScore?.toFixed(0) || '0'}
                            </span>
                            <div className="w-12 bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  (sale.opportunityScore?.totalScore || 0) > 75
                                    ? 'bg-green-500'
                                    : (sale.opportunityScore?.totalScore || 0) > 50
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(sale.opportunityScore?.totalScore || 0, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              sale.opportunityScore?.priority === "CRITICAL"
                                ? "bg-red-100 text-red-800"
                                : sale.opportunityScore?.priority === "HIGH"
                                ? "bg-orange-100 text-orange-800"
                                : sale.opportunityScore?.priority === "MEDIUM"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {sale.opportunityScore?.priority || 'LOW'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              sale.opportunityScore?.riskLevel === "CRITICAL"
                                ? "bg-red-100 text-red-800"
                                : sale.opportunityScore?.riskLevel === "HIGH"
                                ? "bg-orange-100 text-orange-800"
                                : sale.opportunityScore?.riskLevel === "MEDIUM"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }
                          >
                            {sale.opportunityScore?.riskLevel || 'LOW'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {sale.km ? `${sale.km} KM` : ''}
                            {sale.km && sale.mt ? ' / ' : ''}
                            {sale.mt ? `${sale.mt} MT` : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              sale.status === "AWARDED"
                                ? "bg-green-100 text-green-800"
                                : sale.status === "BIDDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : sale.status === "LOST"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{sale.pic || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            {sale.quotationDate
                              ? new Date(sale.quotationDate).toLocaleDateString()
                              : '-'
                            }
                            {sale.isRecent && (
                              <Badge variant="outline" className="text-xs border-green-300 text-green-600">
                                Recent
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSale(sale);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Sale Details Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Sale Details
                </DialogTitle>
                <DialogDescription>
                  Comprehensive information about this sales opportunity
                </DialogDescription>
              </DialogHeader>

              {selectedSale && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Sale Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Contractor:</span>
                          <span className="font-medium">{selectedSale.contractor || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Size Class:</span>
                          <span>{selectedSale.sizeClass || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Order Value:</span>
                          <span className="font-semibold text-green-600">
                            ${(selectedSale.valueOfOrder || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <Badge
                            className={
                              selectedSale.status === "AWARDED"
                                ? "bg-green-100 text-green-800"
                                : selectedSale.status === "BIDDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {selectedSale.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Measurements</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Length:</span>
                          <span>{selectedSale.km ? `${selectedSale.km} KM` : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tonnage:</span>
                          <span>{selectedSale.mt ? `${selectedSale.mt} MT` : 'N/A'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Timeline</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quote Date:</span>
                          <span>{selectedSale.quotationDate
                            ? new Date(selectedSale.quotationDate).toLocaleDateString()
                            : 'Not set'
                          }</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Days Since Quote:</span>
                          <span>{selectedSale.daysSinceQuote || 0} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">PIC:</span>
                          <span>{selectedSale.pic || 'Not assigned'}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Performance</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Value Category:</span>
                          <Badge
                            className={
                              selectedSale.valueCategory === "Enterprise"
                                ? "bg-red-100 text-red-800"
                                : selectedSale.valueCategory === "High"
                                ? "bg-orange-100 text-orange-800"
                                : selectedSale.valueCategory === "Medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {selectedSale.valueCategory}
                          </Badge>
                        </div>
                        {selectedSale.isRecent && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Recent Activity:</span>
                            <Badge variant="outline" className="border-green-300 text-green-600">
                              Active (30 days)
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
