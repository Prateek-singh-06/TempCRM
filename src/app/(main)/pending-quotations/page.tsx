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
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import {
  FileClock,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  DollarSign,
  Calendar,
  Mail,
  FileText,
  TrendingUp,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  Edit,
  Eye,
  Upload,
  RefreshCw,
  Building,
  Users,
  Target,
  Filter,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface PendingQuotation {
  id: string;
  projectOrClientName: string;
  quotationPendingSince?: string;
  quotationDeadline?: string;
  orderValue?: number;
  totalQty?: string;
  contactPerson?: string;
  contactEmail?: string;
  quotationDocument?: string;
  status: string;
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  daysPending: number;
  isOverdue: boolean;
  daysToDeadline: number | null;
  urgencyLevel: string;
  statusColor: string;
  opportunityId?: number;
  companyId?: number;
  companies?: {
    id: number;
    name: string;
  };
  opportunities?: {
    id: number;
    name: string;
    stage: string;
  };
  users: {
    name: string;
    email: string;
    employeeCode: string;
  };
}

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
  NEGOTIATION: "bg-blue-100 text-blue-800 border-blue-300",
  REQUOTATION: "bg-purple-100 text-purple-800 border-purple-300",
  SENT: "bg-indigo-100 text-indigo-800 border-indigo-300",
  ACCEPTED: "bg-green-100 text-green-800 border-green-300",
  REJECTED: "bg-red-100 text-red-800 border-red-300",
  EXPIRED: "bg-gray-100 text-gray-800 border-gray-300",
  DONE: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

const urgencyColors = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export default function EnhancedPendingQuotationsPage() {
  const [quotations, setQuotations] = useState<PendingQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  
  // Dialog states
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<PendingQuotation | null>(null);
  const [isRequotationDialogOpen, setIsRequotationDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [stageForm, setStageForm] = useState({
    stage: "",
    notes: "",
    newQuotationDocument: null as File | null,
  });

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/pending-quotations");
      if (response.ok) {
        const data = await response.json();
        setQuotations(data.quotations || []);
      } else {
        console.error("Failed to fetch quotations");
        toast.error("Failed to fetch quotations");
      }
    } catch (error) {
      console.error("Error fetching quotations:", error);
      toast.error("Error fetching quotations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const filteredQuotations = quotations.filter((quotation) => {
    const matchesSearch = quotation.projectOrClientName
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      quotation.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || quotation.status === statusFilter;
    const matchesUrgency = urgencyFilter === "all" || quotation.urgencyLevel === urgencyFilter;
    
    return matchesSearch && matchesStatus && matchesUrgency;
  });

  const handleStageChange = async (quotation: PendingQuotation, newStage: string) => {
    if (newStage === 'REQUOTATION') {
      setSelectedQuotation(quotation);
      setStageForm({
        stage: newStage,
        notes: "",
        newQuotationDocument: null,
      });
      setIsRequotationDialogOpen(true);
      return;
    }

    setSelectedQuotation(quotation);
    setStageForm({
      stage: newStage,
      notes: "",
      newQuotationDocument: null,
    });
    setIsStageDialogOpen(true);
  };

  const handleStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuotation) return;

    setIsSubmitting(true);

    try {
      let quotationDocumentUrl = "";

      // Handle file upload for requotation
      if (stageForm.newQuotationDocument) {
        const formData = new FormData();
        formData.append('file', stageForm.newQuotationDocument);
        formData.append('type', 'quotation');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          quotationDocumentUrl = uploadData.url;
        }
      }

      const response = await fetch(`/api/pending-quotations/${selectedQuotation.id}/stage`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stage: stageForm.stage,
          notes: stageForm.notes,
          newQuotationDocument: quotationDocumentUrl || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setIsStageDialogOpen(false);
        setIsRequotationDialogOpen(false);
        setSelectedQuotation(null);
        fetchQuotations(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update stage");
      }
    } catch (error) {
      console.error("Error updating stage:", error);
      toast.error("Failed to update stage");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4" />;
      case 'NEGOTIATION': return <Users className="h-4 w-4" />;
      case 'REQUOTATION': return <RefreshCw className="h-4 w-4" />;
      case 'SENT': return <Mail className="h-4 w-4" />;
      case 'ACCEPTED': return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED': return <XCircle className="h-4 w-4" />;
      case 'EXPIRED': return <AlertTriangle className="h-4 w-4" />;
      case 'DONE': return <Target className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const stats = {
    total: filteredQuotations.length,
    pending: filteredQuotations.filter(q => q.status === 'PENDING').length,
    negotiation: filteredQuotations.filter(q => q.status === 'NEGOTIATION').length,
    requotation: filteredQuotations.filter(q => q.status === 'REQUOTATION').length,
    sent: filteredQuotations.filter(q => q.status === 'SENT').length,
    done: filteredQuotations.filter(q => q.status === 'DONE').length,
    overdue: filteredQuotations.filter(q => q.isOverdue).length,
    totalValue: filteredQuotations.reduce((sum, q) => sum + (q.orderValue || 0), 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-500">Loading quotations...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Pending Quotations
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Manage and track all quotation requests and their progress
            </p>
          </div>
          <Button
            onClick={fetchQuotations}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Negotiation</p>
                  <p className="text-2xl font-bold">{stats.negotiation}</p>
                </div>
                <Users className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Requotation</p>
                  <p className="text-2xl font-bold">{stats.requotation}</p>
                </div>
                <RefreshCw className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm">Sent</p>
                  <p className="text-2xl font-bold">{stats.sent}</p>
                </div>
                <Mail className="h-8 w-8 text-indigo-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Done</p>
                  <p className="text-2xl font-bold">{stats.done}</p>
                </div>
                <Target className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Overdue</p>
                  <p className="text-2xl font-bold">{stats.overdue}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Total Value</p>
                  <p className="text-xl font-bold">${stats.totalValue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="text-sm font-medium text-gray-700">
                  Search Quotations
                </Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by project name, company, or contact person..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="w-full md:w-48">
                <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
                  Filter by Status
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="NEGOTIATION">Negotiation</SelectItem>
                    <SelectItem value="REQUOTATION">Requotation</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="ACCEPTED">Accepted</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full md:w-48">
                <Label htmlFor="urgency-filter" className="text-sm font-medium text-gray-700">
                  Filter by Urgency
                </Label>
                <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Urgencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Urgencies</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quotations Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800">
                    <TableHead className="font-semibold text-gray-900 dark:text-gray-100">
                      Project/Client
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 dark:text-gray-100">
                      Company
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 dark:text-gray-100">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 dark:text-gray-100">
                      Urgency
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 dark:text-gray-100">
                      Quantity
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 dark:text-gray-100">
                      Value
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 dark:text-gray-100">
                      Deadline
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 dark:text-gray-100">
                      Contact
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 dark:text-gray-100">
                      Document
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 dark:text-gray-100">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotations.map((quotation) => (
                    <TableRow
                      key={quotation.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        quotation.isOverdue ? 'bg-red-50 dark:bg-red-900/20' : ''
                      }`}
                    >
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {quotation.projectOrClientName}
                          </p>
                          {quotation.opportunities && (
                            <p className="text-xs text-gray-500">
                              Opp: {quotation.opportunities.name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {quotation.companies ? (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{quotation.companies.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${
                            statusColors[quotation.status as keyof typeof statusColors]
                          } flex items-center gap-1 w-fit`}
                        >
                          {getStatusIcon(quotation.status)}
                          {quotation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${
                            urgencyColors[quotation.urgencyLevel as keyof typeof urgencyColors]
                          } w-fit`}
                        >
                          {quotation.urgencyLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {quotation.totalQty || <span className="text-gray-400">-</span>}
                      </TableCell>
                      <TableCell className="font-medium">
                        {quotation.orderValue
                          ? `$${quotation.orderValue.toLocaleString()}`
                          : <span className="text-gray-400">-</span>
                        }
                      </TableCell>
                      <TableCell>
                        {quotation.quotationDeadline ? (
                          <div className={`flex items-center gap-2 ${
                            quotation.isOverdue ? 'text-red-600' : 'text-gray-700'
                          }`}>
                            <Calendar className="h-4 w-4" />
                            <div>
                              <p className="text-sm">
                                {new Date(quotation.quotationDeadline).toLocaleDateString()}
                              </p>
                              {quotation.daysToDeadline !== null && (
                                <p className="text-xs text-gray-500">
                                  {quotation.daysToDeadline > 0
                                    ? `${quotation.daysToDeadline} days left`
                                    : `${Math.abs(quotation.daysToDeadline)} days overdue`
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">No deadline</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {quotation.contactPerson ? (
                          <div>
                            <p className="text-sm font-medium">{quotation.contactPerson}</p>
                            {quotation.contactEmail && (
                              <p className="text-xs text-gray-500">{quotation.contactEmail}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {quotation.quotationDocument ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(quotation.quotationDocument, '_blank')}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            View
                          </Button>
                        ) : (
                          <span className="text-gray-400">No document</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value=""
                            onValueChange={(value) => handleStageChange(quotation, value)}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue placeholder="Change Stage" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="NEGOTIATION">Negotiation</SelectItem>
                              <SelectItem value="REQUOTATION">Requotation</SelectItem>
                              <SelectItem value="SENT">Sent</SelectItem>
                              <SelectItem value="ACCEPTED">Accepted</SelectItem>
                              <SelectItem value="REJECTED">Rejected</SelectItem>
                              <SelectItem value="EXPIRED">Expired</SelectItem>
                              <SelectItem value="DONE">Done</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredQuotations.length === 0 && (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No quotations found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== "all" || urgencyFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Get started by creating a new opportunity that generates quotations."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stage Change Dialog */}
        <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Change Stage</DialogTitle>
              <DialogDescription>
                Update the stage for "{selectedQuotation?.projectOrClientName}"
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleStageSubmit} className="space-y-4">
              <div>
                <Label htmlFor="stage">New Stage</Label>
                <Select value={stageForm.stage} onValueChange={(value) => setStageForm({ ...stageForm, stage: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="NEGOTIATION">Negotiation</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="ACCEPTED">Accepted</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={stageForm.notes}
                  onChange={(e) => setStageForm({ ...stageForm, notes: e.target.value })}
                  placeholder="Add any notes about this stage change..."
                  rows={3}
                />
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsStageDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !stageForm.stage}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Stage"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Requotation Dialog */}
        <Dialog open={isRequotationDialogOpen} onOpenChange={setIsRequotationDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-purple-600" />
                Requotation - {selectedQuotation?.projectOrClientName}
              </DialogTitle>
              <DialogDescription>
                Upload a new quotation document to replace the existing one. This will update the stage to "Requotation".
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleStageSubmit} className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                <Label htmlFor="requotationFile" className="text-sm font-medium text-gray-700">
                  Upload New Quotation Document *
                </Label>
                <div className="mt-2">
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="requotationFile" className="flex flex-col items-center justify-center w-full h-32 border-2 border-purple-300 border-dashed rounded-lg cursor-pointer bg-purple-50 hover:bg-purple-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-6 h-6 mb-2 text-purple-500" />
                        <p className="mb-1 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> new quotation
                        </p>
                        <p className="text-xs text-gray-500">PDF, XLS, XLSX (MAX. 10MB)</p>
                        {stageForm.newQuotationDocument && (
                          <p className="text-xs text-purple-600 mt-1 font-medium">
                            Selected: {stageForm.newQuotationDocument.name}
                          </p>
                        )}
                      </div>
                      <input
                        id="requotationFile"
                        type="file"
                        className="hidden"
                        accept=".pdf,.xls,.xlsx"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setStageForm({ ...stageForm, newQuotationDocument: file });
                        }}
                        required
                      />
                    </label>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="requotationNotes">Notes</Label>
                <Textarea
                  id="requotationNotes"
                  value={stageForm.notes}
                  onChange={(e) => setStageForm({ ...stageForm, notes: e.target.value })}
                  placeholder="Explain the changes made in the new quotation..."
                  rows={3}
                />
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRequotationDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !stageForm.newQuotationDocument}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Submit Requotation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
