"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  Search,
  Calendar,
  Activity,
  Briefcase,
  Clock,
  CheckCircle,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Loader2,
  Crown,
  Star,
  Eye,
  BarChart3,
  Target,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  FileText
} from "lucide-react";
import Image from "next/image";

interface Member {
  id: number;
  name: string;
  email: string;
  employeeCode: string;
  role: string;
  department?: string;
  avatar?: string;
  avatarThumbnail?: string;
  avatarMedium?: string;
  phone?: string;
  location?: string;
  bio?: string;
  createdAt: string;
  verified: boolean;
  _count: {
    activities: number;
    attendances_attendances_userIdTousers: number;
    leads: number;
    opportunities: number;
    projects_projects_ownerIdTousers: number;
    sales_deals: number;
    daily_follow_ups: number;
    pending_quotations: number;
  };
}

interface Activity {
  id: number;
  type: string;
  subject: string;
  description?: string;
  occurredAt: string;
  duration?: number;
  leads?: {
    id: number;
    name: string;
    company: string;
    status: string;
  };
}

interface Attendance {
  id: number;
  date: string;
  visitReport?: string;
  status: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
  users_attendances_reviewerIdTousers?: {
    name: string;
    email: string;
  };
}

interface Task {
  id: number;
  actionType: string;
  actionDescription: string;
  status: string;
  followUpDate: string;
  notes?: string;
  users: {
    name: string;
    email: string;
  };
}

interface Lead {
  id: number;
  name: string;
  company: string;
  status: string;
  source: string;
  email?: string;
  phone?: string;
  createdDate: string;
  _count: {
    activities: number;
    daily_follow_ups: number;
    opportunities: number;
  };
}

interface Opportunity {
  id: number;
  name: string;
  stage: string;
  dealSize: number;
  probability: number;
  expectedCloseDate?: string;
  createdDate: string;
  leadId?: number;
  companies?: {
    id: number;
    name: string;
    region: string;
  };
}

interface Project {
  id: number;
  name: string;
  province: string;
  status: string;
  sizeClass?: string;
  approxMT?: number;
  projectHealth: string;
  createdAt: string;
  _count: {
    daily_follow_ups: number;
    sales_deals: number;
    pending_quotations: number;
  };
}

interface SalesDeal {
  id: number;
  name: string;
  currentStatus: string;
  orderValue?: number;
  expectedCloseDate?: string;
  contractor?: string;
  province?: string;
  createdAt: string;
  projects?: {
    id: number;
    name: string;
  };
}

interface ImmediateSale {
  id: number;
  contractor?: string;
  sizeClass?: string;
  valueOfOrder: number;
  status: string;
  quotationDate?: string;
  createdAt: string;
  projects?: {
    id: number;
    name: string;
  };
}

interface PendingQuotation {
  id: number;
  projectOrClientName: string;
  orderValue?: number;
  status: string;
  quotationDeadline?: string;
  urgencyLevel: string;
  createdAt: string;
  projects?: {
    id: number;
    name: string;
  };
}

interface MemberDetail {
  member: Member;
  workToday: {
    activities: Activity[];
    attendance: Attendance | null;
  };
  workHistory: Activity[];
  createdFollowUps: Task[];
  assignedTasks: Task[];
  recentAttendance: Attendance[];
  userLeads: Lead[];
  userOpportunities: Opportunity[];
  userProjects: Project[];
  userSalesDeals: SalesDeal[];
  userImmediateSales: ImmediateSale[];
  userPendingQuotations: PendingQuotation[];
  performanceMetrics: {
    totalActivities: number;
    completedTasks: number;
    attendanceRate: number;
    activeProjects: number;
    activeOpportunities: number;
    totalLeads: number;
    pendingQuotations: number;
    totalSalesDeals: number;
    totalImmediateSales: number;
    totalCreatedFollowUps: number;
  };
  isAdminView: boolean;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Fetch members list
  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (departmentFilter && departmentFilter !== "all") params.append("department", departmentFilter);
      if (roleFilter && roleFilter !== "all") params.append("role", roleFilter);

      const response = await fetch(`/api/members?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setMembers(data.members);
        setDepartments(data.departments);
      } else {
        console.error("Failed to fetch members:", data.error);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch member details
  const fetchMemberDetail = async (memberId: number) => {
    setIsLoadingDetail(true);
    try {
      const response = await fetch(`/api/members/${memberId}`);
      const data = await response.json();

      if (response.ok) {
        setSelectedMember(data);
      } else {
        console.error("Failed to fetch member details:", data.error);
      }
    } catch (error) {
      console.error("Error fetching member details:", error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, departmentFilter, roleFilter]);

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
      case 'superadmin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
      case 'superadmin':
        return Crown;
      case 'manager':
        return Star;
      default:
        return User;
    }
  };

  if (selectedMember) {
    return <MemberDetailView memberDetail={selectedMember} onBack={() => setSelectedMember(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
      <div className="container mx-auto p-6 max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Members</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">View and manage team members, their activities, and performance</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search members by name, email, or employee code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="SuperAdmin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600 dark:text-gray-400">Loading members...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member) => {
              const RoleIcon = getRoleIcon(member.role);
              return (
                <Card
                  key={member.id}
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
                  onClick={() => fetchMemberDetail(member.id)}
                >
                  <CardContent className="p-6">
                    <div className="text-center mb-4">
                      <div className="relative inline-block mb-4 group/avatar">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg overflow-hidden">
                          {member.avatar ? (
                            <Image
                              src={member.avatarThumbnail || member.avatar}
                              alt={member.name}
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="h-10 w-10 text-white" />
                          )}
                        </div>
                        {member.verified && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{member.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{member.employeeCode}</p>
                      <Badge className={`${getRoleColor(member.role)} mb-3`}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {member.role}
                      </Badge>
                      {member.department && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">{member.department}</p>
                      )}
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="text-center p-3 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                        <Activity className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                        <div className="text-sm font-semibold text-blue-600">{member._count?.activities || 0}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Activities</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                        <CheckCircle className="h-4 w-4 text-green-600 mx-auto mb-1" />
                        <div className="text-sm font-semibold text-green-600">{member._count?.attendances_attendances_userIdTousers || 0}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Attendance</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center text-blue-600 group-hover:text-blue-700 transition-colors">
                      <Eye className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">View Details</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {members.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No members found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || departmentFilter || roleFilter
                ? "Try adjusting your search or filters"
                : "No team members available"
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Member Detail View Component
function MemberDetailView({ memberDetail, onBack }: { memberDetail: MemberDetail; onBack: () => void }) {
  const {
    member,
    workToday,
    workHistory,
    createdFollowUps,
    assignedTasks,
    recentAttendance,
    userLeads,
    userOpportunities,
    userProjects,
    userSalesDeals,
    userImmediateSales,
    userPendingQuotations,
    performanceMetrics
  } = memberDetail;

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
      case 'superadmin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'call': return Phone;
      case 'visit': return MapPin;
      case 'meeting': return Users;
      case 'email': return Mail;
      case 'demo': return Activity;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'call': return 'bg-blue-100 text-blue-800';
      case 'visit': return 'bg-green-100 text-green-800';
      case 'meeting': return 'bg-purple-100 text-purple-800';
      case 'email': return 'bg-orange-100 text-orange-800';
      case 'demo': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
      <div className="container mx-auto p-6 max-w-7xl">

        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Members
          </Button>
        </div>

        {/* Member Header */}
        <Card className="mb-6 shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl overflow-hidden">
                  {member.avatar ? (
                    <Image
                      src={member.avatarMedium || member.avatar}
                      alt={member.name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-white" />
                  )}
                </div>
                {member.verified && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{member.name}</h1>
                  <Badge className={getRoleColor(member.role)}>
                    <Crown className="h-4 w-4 mr-1" />
                    {member.role}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {member.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {member.employeeCode}
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {member.phone}
                    </div>
                  )}
                  {member.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {member.location}
                    </div>
                  )}
                  {member.department && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {member.department}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{performanceMetrics.totalActivities}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Activities</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{performanceMetrics.completedTasks}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tasks Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{performanceMetrics.attendanceRate}%</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{performanceMetrics.activeProjects}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 p-1 shadow-lg">
            <TabsTrigger value="overview" className="flex items-center gap-2 text-xs">
              <User className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="flex items-center gap-2 text-xs">
              <TrendingUp className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2 text-xs">
              <Briefcase className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 text-xs">
              <BarChart3 className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2 text-xs">
              <DollarSign className="h-4 w-4" />
              Sales
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2 text-xs">
              <Target className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2 text-xs">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Activities */}
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Today's Activities
                  </CardTitle>
                  <CardDescription>Activities completed today</CardDescription>
                </CardHeader>
                <CardContent>
                  {workToday.activities.length > 0 ? (
                    <div className="space-y-4">
                      {workToday.activities.map((activity) => {
                        const IconComponent = getActivityIcon(activity.type);
                        return (
                          <div key={activity.id} className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">{activity.subject}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {new Date(activity.occurredAt).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No activities recorded today</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Today's Attendance */}
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    Today's Attendance
                  </CardTitle>
                  <CardDescription>Attendance status for today</CardDescription>
                </CardHeader>
                <CardContent>
                  {workToday.attendance ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          workToday.attendance.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                          workToday.attendance.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-600' :
                          workToday.attendance.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white capitalize">{workToday.attendance.status.toLowerCase()}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(workToday.attendance.submittedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      {workToday.attendance.visitReport && (
                        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{workToday.attendance.visitReport}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No attendance recorded today</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  Performance Overview
                </CardTitle>
                <CardDescription>Key performance indicators for this user</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                    <Activity className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">{performanceMetrics.totalActivities}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Activities</div>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                    <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">{performanceMetrics.totalLeads}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Leads Created</div>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                    <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-600">{performanceMetrics.activeOpportunities}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Opportunities</div>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
                    <Briefcase className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-orange-600">{performanceMetrics.activeProjects}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Projects</div>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
                    <DollarSign className="h-6 w-6 text-red-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-600">{performanceMetrics.totalSalesDeals}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Sales Deals</div>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-gradient-to-r from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20">
                    <Target className="h-6 w-6 text-teal-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-teal-600">{performanceMetrics.totalCreatedFollowUps}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Follow-ups Created</div>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20">
                    <CheckCircle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-600">{performanceMetrics.completedTasks}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Tasks Completed</div>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20">
                    <Calendar className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-indigo-600">{performanceMetrics.attendanceRate}%</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Work History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Work History
                </CardTitle>
                <CardDescription>Complete activity history for this user</CardDescription>
              </CardHeader>
              <CardContent>
                {workHistory.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {workHistory.map((activity) => {
                      const IconComponent = getActivityIcon(activity.type);
                      return (
                        <div key={activity.id} className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{activity.subject}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                              <span>{new Date(activity.occurredAt).toLocaleDateString()}</span>
                              <span>{new Date(activity.occurredAt).toLocaleTimeString()}</span>
                              {activity.duration && <span>{activity.duration} min</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No work history available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assigned Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Assigned Tasks
                </CardTitle>
                <CardDescription>Current tasks and follow-ups assigned</CardDescription>
              </CardHeader>
              <CardContent>
                {assignedTasks.length > 0 ? (
                  <div className="space-y-4">
                    {assignedTasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
                        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                          <Target className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{task.actionDescription}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{task.notes}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                            <span>Due: {new Date(task.followUpDate).toLocaleDateString()}</span>
                            <Badge variant="outline" className="text-xs">{task.status}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No assigned tasks</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  Recent Attendance
                </CardTitle>
                <CardDescription>Attendance records for the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {recentAttendance.length > 0 ? (
                  <div className="space-y-4">
                    {recentAttendance.map((attendance) => (
                      <div key={attendance.id} className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          attendance.status === 'APPROVED' ? 'bg-green-500' :
                          attendance.status === 'SUBMITTED' ? 'bg-yellow-500' :
                          attendance.status === 'REJECTED' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}>
                          <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {new Date(attendance.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            <Badge variant="outline" className={`text-xs ${
                              attendance.status === 'APPROVED' ? 'border-green-500 text-green-700' :
                              attendance.status === 'SUBMITTED' ? 'border-yellow-500 text-yellow-700' :
                              attendance.status === 'REJECTED' ? 'border-red-500 text-red-700' :
                              'border-gray-500 text-gray-700'
                            }`}>
                              {attendance.status}
                            </Badge>
                          </div>
                          {attendance.visitReport && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{attendance.visitReport}</p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Submitted: {new Date(attendance.submittedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No attendance records found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pipeline Tab */}
          <TabsContent value="pipeline" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Leads Created */}
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Leads Created ({userLeads.length})
                  </CardTitle>
                  <CardDescription>Leads created by this user</CardDescription>
                </CardHeader>
                <CardContent>
                  {userLeads.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {userLeads.map((lead) => (
                        <div key={lead.id} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                            <Users className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{lead.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{lead.status}</Badge>
                              <span className="text-xs text-gray-500">{lead.source}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {lead._count.activities} activities • {lead._count.opportunities} opportunities
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No leads created</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Opportunities Managed */}
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Opportunities ({userOpportunities.length})
                  </CardTitle>
                  <CardDescription>Opportunities managed by this user</CardDescription>
                </CardHeader>
                <CardContent>
                  {userOpportunities.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {userOpportunities.map((opportunity) => (
                        <div key={opportunity.id} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{opportunity.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {opportunity.leadId ? `Lead ID: ${opportunity.leadId}` : 'No lead assigned'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{opportunity.stage}</Badge>
                              <span className="text-xs text-gray-500">{opportunity.probability}% probability</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Value: ${opportunity.dealSize.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No opportunities managed</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-purple-600" />
                  Projects Created ({userProjects.length})
                </CardTitle>
                <CardDescription>Projects created and managed by this user</CardDescription>
              </CardHeader>
              <CardContent>
                {userProjects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userProjects.map((project) => (
                      <div key={project.id} className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                            <Briefcase className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{project.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{project.province}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className={`text-xs ${
                                project.status === 'COMPLETED' ? 'border-green-500 text-green-700' :
                                project.status === 'ONGOING' ? 'border-blue-500 text-blue-700' :
                                'border-gray-500 text-gray-700'
                              }`}>
                                {project.status}
                              </Badge>
                              <span className="text-xs text-gray-500">{project.projectHealth}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                              <span>{project._count.daily_follow_ups} follow-ups</span>
                              <span>{project._count.sales_deals} deals</span>
                              <span>{project._count.pending_quotations} quotations</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No projects created</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Deals */}
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Sales Deals ({userSalesDeals.length})
                  </CardTitle>
                  <CardDescription>Sales deals created by this user</CardDescription>
                </CardHeader>
                <CardContent>
                  {userSalesDeals.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {userSalesDeals.map((deal) => (
                        <div key={deal.id} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{deal.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {deal.projects ? deal.projects.name : 'No project'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{deal.currentStatus}</Badge>
                              {deal.contractor && <span className="text-xs text-gray-500">{deal.contractor}</span>}
                            </div>
                            {deal.orderValue && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Value: ${deal.orderValue.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No sales deals created</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Immediate Sales */}
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                    Immediate Sales ({userImmediateSales.length})
                  </CardTitle>
                  <CardDescription>Immediate sales created by this user</CardDescription>
                </CardHeader>
                <CardContent>
                  {userImmediateSales.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {userImmediateSales.map((sale) => (
                        <div key={sale.id} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-800">
                          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {sale.contractor || 'Unknown Contractor'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {sale.projects ? sale.projects.name : 'No project'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{sale.status}</Badge>
                              {sale.sizeClass && <span className="text-xs text-gray-500">{sale.sizeClass}</span>}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Value: ${sale.valueOfOrder.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No immediate sales created</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Pending Quotations */}
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Pending Quotations ({userPendingQuotations.length})
                </CardTitle>
                <CardDescription>Quotations created by this user</CardDescription>
              </CardHeader>
              <CardContent>
                {userPendingQuotations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userPendingQuotations.map((quotation) => (
                      <div key={quotation.id} className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{quotation.projectOrClientName}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {quotation.projects ? quotation.projects.name : 'No project'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={`text-xs ${
                                quotation.status === 'PENDING' ? 'border-yellow-500 text-yellow-700' :
                                quotation.status === 'SENT' ? 'border-blue-500 text-blue-700' :
                                quotation.status === 'ACCEPTED' ? 'border-green-500 text-green-700' :
                                'border-red-500 text-red-700'
                              }`}>
                                {quotation.status}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">{quotation.urgencyLevel}</Badge>
                            </div>
                            {quotation.orderValue && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Value: ${quotation.orderValue.toLocaleString()}
                              </p>
                            )}
                            {quotation.quotationDeadline && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Deadline: {new Date(quotation.quotationDeadline).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No pending quotations</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Created Follow-ups */}
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Created Follow-ups ({createdFollowUps.length})
                  </CardTitle>
                  <CardDescription>Follow-ups created by this user</CardDescription>
                </CardHeader>
                <CardContent>
                  {createdFollowUps.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {createdFollowUps.map((followUp) => (
                        <div key={followUp.id} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
                          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                            <Target className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{followUp.actionDescription}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{followUp.notes}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{followUp.status}</Badge>
                              <span className="text-xs text-gray-500">{followUp.actionType}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Due: {new Date(followUp.followUpDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No follow-ups created</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assigned Tasks */}
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Assigned Tasks ({assignedTasks.length})
                  </CardTitle>
                  <CardDescription>Tasks assigned to this user</CardDescription>
                </CardHeader>
                <CardContent>
                  {assignedTasks.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {assignedTasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{task.actionDescription}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{task.notes}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{task.status}</Badge>
                              <span className="text-xs text-gray-500">{task.actionType}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Due: {new Date(task.followUpDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No assigned tasks</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Work History */}
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Work History
                  </CardTitle>
                  <CardDescription>Recent activities performed by this user</CardDescription>
                </CardHeader>
                <CardContent>
                  {workHistory.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {workHistory.slice(0, 10).map((activity) => {
                        const IconComponent = getActivityIcon(activity.type);
                        return (
                          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">{activity.subject}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {new Date(activity.occurredAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No work history available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Attendance */}
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    Recent Attendance
                  </CardTitle>
                  <CardDescription>Attendance records for the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentAttendance.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {recentAttendance.slice(0, 10).map((attendance) => (
                        <div key={attendance.id} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            attendance.status === 'APPROVED' ? 'bg-green-500' :
                            attendance.status === 'SUBMITTED' ? 'bg-yellow-500' :
                            attendance.status === 'REJECTED' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}>
                            <Calendar className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {new Date(attendance.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                              <Badge variant="outline" className={`text-xs ${
                                attendance.status === 'APPROVED' ? 'border-green-500 text-green-700' :
                                attendance.status === 'SUBMITTED' ? 'border-yellow-500 text-yellow-700' :
                                attendance.status === 'REJECTED' ? 'border-red-500 text-red-700' :
                                'border-gray-500 text-gray-700'
                              }`}>
                                {attendance.status}
                              </Badge>
                            </div>
                            {attendance.visitReport && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">{attendance.visitReport}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No attendance records found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
