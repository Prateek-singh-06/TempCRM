"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Clock,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  Camera,
  Bell,
  Send,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Timer,
  Award,
  Target,
} from "lucide-react";

interface AttendanceRecord {
  id: string | number;
  userId: string | number;
  date: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PENDING';
  submittedAt: string;
  submittedAtUTC?: string;
  visitReport?: string;
  location?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  selfieUrl?: string;
  user: {
    name: string;
    email: string;
    employeeCode?: string;
    role: string;
  };
  reviewedAt?: string;
  reviewNotes?: string;
}

interface AttendanceStats {
  total: number;
  submitted: number;
  approved: number;
  rejected: number;
  pending: number;
  missing: number;
  onTime: number;
  late: number;
  attendanceRate: number;
  trends: Array<{
    date: string;
    submitted: number;
    approved: number;
    rate: number;
  }>;
}

interface TeamMemberAttendance {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'present' | 'absent' | 'late' | 'pending';
  submittedAt?: string;
  location?: string;
  visitReport?: string;
  attendanceRate: number;
  streak: number;
  lastSubmission?: string;
}

interface HistoricalAttendanceDay {
  date: string;
  records: AttendanceRecord[];
}

interface MemberSummary {
  id: number | string;
  name: string;
  email?: string;
  role: string;
}

interface AttendanceApiResponse {
  attendance?: unknown;
}

interface MembersApiResponse {
  members?: unknown;
}

const HISTORY_DAYS = 6;
const PRESENT_STATUSES = new Set(['APPROVED', 'SUBMITTED', 'PENDING']);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNumberOrString = (value: unknown): value is number | string =>
  typeof value === 'number' || typeof value === 'string';

const parseAttendanceRecords = (payload: unknown): AttendanceRecord[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.reduce<AttendanceRecord[]>((acc, candidate) => {
    if (!isObject(candidate)) {
      return acc;
    }

    const { id, userId, date, status, submittedAt } = candidate;
    if (!isNumberOrString(id) || !isNumberOrString(userId)) {
      return acc;
    }

    if (typeof date !== 'string' || typeof status !== 'string' || typeof submittedAt !== 'string') {
      return acc;
    }

    if (!['SUBMITTED', 'APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return acc;
    }

    const userData = isObject(candidate.user) ? candidate.user : {};
    const locationData = isObject(candidate.location) ? candidate.location : undefined;

    const record: AttendanceRecord = {
      id,
      userId,
      date,
      status: status as AttendanceRecord['status'],
      submittedAt,
      submittedAtUTC: typeof candidate.submittedAtUTC === 'string' ? candidate.submittedAtUTC : undefined,
      visitReport: typeof candidate.visitReport === 'string' ? candidate.visitReport : undefined,
      location:
        locationData &&
        typeof locationData.lat === 'number' &&
        typeof locationData.lng === 'number' &&
        typeof locationData.accuracy === 'number'
          ? {
              lat: locationData.lat,
              lng: locationData.lng,
              accuracy: locationData.accuracy,
            }
          : undefined,
      selfieUrl: typeof candidate.selfieUrl === 'string' ? candidate.selfieUrl : undefined,
      user: {
        name: typeof userData.name === 'string' ? userData.name : 'Unknown',
        email: typeof userData.email === 'string' ? userData.email : '',
        employeeCode: typeof userData.employeeCode === 'string' ? userData.employeeCode : undefined,
        role: typeof userData.role === 'string' ? userData.role : 'Member',
      },
      reviewedAt: typeof candidate.reviewedAt === 'string' ? candidate.reviewedAt : undefined,
      reviewNotes: typeof candidate.reviewNotes === 'string' ? candidate.reviewNotes : undefined,
    };

    acc.push(record);
    return acc;
  }, []);
};

const parseMembers = (payload: unknown): MemberSummary[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.reduce<MemberSummary[]>((acc, candidate) => {
    if (!isObject(candidate)) {
      return acc;
    }

    const { id, role, name, email } = candidate;
    if (!isNumberOrString(id) || typeof role !== 'string' || typeof name !== 'string') {
      return acc;
    }

    acc.push({
      id,
      role,
      name,
      email: typeof email === 'string' ? email : undefined,
    });
    return acc;
  }, []);
};

export default function AttendanceMonitoringSystem({ metrics }: { metrics: unknown }) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [teamAttendance, setTeamAttendance] = useState<TeamMemberAttendance[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  const fetchAttendanceData = useCallback(async ({ withLoader = true }: { withLoader?: boolean } = {}) => {
    if (withLoader) {
      setLoading(true);
    }

    const safeFetchJson = async (url: string): Promise<unknown | null> => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Attendance monitor: ${url} responded with ${response.status}`);
          return null;
        }
        return await response.json();
      } catch (error) {
        console.error(`Attendance monitor: failed to fetch ${url}`, error);
        return null;
      }
    };

    try {
      const [attendanceData, membersData] = await Promise.all([
        safeFetchJson(`/api/attendance?date=${selectedDate}`),
        safeFetchJson('/api/members'),
      ]);

      const attendancePayload = (attendanceData ?? {}) as AttendanceApiResponse;
      const membersPayload = (membersData ?? {}) as MembersApiResponse;

      const records = parseAttendanceRecords(attendancePayload.attendance);
      const members = parseMembers(membersPayload.members).filter(
        (member) => !['admin', 'Admin', 'SuperAdmin', 'superadmin'].includes(member.role)
      );

      const historyDays = await buildHistoricalAttendance(selectedDate, safeFetchJson);
      const history: HistoricalAttendanceDay[] = [
        { date: selectedDate, records },
        ...historyDays,
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setAttendanceRecords(records);

      const stats = processAttendanceStats(records, members, history);
      setAttendanceStats(stats);

      const teamOverview = processTeamAttendance(members, history, selectedDate);
      setTeamAttendance(teamOverview);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      if (withLoader) {
        setLoading(false);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData, metrics]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAttendanceData({ withLoader: false });
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchAttendanceData]);

  const buildHistoricalAttendance = async (
    baseDateIso: string,
    safeFetchJson: (url: string) => Promise<unknown | null>
  ): Promise<HistoricalAttendanceDay[]> => {
    const base = new Date(`${baseDateIso}T00:00:00`);
    if (Number.isNaN(base.getTime())) {
      return [];
    }

    const historyDates: string[] = [];
    for (let offset = 1; offset <= HISTORY_DAYS; offset += 1) {
      const day = new Date(base);
      day.setDate(day.getDate() - offset);
      historyDates.push(day.toISOString().split('T')[0]);
    }

    const responses = await Promise.all(
      historyDates.map((date) => safeFetchJson(`/api/attendance?date=${date}`))
    );

    return historyDates.map((date, index) => {
      const data = responses[index];
      const records: AttendanceRecord[] = (isObject(data) && Array.isArray(data.attendance)) ? data.attendance : [];
      return { date, records };
    });
  };

  const processAttendanceStats = (
    records: AttendanceRecord[],
    members: any[],
    history: HistoricalAttendanceDay[],
  ): AttendanceStats => {
    const total = members.length;
    const submitted = records.length;
    const approved = records.filter((r) => r.status === 'APPROVED').length;
    const rejected = records.filter((r) => r.status === 'REJECTED').length;
    const pending = records.filter((r) => r.status === 'SUBMITTED' || r.status === 'PENDING').length;
    const missing = Math.max(total - submitted, 0);

    const onTime = records.filter((r) => {
      const submittedAt = r.submittedAt || (r as any).submittedAtUTC;
      if (!submittedAt) return false;
      const submitTime = new Date(submittedAt);
      // Convert UTC time to IST (India Standard Time = UTC+5:30)
      const istHours = (submitTime.getUTCHours() + 5.5) % 24;
      return Number.isFinite(submitTime.getTime()) && Math.floor(istHours) < 10;
    }).length;
    const late = Math.max(submitted - onTime, 0);

    const attendanceRate = total > 0 ? (submitted / total) * 100 : 0;

    const trends = generateAttendanceTrends(history, total);

    return {
      total,
      submitted,
      approved,
      rejected,
      pending,
      missing,
      onTime,
      late,
      attendanceRate,
      trends,
    };
  };

  const processTeamAttendance = (
    members: any[],
    history: HistoricalAttendanceDay[],
    currentDate: string,
  ): TeamMemberAttendance[] => {
    const todayRecords = history.find((day) => day.date === currentDate)?.records ?? [];
    const historyByUser = new Map<string, Map<string, AttendanceRecord>>();

    history.forEach((day) => {
      day.records.forEach((record) => {
        const rawId = record.userId;
        if (rawId === undefined || rawId === null) {
          return;
        }
        const recordUserId = String(rawId);
        if (!historyByUser.has(recordUserId)) {
          historyByUser.set(recordUserId, new Map());
        }
        const userHistory = historyByUser.get(recordUserId)!;
        if (!userHistory.has(day.date)) {
          userHistory.set(day.date, record);
        }
      });
    });

    const sortedHistoryDates = [...history]
      .map((day) => day.date)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const team = members.map((member: any): TeamMemberAttendance | null => {
      const rawMemberId = member.id;
      if (rawMemberId === undefined || rawMemberId === null) {
        return null;
      }
      const memberId = String(rawMemberId);
      const record = todayRecords.find((r) => String(r.userId) === memberId);

      let status: 'present' | 'absent' | 'late' | 'pending' = 'absent';
      if (record) {
        const submittedAt = record.submittedAt || (record as any).submittedAtUTC;
        if (record.status === 'APPROVED' && submittedAt) {
          const submitTime = new Date(submittedAt);
          // Convert UTC time to IST (India Standard Time = UTC+5:30)
          const istHours = (submitTime.getUTCHours() + 5.5) % 24;
          status = Math.floor(istHours) < 10 ? 'present' : 'late';
        } else if (record.status && PRESENT_STATUSES.has(record.status)) {
          status = 'pending';
        } else if (record.status === 'REJECTED') {
          status = 'absent';
        }
      }

      const userHistory = historyByUser.get(memberId) ?? new Map<string, AttendanceRecord>();
      const totalHistoryDays = history.length;
      let presentDays = 0;
      userHistory.forEach((dayRecord) => {
        if (PRESENT_STATUSES.has(dayRecord.status)) {
          presentDays += 1;
        }
      });
      const attendanceRate = totalHistoryDays > 0 ? (presentDays / totalHistoryDays) * 100 : 0;

      let streak = 0;
      for (const date of sortedHistoryDates) {
        const dayRecord = userHistory.get(date);
        if (dayRecord && PRESENT_STATUSES.has(dayRecord.status)) {
          streak += 1;
        } else {
          break;
        }
      }

      const submittedAt = record?.submittedAt || (record as any)?.submittedAtUTC;
      const location = record?.location
        ? `${Number(record.location.lat).toFixed(4)}, ${Number(record.location.lng).toFixed(4)}`
        : undefined;

      return {
        id: memberId,
        name: member.name,
        email: member.email,
        role: member.role,
        status,
        submittedAt,
        location,
        visitReport: record?.visitReport,
        attendanceRate,
        streak,
        lastSubmission: submittedAt,
      };
    }).filter((entry): entry is TeamMemberAttendance => entry !== null)
      .sort((a, b) => {
        if (a.status === b.status) {
          return b.attendanceRate - a.attendanceRate;
        }
        const order: Record<typeof a.status, number> = {
          present: 0,
          late: 1,
          pending: 2,
          absent: 3,
        };
        return order[a.status] - order[b.status];
      });

    return team;
  };

  const generateAttendanceTrends = (
    history: HistoricalAttendanceDay[],
    totalMembers: number,
  ): AttendanceStats['trends'] => {
    const recentHistory = history.slice(-7);
    return recentHistory.map((day) => {
      const approved = day.records.filter((record) => record.status === 'APPROVED').length;
      const submitted = day.records.length;
      const rate = totalMembers > 0 ? (submitted / totalMembers) * 100 : 0;
      const formattedDate = new Date(`${day.date}T00:00:00`).toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      return {
        date: formattedDate,
        submitted,
        approved,
        rate,
      };
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'late': return 'bg-yellow-500';
      case 'pending': return 'bg-blue-500';
      case 'absent': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4" />;
      case 'late': return <Clock className="h-4 w-4" />;
      case 'pending': return <Timer className="h-4 w-4" />;
      case 'absent': return <XCircle className="h-4 w-4" />;
      default: return <UserX className="h-4 w-4" />;
    }
  };

  const sendReminder = async (memberIds: string[]) => {
    try {
      await fetch('/api/attendance/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: memberIds }),
      });
      // Show success notification
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  if (loading || !attendanceStats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Users className="h-8 w-8 animate-pulse text-blue-500" />
          <p className="text-sm text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Attendance Monitoring</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time team attendance tracking and analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchAttendanceData()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => sendReminder(teamAttendance.filter(m => m.status === 'absent').map(m => m.id))}
          >
            <Send className="h-4 w-4 mr-1" />
            Send Reminders
          </Button>
        </div>
      </div>

      {/* Attendance Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              Present
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{attendanceStats.submitted}</div>
            <p className="text-xs text-gray-600 mt-1">
              {attendanceStats.onTime} on-time, {attendanceStats.late} late
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserX className="h-4 w-4 text-red-600" />
              Absent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{attendanceStats.missing}</div>
            <p className="text-xs text-gray-600 mt-1">Not checked in</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Timer className="h-4 w-4 text-blue-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{attendanceStats.pending}</div>
            <p className="text-xs text-gray-600 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {attendanceStats.attendanceRate.toFixed(1)}%
            </div>
            <Progress value={attendanceStats.attendanceRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-600" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{attendanceStats.approved}</div>
            <p className="text-xs text-gray-600 mt-1">
              {attendanceStats.rejected} rejected
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Team Status</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Team Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {teamAttendance.map((member) => (
              <Card key={member.id} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(member.status)}`} />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{member.name}</h4>
                        <p className="text-xs text-gray-500">{member.role}</p>
                      </div>
                    </div>
                    <Badge 
                      variant={member.status === 'present' ? 'default' : 
                              member.status === 'late' ? 'secondary' : 
                              member.status === 'pending' ? 'outline' : 'destructive'}
                      className="text-xs"
                    >
                      {getStatusIcon(member.status)}
                      <span className="ml-1 capitalize">{member.status}</span>
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Attendance Rate</span>
                      <span className="font-medium">{member.attendanceRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={member.attendanceRate} className="h-1" />
                    
                    {member.submittedAt && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {new Date(member.submittedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)
                      </div>
                    )}
                    
                    {member.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />
                        Location verified
                      </div>
                    )}

                    {member.streak > 0 && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <Award className="h-3 w-3" />
                        {member.streak} day streak
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle>Detailed Team Status</CardTitle>
              <CardDescription>Individual attendance records and details</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {attendanceRecords.map((record) => (
                    <Card key={record.id} className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={record.selfieUrl} />
                              <AvatarFallback>{record.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold">{record.user.name}</h4>
                              <p className="text-sm text-gray-600">{record.user.role}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(record.submittedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)
                                </span>
                                {record.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    Location verified
                                  </span>
                                )}
                                {record.selfieUrl && (
                                  <span className="flex items-center gap-1">
                                    <Camera className="h-3 w-3" />
                                    Photo submitted
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <Badge 
                              variant={record.status === 'APPROVED' ? 'default' : 
                                      record.status === 'REJECTED' ? 'destructive' : 'outline'}
                            >
                              {record.status}
                            </Badge>
                            {record.reviewedAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                Reviewed {new Date(record.reviewedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {record.visitReport && (
                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{record.visitReport}</p>
                          </div>
                        )}
                        
                        {record.reviewNotes && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Review Notes:</p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">{record.reviewNotes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Attendance Trends
              </CardTitle>
              <CardDescription>7-day attendance patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attendanceStats.trends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">{trend.date}</div>
                      <Badge variant="secondary" className="text-xs">
                        {trend.rate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        {trend.approved}
                      </div>
                      <div className="flex items-center gap-1 text-blue-600">
                        <Clock className="h-3 w-3" />
                        {trend.submitted}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col gap-2"
                  onClick={() => sendReminder(teamAttendance.filter(m => m.status === 'absent').map(m => m.id))}
                >
                  <Send className="h-5 w-5 text-blue-600" />
                  <span className="text-xs">Remind Absent ({attendanceStats.missing})</span>
                </Button>
                
                <Button variant="outline" className="h-20 flex flex-col gap-2" asChild>
                  <a href="/attendance-review">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-xs">Review Pending ({attendanceStats.pending})</span>
                  </a>
                </Button>
                
                <Button variant="outline" className="h-20 flex flex-col gap-2" asChild>
                  <a href="/attendance">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <span className="text-xs">View Full Calendar</span>
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
