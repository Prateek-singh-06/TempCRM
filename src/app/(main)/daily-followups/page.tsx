"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Calendar,
  Clock,
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Target,
  Loader2,
  FileText,
  Activity,
  BarChart3,
  Users,
  ArrowRight,
  CalendarDays,
  MessageSquare,
  PhoneCall,
  Video,
  Send,
  ChevronRight,
  Star,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Timer,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ListChecks,
  Eye,
  Edit,
  Trash2,
  MoreVertical
} from "lucide-react";

async function safeJson(response: Response) {
    if (!response.ok) {
        return null;
    }
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse JSON", text);
        return null;
    }
}

interface DailyFollowUp {
  id: number | string;
  projectId?: number;
  projectName?: string;
  immediateSaleId?: number;
  salesDealId?: number;
  actionType: string;
  actionDescription: string; // Updated to match API response
  nextAction?: string;
  nextActionDate?: string;
  followUpDate?: string;
  nextActionNotes?: string;
  status: string;
  priority: string;
  outcome?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  users?: { // Might be missing on some records; make optional
    name: string;
    email: string;
    employeeCode: string;
  };
  // Additional computed fields from API
  isOverdue: boolean;
  isToday: boolean;
  daysUntilFollowUp: number;
  daysOverdue?: number;
  smartInsights: {
    timingOptimization: string;
    effectiveness: string;
    riskLevel: string;
  };
  linkedType?: 'LEAD' | 'OPPORTUNITY' | 'PIPELINE' | 'NONE';
  linkedName?: string;
  linkedOpportunityId?: string;
  linkedLeadId?: string;
  linkedPipelineId?: string;
  overdueReason?: string;
  overdueAcknowledgedAt?: string;
}

interface User {
    id: string;
    name: string;
}

interface Lead {
    id: string;
    name: string;
}

interface Opportunity {
    id: string;
    name: string;
}

interface Company {
    id: string;
    name: string;
}


export default function DailyFollowUpsPage() {
  const [followUps, setFollowUps] = useState<DailyFollowUp[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [insights, setInsights] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role?:string } | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
      userId: "all",
      leadId: "all", 
      opportunityId: "all",
      companyId: "all",
      period: "all",
      startDate: "",
      endDate: "",
      assignedTo: "all",
      priority: "all",
      actionType: "all"
  });
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState({
    projectId: "",
    immediateSaleId: "",
    salesDealId: "",
    followUpType: "CALL",
    description: "",
    nextAction: "",
    nextActionDate: "",
    priority: "MEDIUM",
    notes: "",
    linkType: "MISC", // MISC | LEAD | OPPORTUNITY
    leadId: "",
    opportunityId: ""
  });
  const [leadOptions, setLeadOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [opportunityOptions, setOpportunityOptions] = useState<Array<{ id: string; name: string }>>([]);

  const fetchFollowUps = useCallback(async ({ initial = false }: { initial?: boolean } = {}) => {
    if (initial) {
      setIsInitialLoad(true);
    }
    setLoading(true);
    try {
        const query = new URLSearchParams();
        
        // User filter - maps to createdById in backend
        if (filters.userId !== "all") query.append("userId", filters.userId);
        
        // Entity filters
        if (filters.leadId !== "all") query.append("leadId", filters.leadId);
        if (filters.opportunityId !== "all") query.append("opportunityId", filters.opportunityId);  
        if (filters.companyId !== "all") query.append("companyId", filters.companyId);
        
        // Time period filter
        if (filters.period !== "all") query.append("period", filters.period);
        
        // Date range filters (if custom date range is selected)
        if (filters.startDate && filters.endDate) {
          query.append("startDate", filters.startDate);
          query.append("endDate", filters.endDate);
        }
        
        // Status filter
        if (filterStatus !== "all") query.append("status", filterStatus);
        
        // Assigned to filter
        if (filters.assignedTo !== "all") query.append("assignedTo", filters.assignedTo);
        
        // Action type filter (for frontend filtering since backend doesn't have this param)
        // This will be handled in the filteredFollowUps logic
        
        // Search term (for frontend filtering)
        if (searchTerm.trim()) {
          query.append("search", searchTerm.trim());
        }

      const queryString = query.toString();
      const response = await fetch(queryString ? `/api/daily-followups?${queryString}` : '/api/daily-followups');
      const data = await response.json();

      if (response.ok) {
        setFollowUps(data.dailyFollowUps || []);
        setAnalytics(data.analytics || {});
        setInsights(data.insights || {});
      } else {
        console.error('Failed to fetch follow-ups:', data.error);
      }
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    } finally {
      setLoading(false);
      if (initial) {
        setIsInitialLoad(false);
      }
    }
  }, [filters, filterStatus, searchTerm]);

  useEffect(() => {
    // Initialize current user from localStorage or API
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setCurrentUser({ name: userData.name, email: userData.email, role: userData.role });
    }
    fetchFilterData();
  }, []);
  
  const fetchFilterData = async () => {
    try {
        const [usersRes, leadsRes, opportunitiesRes, companiesRes] = await Promise.all([
            fetch('/api/members'),
            fetch('/api/leads'),
            fetch('/api/opportunities'),
            fetch('/api/companies'),
        ]);
        const [usersData, leadsData, opportunitiesData, companiesData] = await Promise.all([
            safeJson(usersRes),
            safeJson(leadsRes),
            safeJson(opportunitiesRes),
            safeJson(companiesRes),
        ]);
        if (usersData?.members) {
            setUsers(usersData.members.map((member:any) => ({
                id: member.id?.toString() ?? '',
                name: member.name || member.email || `Member ${member.id}`
            })).filter((member: User) => member.id));
        } else if (usersData?.users) {
            setUsers(usersData.users.map((u:any) => ({id: u.id?.toString() ?? '', name: u.name || u.email || `User ${u.id}`})).filter((u: User) => u.id));
        }
        if (leadsData?.leads) {
            setLeads(leadsData.leads.map((l:any) => ({
                id: l.id?.toString() ?? '',
                name: l.name || l.companyName || `Lead ${l.id}`
            })).filter((lead: Lead) => lead.id));
        }
        if (opportunitiesData?.opportunities) {
            setOpportunities(opportunitiesData.opportunities.map((o:any) => ({
                id: o.id?.toString() ?? '',
                name: o.name || o.companies?.name || `Opportunity ${o.id}`
            })).filter((opp: Opportunity) => opp.id));
        }
        if (companiesData?.companies) {
            setCompanies(companiesData.companies.map((c:any) => ({
                id: c.id?.toString() ?? '',
                name: c.name || `Company ${c.id}`
            })).filter((company: Company) => company.id));
        }
    } catch (error) {
        console.error('Error fetching filter data:', error);
    }
  };
  
  const firstLoadRef = useRef(true);
  useEffect(() => {
    fetchFollowUps({ initial: firstLoadRef.current });
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
    }
  }, [fetchFollowUps]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Map frontend form data to API expected format
      const apiData: any = {
        assignedTo: currentUser?.name || "Unknown User",
        actionType: formData.followUpType,
        actionDescription: formData.description || "No description provided",
        followUpDate: formData.nextActionDate,
        notes: formData.notes || "",
        projectId: formData.projectId || undefined,
        salesDealId: formData.salesDealId || undefined,
        immediateSaleId: formData.immediateSaleId || undefined,
        timezone: "Asia/Kolkata",
        linkType: formData.linkType,
        priority: formData.priority,
        urgencyLevel: formData.priority
      };

      if (formData.linkType === 'LEAD' && formData.leadId) {
        apiData.leadId = formData.leadId;
      } else if (formData.linkType === 'OPPORTUNITY' && formData.opportunityId) {
        apiData.opportunityId = formData.opportunityId;
      }

      const response = await fetch('/api/daily-followups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (response.ok) {
        setShowForm(false);
        setFormData({
          projectId: "",
          immediateSaleId: "",
          salesDealId: "",
          followUpType: "CALL",
          description: "",
          nextAction: "",
          nextActionDate: "",
          priority: "MEDIUM",
          notes: "",
          linkType: "MISC",
          leadId: "",
          opportunityId: ""
        });
        fetchFollowUps();
      }
    } catch (error) {
      console.error('Error creating follow-up:', error);
    }
  };

  const filteredFollowUps = followUps.filter(followUp => {
    // Defensive programming: ensure fields exist and are strings before calling toLowerCase
    const description = followUp.actionDescription || '';
    const ownerName = followUp.users?.name || '';
    const notes = followUp.notes || '';

    // Search filter - search in description, owner name, and notes
    const matchesSearch = searchTerm === "" || 
                         description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notes.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Action type filter 
    const matchesActionType = filters.actionType === "all" || followUp.actionType === filters.actionType;
    
    // Legacy filter type support (keeping for backward compatibility)
    const matchesLegacyType = filterType === "all" || followUp.actionType === filterType;
    
    // Priority filter (frontend filtering)
    const matchesPriority = filters.priority === "all" || followUp.priority === filters.priority;
    
    // Date range filter (if custom date range is provided and not handled by backend period filter)
    let matchesDateRange = true;
    if (filters.startDate && filters.endDate && filters.period === "all") {
      const followUpDate = new Date(followUp.followUpDate || followUp.nextActionDate || '');
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      matchesDateRange = followUpDate >= startDate && followUpDate <= endDate;
    }
    
    return matchesSearch && matchesActionType && matchesLegacyType && matchesPriority && matchesDateRange;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-gradient-to-r from-red-500 to-pink-500 text-white';
      case 'HIGH': return 'bg-gradient-to-r from-orange-500 to-red-500 text-white';
      case 'MEDIUM': return 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white';
      case 'LOW': return 'bg-gradient-to-r from-green-400 to-emerald-500 text-white';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'SCHEDULED': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'POSTPONED': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'CANCELLED': return 'bg-gray-500/10 text-gray-600 border-gray-200';
      case 'OVERDUE': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return CheckCircle2;
      case 'SCHEDULED': return CalendarDays;
      case 'POSTPONED': return Timer;
      case 'CANCELLED': return XCircle;
      case 'OVERDUE': return AlertTriangle;
      default: return Clock;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'CALL': return PhoneCall;
      case 'MEETING': return Video;
      case 'SITE_VISIT': return MapPin;
      case 'EMAIL': return Mail;
      case 'MESSAGE': return MessageSquare;
      default: return Activity;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': 
      case 'HIGH': return AlertTriangle;
      case 'MEDIUM': return AlertCircle;
      case 'LOW': return CheckCircle;
      default: return Activity;
    }
  };

  // Calculate stats
  const calculateStats = () => {
    const total = followUps.length;
    const completed = followUps.filter(f => f.status === 'COMPLETED').length;
    const overdue = followUps.filter(f => f.isOverdue).length;
    const today = followUps.filter(f => f.isToday).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, overdue, today, completionRate };
  };

  const stats = calculateStats();

  // Fetch options when linkType changes
  useEffect(() => {
    const fetchLists = async () => {
      try {
        if (formData.linkType === 'LEAD') {
          const res = await fetch('/api/leads');
          const data = await res.json();
          if (res.ok) {
            setLeadOptions((data.leads || []).map((l: any) => ({ id: String(l.id), name: l.name })));
          }
        } else if (formData.linkType === 'OPPORTUNITY') {
          const res = await fetch('/api/opportunities');
          const data = await res.json();
          if (res.ok) {
            setOpportunityOptions((data.opportunities || []).map((o: any) => ({ id: String(o.id), name: o.name })));
          }
        }
      } catch (e) {
        console.error('Failed to fetch options', e);
      }
    };
    fetchLists();
  }, [formData.linkType]);

  if (isInitialLoad && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse" />
            </div>
            <Loader2 className="h-20 w-20 animate-spin text-white relative z-10" />
          </div>
          <p className="mt-4 text-lg font-medium text-gray-600 dark:text-gray-400">Loading follow-ups...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Preparing your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        {/* Enhanced Header Section */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl blur-3xl opacity-10" />
          <div className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                    <ListChecks className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Daily Follow-ups
                  </h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Track, manage, and optimize your daily activities
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowForm(true)} 
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Follow-up
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards with Gradients */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-0">All</Badge>
              </div>
              <p className="text-3xl font-bold mb-1">{stats.total}</p>
              <p className="text-sm text-white/80">Total Follow-ups</p>
              <div className="mt-3 flex items-center gap-1 text-xs">
                <TrendingUp className="h-3 w-3" />
                <span>Active tasks</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-0">{stats.completionRate}%</Badge>
              </div>
              <p className="text-3xl font-bold mb-1">{stats.completed}</p>
              <p className="text-sm text-white/80">Completed</p>
              <Progress value={stats.completionRate} className="mt-3 h-1.5 bg-white/30" />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <CalendarDays className="h-6 w-6 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-0">Today</Badge>
              </div>
              <p className="text-3xl font-bold mb-1">{stats.today}</p>
              <p className="text-sm text-white/80">Due Today</p>
              <div className="mt-3 flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                <span>Scheduled for today</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-red-500 to-pink-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-0">Alert</Badge>
              </div>
              <p className="text-3xl font-bold mb-1">{stats.overdue}</p>
              <p className="text-sm text-white/80">Overdue</p>
              <div className="mt-3 flex items-center gap-1 text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>Needs attention</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-0">Priority</Badge>
              </div>
              <p className="text-3xl font-bold mb-1">{followUps.filter(f => f.priority === 'HIGH' || f.priority === 'CRITICAL').length}</p>
              <p className="text-sm text-white/80">High Priority</p>
              <div className="mt-3 flex items-center gap-1 text-xs">
                <ArrowUpRight className="h-3 w-3" />
                <span>Urgent tasks</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Interface */}
        <Tabs defaultValue="overview" className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Search and Filters Section */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        placeholder="Search follow-ups, users, or descriptions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 h-12 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-12 px-4 border-gray-200 dark:border-gray-700">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </div>
                </div>

                {/* Enhanced Filter Pills */}
                <div className="mt-6 space-y-4">
                  {/* Primary Filters Row */}
                  <div className="flex flex-wrap gap-3">
                    {(currentUser?.role === 'admin' || currentUser?.role === 'SuperAdmin') && (
                      <Select value={filters.userId} onValueChange={(value) => setFilters({...filters, userId: value})}>
                        <SelectTrigger className="w-48 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                          <Users className="h-4 w-4 mr-2 text-indigo-500" />
                          <SelectValue placeholder="Filter by User" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          {users.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                                {user.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Select value={filters.actionType} onValueChange={(value) => setFilters({...filters, actionType: value})}>
                      <SelectTrigger className="w-48 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                        <Activity className="h-4 w-4 mr-2 text-blue-500" />
                        <SelectValue placeholder="Activity Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="CALL">
                          <div className="flex items-center gap-2">
                            <PhoneCall className="h-4 w-4 text-green-500" />
                            Phone Call
                          </div>
                        </SelectItem>
                        <SelectItem value="MEETING">
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-blue-500" />
                            Meeting
                          </div>
                        </SelectItem>
                        <SelectItem value="SITE_VISIT">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-purple-500" />
                            Site Visit
                          </div>
                        </SelectItem>
                        <SelectItem value="EMAIL">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-orange-500" />
                            Email
                          </div>
                        </SelectItem>
                        <SelectItem value="MESSAGE">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-pink-500" />
                            Message
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-48 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="SCHEDULED">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-blue-500" />
                            Scheduled
                          </div>
                        </SelectItem>
                        <SelectItem value="COMPLETED">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            Completed
                          </div>
                        </SelectItem>
                        <SelectItem value="POSTPONED">
                          <div className="flex items-center gap-2">
                            <Timer className="h-4 w-4 text-amber-500" />
                            Postponed
                          </div>
                        </SelectItem>
                        <SelectItem value="CANCELLED">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-gray-500" />
                            Cancelled
                          </div>
                        </SelectItem>
                        <SelectItem value="OVERDUE">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            Overdue
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filters.priority} onValueChange={(value) => setFilters({...filters, priority: value})}>
                      <SelectTrigger className="w-48 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                        <Star className="h-4 w-4 mr-2 text-yellow-500" />
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="CRITICAL">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            Critical
                          </div>
                        </SelectItem>
                        <SelectItem value="HIGH">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-500 rounded-full" />
                            High
                          </div>
                        </SelectItem>
                        <SelectItem value="MEDIUM">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                            Medium
                          </div>
                        </SelectItem>
                        <SelectItem value="LOW">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full" />
                            Low
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Secondary Filters Row */}
                  <div className="flex flex-wrap gap-3">
                    <Select value={filters.leadId} onValueChange={(value) => setFilters({...filters, leadId: value})}>
                      <SelectTrigger className="w-48 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                        <User className="h-4 w-4 mr-2 text-cyan-500" />
                        <SelectValue placeholder="Filter by Lead" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Leads</SelectItem>
                        {leads.map(lead => (
                          <SelectItem key={lead.id} value={lead.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                              {lead.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filters.opportunityId} onValueChange={(value) => setFilters({...filters, opportunityId: value})}>
                      <SelectTrigger className="w-48 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                        <Target className="h-4 w-4 mr-2 text-purple-500" />
                        <SelectValue placeholder="Filter by Opportunity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Opportunities</SelectItem>
                        {opportunities.map(opp => (
                          <SelectItem key={opp.id} value={opp.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full" />
                              {opp.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filters.companyId} onValueChange={(value) => setFilters({...filters, companyId: value})}>
                      <SelectTrigger className="w-48 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                        <Building className="h-4 w-4 mr-2 text-emerald-500" />
                        <SelectValue placeholder="Filter by Company" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Companies</SelectItem>
                        {companies.map(comp => (
                          <SelectItem key={comp.id} value={comp.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                              {comp.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filters.period} onValueChange={(value) => setFilters({...filters, period: value, startDate: "", endDate: ""})}>
                      <SelectTrigger className="w-48 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                        <Calendar className="h-4 w-4 mr-2 text-rose-500" />
                        <SelectValue placeholder="Time Period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="week">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-blue-500" />
                            This Week
                          </div>
                        </SelectItem>
                        <SelectItem value="month">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-green-500" />
                            This Month
                          </div>
                        </SelectItem>
                        <SelectItem value="year">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-purple-500" />
                            This Year
                          </div>
                        </SelectItem>
                        <SelectItem value="custom">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-orange-500" />
                            Custom Range
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Date Range Inputs (shown when custom is selected) */}
                  {filters.period === "custom" && (
                    <div className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex-1">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                          Start Date
                        </Label>
                        <Input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                          className="bg-white dark:bg-gray-900"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                          End Date
                        </Label>
                        <Input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                          className="bg-white dark:bg-gray-900"
                        />
                      </div>
                    </div>
                  )}

                  {/* Active Filters Display */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Active filters:</span>
                    {Object.entries(filters).map(([key, value]) => {
                      if (value && value !== "all" && value !== "") {
                        let displayValue = value;
                        let colorClass = "bg-gray-100 text-gray-800";
                        
                        // Get display names for filters
                        if (key === 'userId' && users.length > 0) {
                          const user = users.find(u => u.id === value);
                          displayValue = user ? user.name : value;
                          colorClass = "bg-indigo-100 text-indigo-800";
                        } else if (key === 'leadId' && leads.length > 0) {
                          const lead = leads.find(l => l.id === value);
                          displayValue = lead ? lead.name : value;
                          colorClass = "bg-cyan-100 text-cyan-800";
                        } else if (key === 'opportunityId' && opportunities.length > 0) {
                          const opp = opportunities.find(o => o.id === value);
                          displayValue = opp ? opp.name : value;
                          colorClass = "bg-purple-100 text-purple-800";
                        } else if (key === 'companyId' && companies.length > 0) {
                          const comp = companies.find(c => c.id === value);
                          displayValue = comp ? comp.name : value;
                          colorClass = "bg-emerald-100 text-emerald-800";
                        }
                        
                        return (
                          <Badge
                            key={key}
                            className={`${colorClass} text-xs px-2 py-1 cursor-pointer hover:opacity-75 transition-opacity`}
                            onClick={() => setFilters({...filters, [key]: key === 'period' ? 'all' : 'all'})}
                          >
                            {displayValue}
                            <XCircle className="h-3 w-3 ml-1" />
                          </Badge>
                        );
                      }
                      return null;
                    }).filter(Boolean)}
                    
                    {filterStatus !== "all" && (
                      <Badge
                        className="bg-green-100 text-green-800 text-xs px-2 py-1 cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={() => setFilterStatus("all")}
                      >
                        {filterStatus}
                        <XCircle className="h-3 w-3 ml-1" />
                      </Badge>
                    )}
                    
                    {(Object.values(filters).some(v => v !== "all" && v !== "") || filterStatus !== "all") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFilters({
                            userId: "all",
                            leadId: "all",
                            opportunityId: "all", 
                            companyId: "all",
                            period: "all",
                            startDate: "",
                            endDate: "",
                            assignedTo: "all",
                            priority: "all",
                            actionType: "all"
                          });
                          setFilterStatus("all");
                          setFilterType("all");
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {loading && !isInitialLoad && (
              <div className="flex items-center justify-center p-4">
                <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 rounded-lg px-4 py-2 shadow-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  <span className="text-sm font-medium">Updating results...</span>
                </div>
              </div>
            )}

            {/* Enhanced Follow-ups List */}
            <div className="grid gap-4">
              {filteredFollowUps.length === 0 ? (
                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80">
                  <CardContent className="p-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <ListChecks className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No follow-ups found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Try adjusting your filters or create a new follow-up</p>
                      </div>
                      <Button 
                        onClick={() => setShowForm(true)}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Follow-up
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredFollowUps.map((followUp) => {
                  const StatusIcon = getStatusIcon(followUp.status);
                  const ActionIcon = getActionIcon(followUp.actionType);
                  const PriorityIcon = getPriorityIcon(followUp.priority);
                  
                  return (
                    <Card 
                      key={followUp.id} 
                      className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <CardContent className="p-0 relative">
                        <div className="flex flex-col lg:flex-row">
                          {/* Status Sidebar */}
                          <div className={`w-full lg:w-2 ${followUp.status === 'COMPLETED' ? 'bg-green-500' : followUp.status === 'OVERDUE' ? 'bg-red-500' : 'bg-blue-500'}`} />
                          
                          {/* Main Content */}
                          <div className="flex-1 p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="p-2 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-lg">
                                    <ActionIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                      {followUp.actionDescription}
                                      {followUp.isOverdue && (
                                        <Tooltip
                                          position="top"
                                          content={
                                            <div className="text-xs leading-tight space-y-1">
                                              <p className="font-semibold text-red-100/90">
                                                Follow-up overdue by {Math.max(1, followUp.daysOverdue || 0)} day{Math.max(1, followUp.daysOverdue || 0) > 1 ? 's' : ''}
                                              </p>
                                              {followUp.followUpDate && (
                                                <p className="text-white/80">
                                                  Scheduled for {new Date(followUp.followUpDate).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                  })}
                                                </p>
                                              )}
                                              <p className="text-white/70">
                                                {followUp.overdueReason
                                                  ? `Reason: ${followUp.overdueReason}`
                                                  : 'Awaiting overdue reason'}
                                              </p>
                                            </div>
                                          }
                                        >
                                          <Badge className="bg-red-100 text-red-600 text-xs cursor-help">
                                            Overdue
                                          </Badge>
                                        </Tooltip>
                                      )}
                                      {followUp.isToday && (
                                        <Badge className="bg-blue-100 text-blue-600 text-xs">
                                          Today
                                        </Badge>
                                      )}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {followUp.notes || 'No additional notes'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Actions Menu */}
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Assigned to</p>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {followUp.users?.name || 'Unassigned'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm">
                                <CalendarDays className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {(followUp.followUpDate || followUp.nextActionDate)
                                      ? new Date(followUp.followUpDate || (followUp.nextActionDate as string)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                      : 'Not scheduled'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm">
                                <StatusIcon className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                                  <Badge className={`${getStatusColor(followUp.status)} border`}>
                                    {followUp.status}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm">
                                <PriorityIcon className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Priority</p>
                                  <Badge className={`${getPriorityColor(followUp.priority)} text-xs`}>
                                    {followUp.priority}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            {/* Linked Items */}
                            {(followUp as any).linkedName && (
                              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                                    <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Linked to
                                  </span>
                                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                    {(followUp as any).linkedType === 'LEAD' ? 'Lead' : 'Opportunity'}
                                  </Badge>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {(followUp as any).linkedName}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Smart Insights */}
                            {followUp.smartInsights && (
                              <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">AI Insights</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-xs">
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400">Timing</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{followUp.smartInsights.timingOptimization}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400">Effectiveness</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{followUp.smartInsights.effectiveness}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400">Risk Level</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{followUp.smartInsights.riskLevel}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80">
              <CardHeader>
                <CardTitle>Follow-up Timeline</CardTitle>
                <CardDescription>Visual timeline of all follow-up activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 to-purple-500" />
                  {filteredFollowUps.slice(0, 10).map((followUp, index) => {
                    const ActionIcon = getActionIcon(followUp.actionType);
                    return (
                      <div key={followUp.id} className="relative flex items-start gap-4 mb-8">
                        <div className="relative z-10">
                          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                            <ActionIcon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{followUp.actionDescription}</h4>
                            <Badge className={getStatusColor(followUp.status) + ' border'}>
                              {followUp.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{followUp.notes}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {followUp.users?.name || 'Unknown'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {followUp.followUpDate ? new Date(followUp.followUpDate).toLocaleDateString() : 'No date'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle>Activity Distribution</CardTitle>
                  <CardDescription>Breakdown by follow-up type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['CALL', 'MEETING', 'EMAIL', 'SITE_VISIT', 'MESSAGE'].map(type => {
                      const count = followUps.filter(f => f.actionType === type).length;
                      const percentage = followUps.length > 0 ? (count / followUps.length) * 100 : 0;
                      const Icon = getActionIcon(type);
                      return (
                        <div key={type} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium">{type}</span>
                            </div>
                            <span className="text-sm text-gray-500">{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle>Status Overview</CardTitle>
                  <CardDescription>Current status distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['COMPLETED', 'SCHEDULED', 'OVERDUE', 'POSTPONED', 'CANCELLED'].map(status => {
                      const count = followUps.filter(f => f.status === status).length;
                      const percentage = followUps.length > 0 ? (count / followUps.length) * 100 : 0;
                      const Icon = getStatusIcon(status);
                      return (
                        <div key={status} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium">{status}</span>
                            </div>
                            <span className="text-sm text-gray-500">{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Enhanced New Follow-up Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden border-0 shadow-2xl">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Plus className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Create New Follow-up</h2>
                      <p className="text-white/80 text-sm mt-1">Schedule and track your next activity</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setShowForm(false)}
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                  >
                    <XCircle className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Link Type Selection with Icons */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-semibold">
                        <Briefcase className="h-4 w-4 text-indigo-600" />
                        Link to Business Entity
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'MISC', label: 'General', icon: FileText },
                          { value: 'LEAD', label: 'Lead', icon: User },
                          { value: 'OPPORTUNITY', label: 'Opportunity', icon: Target }
                        ].map((type) => (
                          <Button
                            key={type.value}
                            type="button"
                            variant={formData.linkType === type.value ? "default" : "outline"}
                            className={formData.linkType === type.value ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white" : ""}
                            onClick={() => setFormData({ ...formData, linkType: type.value, leadId: '', opportunityId: '' })}
                          >
                            <type.icon className="h-4 w-4 mr-2" />
                            {type.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    {formData.linkType === 'LEAD' && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <Label className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-blue-600" />
                          Select Lead
                        </Label>
                        <Select value={formData.leadId} onValueChange={(value) => setFormData({ ...formData, leadId: value })}>
                          <SelectTrigger className="bg-white dark:bg-gray-900">
                            <SelectValue placeholder="Choose a lead to link" />
                          </SelectTrigger>
                          <SelectContent>
                            {leadOptions.map(l => (
                              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {formData.linkType === 'OPPORTUNITY' && (
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <Label className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-purple-600" />
                          Select Opportunity
                        </Label>
                        <Select value={formData.opportunityId} onValueChange={(value) => setFormData({ ...formData, opportunityId: value })}>
                          <SelectTrigger className="bg-white dark:bg-gray-900">
                            <SelectValue placeholder="Choose an opportunity to link" />
                          </SelectTrigger>
                          <SelectContent>
                            {opportunityOptions.map(o => (
                              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Activity Type and Priority */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-semibold">
                        <Activity className="h-4 w-4 text-indigo-600" />
                        Activity Type
                      </Label>
                      <Select value={formData.followUpType} onValueChange={(value) => setFormData({...formData, followUpType: value})}>
                        <SelectTrigger className="h-12 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CALL">
                            <div className="flex items-center gap-2">
                              <PhoneCall className="h-4 w-4" />
                              Phone Call
                            </div>
                          </SelectItem>
                          <SelectItem value="MEETING">
                            <div className="flex items-center gap-2">
                              <Video className="h-4 w-4" />
                              Meeting
                            </div>
                          </SelectItem>
                          <SelectItem value="SITE_VISIT">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Site Visit
                            </div>
                          </SelectItem>
                          <SelectItem value="EMAIL">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Email
                            </div>
                          </SelectItem>
                          <SelectItem value="MESSAGE">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Message
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-semibold">
                        <Star className="h-4 w-4 text-indigo-600" />
                        Priority Level
                      </Label>
                      <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                        <SelectTrigger className="h-12 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                              Low Priority
                            </div>
                          </SelectItem>
                          <SelectItem value="MEDIUM">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                              Medium Priority
                            </div>
                          </SelectItem>
                          <SelectItem value="HIGH">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full" />
                              High Priority
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Description Field */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      Description
                    </Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Brief description of the follow-up activity..."
                      className="h-12 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                      required
                    />
                  </div>
                  
                  {/* Next Action Field */}
                  <div className="space-y-2">
                    <Label htmlFor="nextAction" className="flex items-center gap-2 text-sm font-semibold">
                      <ArrowRight className="h-4 w-4 text-indigo-600" />
                      Next Action
                    </Label>
                    <Input
                      id="nextAction"
                      value={formData.nextAction}
                      onChange={(e) => setFormData({...formData, nextAction: e.target.value})}
                      placeholder="What needs to be done next?"
                      className="h-12 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                      required
                    />
                  </div>
                  
                  {/* Date Field */}
                  <div className="space-y-2">
                    <Label htmlFor="nextActionDate" className="flex items-center gap-2 text-sm font-semibold">
                      <CalendarDays className="h-4 w-4 text-indigo-600" />
                      Follow-up Date
                    </Label>
                    <Input
                      id="nextActionDate"
                      type="date"
                      value={formData.nextActionDate}
                      onChange={(e) => setFormData({...formData, nextActionDate: e.target.value})}
                      className="h-12 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                      required
                    />
                  </div>
                  
                  {/* Notes Field */}
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="flex items-center gap-2 text-sm font-semibold">
                      <MessageSquare className="h-4 w-4 text-indigo-600" />
                      Additional Notes
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Add any additional context, requirements, or important information..."
                      className="min-h-[100px] bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                      rows={4}
                    />
                  </div>
                  
                  {/* Form Actions */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowForm(false)}
                      className="px-6"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Create Follow-up
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
