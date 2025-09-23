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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Users,
  Clock,
  MapPin,
  Camera,
  FileText,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Mail,
  Loader2,
  Shield
} from "lucide-react";
import Image from "next/image";
import { getLocationAccuracyLevel, formatCoordinates, LocationInfo } from "@/lib/location";

// Types
interface AttendanceMember {
  id: number;
  name: string;
  employeeCode: string;
  region: string;
  status: "submitted" | "approved" | "rejected" | "flagged" | "amended" | "missing";
  submittedAt: string | null;
  visitReport: string | null;
  photoUrl: string | null;
  timelineUrl: string | null;
  userId?: string;
  userRole?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  locationDetails?: LocationInfo | null;
  // Enhanced fields from database
  reviewerName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  approvedAt?: string;
  locationAccuracyLevel?: string;
  locationRiskLevel?: string;
  isLocationValid?: boolean;
  locationValidationWarnings?: string;
  distanceFromLastLocation?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  locationSource?: string;
  locationProvider?: string;
  locationTimestamp?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  visitReport: string;
  timelineUrl?: string;
  selfieUrl?: string;
  submittedAt: string;
  submittedAtUTC?: string;
  status: string;
  clientLat?: number;
  clientLng?: number;
  clientAccuracyM?: number;
  ipCity?: string;
  ipCountry?: string;
  // Enhanced geolocation fields
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  locationTimestamp?: string;
  locationSource?: string;
  locationAccuracyLevel?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  locationProvider?: string;
  isLocationValid?: boolean;
  locationRiskLevel?: string;
  distanceFromLastLocation?: number;
  locationValidationWarnings?: string;
  // Review fields
  reviewerId?: number;
  reviewedAt?: string;
  reviewedAtUTC?: string;
  reviewNotes?: string;
  approvedAt?: string;
  // User information
  user?: {
    name: string;
    email: string;
    employeeCode: string;
  };
  users_attendances_userIdTousers?: {
    name: string;
    email: string;
    employeeCode: string;
    role: string;
    location?: string;
  };
  users_attendances_reviewerIdTousers?: {
    name: string;
    email: string;
  };
}

export default function AttendanceLogPage() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<AttendanceMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<AttendanceMember | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationAccuracyFilter, setLocationAccuracyFilter] = useState("all");
  const [reviewerFilter, setReviewerFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [missingUsers, setMissingUsers] = useState<Array<{ id: number; name: string; email: string; employeeCode: string; role: string }>>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentUserRole, setCurrentUserRole] = useState<string>('user');

  // Auto-refresh interval (in milliseconds) - 30 seconds
  const AUTO_REFRESH_INTERVAL = 30000;
  const MAX_RETRY_ATTEMPTS = 3;

  // Custom error class for attendance-related errors
  class AttendanceError extends Error {
    constructor(message: string, public retryable: boolean = true) {
      super(message);
      this.name = "AttendanceError";
    }
  }

  // Enhanced fetch attendance data with retry logic and better error handling
  const fetchAttendanceData = async (isRetry: boolean = false, isAutoRefresh: boolean = false): Promise<void> => {
    // Only fetch if authenticated
    if (!isAuthenticated) {
      console.log('🔍 AttendanceLog: Skipping fetch - user not authenticated');
      return;
    }

    console.log('🔍 AttendanceLog: Starting fetch for date:', selectedDate);
    try {
      // Set appropriate loading states
      if (isAutoRefresh) {
        setRefreshing(true);
      } else if (!isRetry) {
        setLoading(true);
      }

      setError(null);

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      console.log('🔍 AttendanceLog: Making API request to:', `/api/attendance?date=${selectedDate}`);

      const response = await fetch(`/api/attendance?date=${selectedDate}`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        }
      });

      console.log('🔍 AttendanceLog: API response status:', response.status);
      console.log('🔍 AttendanceLog: API response content-type:', response.headers.get('content-type'));

      clearTimeout(timeoutId);

      // Check if response is HTML (redirect) or JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('🔍 AttendanceLog: Received HTML response instead of JSON - likely authentication redirect');
        const htmlText = await response.text();
        console.log('🔍 AttendanceLog: HTML response preview:', htmlText.substring(0, 200));
        throw new AttendanceError('Authentication required - received login page instead of data', false);
      }

      const data = await response.json();
      console.log('🔍 AttendanceLog: Successfully parsed JSON response:', JSON.stringify(data, null, 2));
      console.log('🔍 AttendanceLog: Attendance array length:', data.attendance?.length || 0);

      // Log the first record structure for debugging
      if (data.attendance && data.attendance.length > 0) {
        console.log('🔍 AttendanceLog: First record structure:', JSON.stringify(data.attendance[0], null, 2));
        console.log('🔍 AttendanceLog: User data in first record:', data.attendance[0].users_attendances_userIdTousers);
      }

      if (response.ok) {
        // Reset retry count on successful fetch
        setRetryCount(0);

        // Set admin view flag and user role
        setIsAdminView(data.isAdminView || false);

        // Get user role from localStorage with better error handling
        try {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            setCurrentUserRole(userData.role || 'user');
          }
        } catch (parseError) {
          console.warn('Failed to parse user data from localStorage:', parseError);
          setCurrentUserRole('user');
        }

        // Capture missing users for bulk reminder support (admin only)
        if (Array.isArray(data.missingUsers)) {
          setMissingUsers(data.missingUsers);
        } else {
          setMissingUsers([]);
        }

        // Transform API data to match the component's expected format with better error handling
        console.log('🔍 AttendanceLog: Starting data transformation for', (data.attendance || []).length, 'records');

        const transformedData: AttendanceMember[] = (data.attendance || []).map((record: AttendanceRecord, index: number) => {
          console.log(`🔍 AttendanceLog: Transforming record ${index + 1}:`, {
            id: record.id,
            userId: record.userId,
            hasUserData: !!record.users_attendances_userIdTousers,
            userData: record.users_attendances_userIdTousers,
            status: record.status
          });

          // Create detailed location display with error handling
          let location = "Location not available";
          let locationDetails = null;

          try {
            // Priority: Enhanced GPS coordinates (most accurate) > Basic GPS > IP location (least accurate)
            if (record.latitude && record.longitude) {
              // Use enhanced geolocation fields
              if (record.address || record.city || record.state) {
                const addressParts = [record.address, record.city, record.state, record.country].filter(Boolean);
                location = addressParts.join(', ') || formatCoordinates(record.latitude, record.longitude);
              } else {
                location = formatCoordinates(record.latitude, record.longitude);
              }

              // For admin view, show detailed location with enhanced info
              if (data.isAdminView) {
                locationDetails = {
                  latitude: record.latitude,
                  longitude: record.longitude,
                  displayName: location,
                  accuracy: record.accuracy,
                  altitude: record.altitude,
                  speed: record.speed,
                  heading: record.heading,
                  source: record.locationSource,
                  provider: record.locationProvider,
                  timestamp: record.locationTimestamp,
                  isValid: record.isLocationValid,
                  riskLevel: record.locationRiskLevel,
                  validationWarnings: record.locationValidationWarnings,
                  accuracyLevel: record.locationAccuracyLevel
                };
              }
            } else if (record.clientLat && record.clientLng) {
              // Fallback to basic GPS coordinates
              location = formatCoordinates(record.clientLat, record.clientLng);
              if (data.isAdminView) {
                locationDetails = {
                  latitude: record.clientLat,
                  longitude: record.clientLng,
                  displayName: formatCoordinates(record.clientLat, record.clientLng),
                  accuracy: record.clientAccuracyM
                };
              }
            } else if (record.ipCity && record.ipCountry) {
              location = `${record.ipCity}, ${record.ipCountry}`;
            } else if (record.ipCity) {
              location = record.ipCity;
            } else if (record.ipCountry) {
              location = record.ipCountry;
            }
          } catch (locationError) {
            console.warn('Error processing location data:', locationError);
          }

          // Enhanced status mapping with validation
          const statusValue = record.status?.toLowerCase() || '';
          let mappedStatus: "submitted" | "approved" | "rejected" | "flagged" | "amended" | "missing" = "missing";

          switch (statusValue) {
            case "submitted":
              mappedStatus = "submitted";
              break;
            case "approved":
              mappedStatus = "approved";
              break;
            case "rejected":
              mappedStatus = "rejected";
              break;
            case "auto_flagged":
              mappedStatus = "flagged";
              break;
            case "amended":
              mappedStatus = "amended";
              break;
            default:
              mappedStatus = "missing";
          }

          const transformedRecord = {
            id: parseInt(record.id) || Math.random(),
            name: record.users_attendances_userIdTousers?.name || record.user?.name || 'Unknown User',
            employeeCode: record.users_attendances_userIdTousers?.employeeCode || record.user?.employeeCode || 'N/A',
            region: record.users_attendances_userIdTousers?.location || '—',
            status: mappedStatus,
            submittedAt: (record.submittedAt || record.submittedAtUTC) ? new Date(record.submittedAt || record.submittedAtUTC as string).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) : null,
            visitReport: record.visitReport || '',
            photoUrl: record.selfieUrl,
            timelineUrl: record.timelineUrl,
            userId: record.userId,
            userRole: record.users_attendances_userIdTousers?.role || 'user',
            location: location,
            latitude: record.latitude,
            longitude: record.longitude,
            accuracy: record.accuracy || record.clientAccuracyM,
            locationDetails: locationDetails,
            // Enhanced fields
            reviewerName: record.users_attendances_reviewerIdTousers?.name,
            reviewedAt: record.reviewedAt || record.reviewedAtUTC,
            reviewNotes: record.reviewNotes,
            approvedAt: record.approvedAt,
            locationAccuracyLevel: record.locationAccuracyLevel,
            locationRiskLevel: record.locationRiskLevel,
            isLocationValid: record.isLocationValid,
            locationValidationWarnings: record.locationValidationWarnings,
            distanceFromLastLocation: record.distanceFromLastLocation,
            altitude: record.altitude,
            speed: record.speed,
            heading: record.heading,
            locationSource: record.locationSource,
            locationProvider: record.locationProvider,
            locationTimestamp: record.locationTimestamp,
            address: record.address,
            city: record.city,
            state: record.state,
            country: record.country,
            postalCode: record.postalCode,
          };

          console.log(`🔍 AttendanceLog: Final transformed record ${index + 1}:`, {
            id: transformedRecord.id,
            name: transformedRecord.name,
            employeeCode: transformedRecord.employeeCode,
            status: transformedRecord.status,
            location: transformedRecord.location
          });

          return transformedRecord;
        });

        console.log('🔍 AttendanceLog: Setting transformed data:', transformedData.length, 'records');
        console.log('🔍 AttendanceLog: First transformed record:', transformedData[0]);

        setAttendanceData(transformedData);
        setLastRefresh(new Date());
      } else {
        throw new AttendanceError(
          typeof data.error === 'string' ? data.error : data.error?.message || 'Failed to fetch attendance data',
          response.status >= 500 // Retry on server errors
        );
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);

      const isRetryable = error instanceof AttendanceError ? error.retryable :
                         (error as any)?.name === 'AbortError' ? true : // Timeout is retryable
                         false;

      if (isRetry && isRetryable && retryCount < MAX_RETRY_ATTEMPTS) {
        console.log(`Retrying fetch (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchAttendanceData(true, isAutoRefresh), 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }

      const errorMessage = error instanceof AttendanceError ? error.message :
                          (error as any)?.name === 'AbortError' ? 'Request timeout - please try again' :
                          'Failed to load attendance data';

      setError(errorMessage);
      setRetryCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 AttendanceLog: Checking authentication...');
        const response = await fetch('/api/profile');
        if (response.ok) {
          setIsAuthenticated(true);
          console.log('🔍 AttendanceLog: User is authenticated');
        } else {
          console.log('🔍 AttendanceLog: User not authenticated, response:', response.status);
          setIsAuthenticated(false);
          setError('Please log in to view attendance data');
        }
      } catch (error) {
        console.error('🔍 AttendanceLog: Auth check failed:', error);
        setIsAuthenticated(false);
        setError('Authentication check failed');
      }
    };

    checkAuth();
  }, []);

  // Fetch attendance data when date changes (only if authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      fetchAttendanceData();
    }
  }, [selectedDate, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh mechanism
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const intervalId = setInterval(() => {
      // Only auto-refresh if we're not currently loading and there's no error
      if (!loading && !refreshing && !error) {
        fetchAttendanceData(false, true);
      }
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [autoRefreshEnabled, loading, refreshing, error, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (refreshing) return; // Prevent multiple simultaneous refreshes
    await fetchAttendanceData(false, true);
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(prev => !prev);
  };

  // Handle visibility change to pause/resume auto-refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && autoRefreshEnabled) {
        // Pause auto-refresh when tab is not visible
        setAutoRefreshEnabled(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [autoRefreshEnabled]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('Connection restored - refreshing data...');
      setIsOnline(true);
      if (!loading && !error) {
        fetchAttendanceData(false, true);
      }
    };

    const handleOffline = () => {
      console.log('Connection lost - pausing auto-refresh');
      setIsOnline(false);
      setAutoRefreshEnabled(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate statistics
  const stats = {
    total: attendanceData.length,
    grandTotal: attendanceData.length + missingUsers.length,
    submitted: attendanceData.filter((a: AttendanceMember) => a.status === "submitted").length,
    approved: attendanceData.filter((a: AttendanceMember) => a.status === "approved").length,
    rejected: attendanceData.filter((a: AttendanceMember) => a.status === "rejected").length,
    flagged: attendanceData.filter((a: AttendanceMember) => a.status === "flagged").length,
    amended: attendanceData.filter((a: AttendanceMember) => a.status === "amended").length,
    missing: missingUsers.length,
    submissionRate: attendanceData.length > 0
      ? Math.round((attendanceData.filter((a: AttendanceMember) => a.status === "submitted").length / attendanceData.length) * 100)
      : 0
  };

  // Dynamic region options based on data
  const regionOptions = Array.from(new Set(attendanceData.map((m) => m.region).filter(Boolean)));

  // Filter data with enhanced filtering options
  const filteredData = attendanceData.filter((member: AttendanceMember) => {
    // Region filter
    if (regionFilter !== "all" && member.region !== regionFilter) {
      return false;
    }

    // Status filter
    if (statusFilter !== "all" && member.status !== statusFilter) {
      return false;
    }

    // Location accuracy filter
    if (locationAccuracyFilter !== "all") {
      const accuracy = member.accuracy || 0;
      switch (locationAccuracyFilter) {
        case "high":
          if (accuracy > 50) return false;
          break;
        case "medium":
          if (accuracy <= 50 || accuracy > 100) return false;
          break;
        case "low":
          if (accuracy <= 100) return false;
          break;
        case "invalid":
          if (member.isLocationValid !== false) return false;
          break;
      }
    }

    // Reviewer filter
    if (reviewerFilter !== "all") {
      if (reviewerFilter === "reviewed" && !member.reviewedAt) return false;
      if (reviewerFilter === "unreviewed" && member.reviewedAt) return false;
    }

    return true;
  });

  const handleViewDetails = (member: AttendanceMember) => {
    console.log('Viewing details for member:', member);
    if (member.status === "submitted") {
      setSelectedMember(member);
      setIsDetailDialogOpen(true);
    }
  };

  const handleSendReminder = (member: AttendanceMember) => {
    // Simulate sending reminder
    alert(`Reminder sent to ${member.name}`);
  };

  const handleSendBulkReminder = async () => {
    try {
      const res = await fetch('/api/attendance/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate })
      });
      const out = await res.json();
      if (res.ok) {
        alert(`Reminders sent to ${out.sent} of ${out.missingCount} missing users`);
      } else {
        alert(`Failed to send reminders: ${out.error || res.status}`);
      }
    } catch (e) {
      alert('Failed to send reminders');
    }
  };

  const handleExportCSV = () => {
    const header = [
      'Employee', 'Employee Code', 'Role', 'Region', 'Location', 'Status', 'Submitted At', 'Reviewed By'
    ];
    const rows = attendanceData.map(m => [
      m.name,
      m.employeeCode,
      m.userRole || '',
      m.region || '',
      (m.location || '').replace(/\n/g, ' '),
      m.status,
      m.submittedAt || '',
      m.reviewerName || ''
    ]);
    const csv = [header, ...rows].map(r => r.map(field => {
      const s = String(field ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDateChange = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      submitted: { variant: "secondary" as const, label: "Submitted", bgColor: "bg-blue-100", textColor: "text-blue-800", icon: Clock },
      approved: { variant: "default" as const, label: "Approved", bgColor: "bg-green-100", textColor: "text-green-800", icon: CheckCircle },
      rejected: { variant: "destructive" as const, label: "Rejected", bgColor: "bg-red-100", textColor: "text-red-800", icon: XCircle },
      flagged: { variant: "outline" as const, label: "Flagged", bgColor: "bg-yellow-100", textColor: "text-yellow-800", icon: AlertTriangle },
      amended: { variant: "outline" as const, label: "Amended", bgColor: "bg-purple-100", textColor: "text-purple-800", icon: FileText },
      missing: { variant: "destructive" as const, label: "Missing", bgColor: "bg-gray-100", textColor: "text-gray-800", icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.missing;
    const Icon = config.icon;

    return (
      <Badge className={`${config.bgColor} ${config.textColor} border-0 flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {isAuthenticated === false ? 'Checking authentication...' : 'Loading attendance data...'}
            </p>
          </div>
        </div>
      </>
    );
  }

  if (isAuthenticated === false) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 max-w-md">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">Authentication Required</h2>
              <p className="text-red-600 dark:text-red-400 mb-4">
                You need to be logged in to view attendance data.
              </p>
              <Button onClick={() => window.location.href = '/login'}>
                Go to Login
              </Button>
            </div>
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
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 max-w-md">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">Connection Error</h2>
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => fetchAttendanceData(false, false)} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    'Try Again'
                  )}
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto p-6">
        {/* Enhanced Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 mb-8 shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-white">Attendance Dashboard</h1>
                    {isAdminView && (
                      <div className="flex gap-2 mt-2">
                    {isAdminView && (
                      <Badge className="bg-red-500/20 text-white border-white/30">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin Access
                      </Badge>
                    )}
                    <Badge className={`${isOnline ? 'bg-green-500/20 text-white border-white/30' : 'bg-red-500/20 text-white border-white/30'}`}>
                      <div className={`h-2 w-2 rounded-full mr-1 ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      {isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                    )}
                  </div>
                </div>
                <p className="text-blue-100 text-lg max-w-2xl">
                  {isAdminView
                    ? "Comprehensive monitoring of all users' attendance with detailed location tracking and photo verification"
                    : "Monitor your team's daily attendance and engagement"
                  }
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </Button>
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={toggleAutoRefresh}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Auto-refresh {autoRefreshEnabled ? 'ON' : 'OFF'}
                </Button>
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                  onClick={handleSendBulkReminder}
                  disabled={stats.missing === 0}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Bulk Reminder ({stats.missing})
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Date Selector */}
        <Card className="mb-8 shadow-lg border-0 bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="lg"
                className="border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                onClick={() => handleDateChange('prev')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div className="flex items-center gap-6">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {formatDate(selectedDate)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Select date to view attendance records
                  </p>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="text-center font-medium border-slate-300 focus:border-blue-500"
                    />
                    {refreshing && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs">Updating...</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Last updated: {lastRefresh.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="lg"
                className="border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                onClick={() => handleDateChange('next')}
                disabled={selectedDate === new Date().toISOString().split('T')[0]}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/10 rounded-full -mr-6 -mt-6"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                  <Users className="h-3 w-3 text-blue-600" />
                </div>
                Total
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">{stats.grandTotal}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
            <div className="absolute top-0 right-0 w-12 h-12 bg-yellow-500/10 rounded-full -mr-6 -mt-6"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                <div className="p-1.5 bg-yellow-500/10 rounded-lg">
                  <Clock className="h-3 w-3 text-yellow-600" />
                </div>
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{stats.submitted}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <div className="absolute top-0 right-0 w-12 h-12 bg-green-500/10 rounded-full -mr-6 -mt-6"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
                <div className="p-1.5 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </div>
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-green-800 dark:text-green-200">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
            <div className="absolute top-0 right-0 w-12 h-12 bg-red-500/10 rounded-full -mr-6 -mt-6"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
                <div className="p-1.5 bg-red-500/10 rounded-lg">
                  <XCircle className="h-3 w-3 text-red-600" />
                </div>
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-red-800 dark:text-red-200">{stats.rejected}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <div className="absolute top-0 right-0 w-12 h-12 bg-orange-500/10 rounded-full -mr-6 -mt-6"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-2">
                <div className="p-1.5 bg-orange-500/10 rounded-lg">
                  <AlertTriangle className="h-3 w-3 text-orange-600" />
                </div>
                Flagged
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">{stats.flagged}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <div className="absolute top-0 right-0 w-12 h-12 bg-purple-500/10 rounded-full -mr-6 -mt-6"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <div className="p-1.5 bg-purple-500/10 rounded-lg">
                  <FileText className="h-3 w-3 text-purple-600" />
                </div>
                Amended
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">{stats.amended}</div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regionOptions.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="amended">Amended</SelectItem>
                  <SelectItem value="missing">Missing</SelectItem>
                </SelectContent>
              </Select>

              {isAdminView && (
                <>
                  <Select value={locationAccuracyFilter} onValueChange={setLocationAccuracyFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Location accuracy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accuracy Levels</SelectItem>
                      <SelectItem value="high">High Accuracy (&lt;50m)</SelectItem>
                      <SelectItem value="medium">Medium Accuracy (50-100m)</SelectItem>
                      <SelectItem value="low">Low Accuracy (&gt;100m)</SelectItem>
                      <SelectItem value="invalid">Invalid Location</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={reviewerFilter} onValueChange={setReviewerFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Review status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Records</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="unreviewed">Not Reviewed</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Attendance Table */}
        <Card className="mb-6 shadow-xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-blue-500 rounded-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              Team Attendance Status
              <Badge variant="outline" className="ml-2">
                {filteredData.length} entries
              </Badge>
            </CardTitle>
            <CardDescription className="text-base">
              {isAdminView
                ? "Click on any entry to view detailed attendance information, photos, and precise location data"
                : "Click on submitted entries to view attendance details"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-700">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Employee</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Employee Code</TableHead>
                    {isAdminView && <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Role</TableHead>}
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Region</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Submitted At</TableHead>
                    {isAdminView && <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Reviewed By</TableHead>}
                    <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredData.map((member: AttendanceMember) => (
                  <TableRow
                    key={member.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      member.status === "missing" ? "bg-red-50 dark:bg-red-900/10" :
                      member.status === "rejected" ? "bg-red-50 dark:bg-red-900/10" :
                      member.status === "flagged" ? "bg-yellow-50 dark:bg-yellow-900/10" :
                      member.status === "amended" ? "bg-purple-50 dark:bg-purple-900/10" :
                      member.status === "approved" ? "bg-green-50 dark:bg-green-900/10" :
                      member.status === "submitted" ? "bg-blue-50 dark:bg-blue-900/10" : ""
                    }`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {member.name}
                      </div>
                    </TableCell>
                    <TableCell>{member.employeeCode}</TableCell>
                    {isAdminView && (
                      <TableCell>
                        <Badge variant="outline" className={
                          member.userRole === 'admin' || member.userRole === 'SuperAdmin'
                            ? "border-red-300 text-red-600"
                            : "border-blue-300 text-blue-600"
                        }>
                          {member.userRole || 'User'}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>{member.region}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <MapPin className={`h-3 w-3 ${member.isLocationValid === false ? 'text-red-500' : 'text-green-500'}`} />
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                            {member.location}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {member.accuracy && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                member.accuracy <= 50 ? 'border-green-300 text-green-600' :
                                member.accuracy <= 100 ? 'border-yellow-300 text-yellow-600' :
                                'border-red-300 text-red-600'
                              }`}
                            >
                              ±{Math.round(member.accuracy)}m
                            </Badge>
                          )}
                          {member.locationAccuracyLevel && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                member.locationAccuracyLevel.toLowerCase().includes('high') ? 'border-green-300 text-green-600' :
                                member.locationAccuracyLevel.toLowerCase().includes('medium') ? 'border-yellow-300 text-yellow-600' :
                                'border-red-300 text-red-600'
                              }`}
                            >
                              {member.locationAccuracyLevel}
                            </Badge>
                          )}
                          {member.isLocationValid === false && (
                            <Badge variant="outline" className="text-xs border-red-300 text-red-600">
                              Invalid
                            </Badge>
                          )}
                          {member.locationRiskLevel && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                member.locationRiskLevel.toLowerCase() === 'low' ? 'border-green-300 text-green-600' :
                                member.locationRiskLevel.toLowerCase() === 'medium' ? 'border-yellow-300 text-yellow-600' :
                                'border-red-300 text-red-600'
                              }`}
                            >
                              Risk: {member.locationRiskLevel}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(member.status)}
                    </TableCell>
                    <TableCell>
                      {member.submittedAt ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {member.submittedAt}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {isAdminView && (
                      <TableCell>
                        {member.reviewerName ? (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{member.reviewerName}</span>
                            {member.reviewedAt && (
                              <Badge variant="outline" className="text-xs ml-1">
                                {new Date(member.reviewedAt).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                        ) : member.status !== "missing" ? (
                          <span className="text-muted-foreground text-xs">Not reviewed</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {member.status === "missing" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-orange-600 border-orange-600 hover:bg-orange-50"
                          onClick={() => handleSendReminder(member)}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Send Reminder
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(member)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        {/* Attention Required Alerts */}
        {stats.missing > 0 && (
          <Card className="mt-6 border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-5 w-5" />
                Missing Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                The following team members have not submitted their attendance for today:
              </p>
              <div className="flex flex-wrap gap-2">
                {missingUsers.map((member) => (
                    <Badge key={member.id} variant="outline" className="border-orange-300">
                      {member.name}
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rejected/Flagged Records Alert */}
        {(stats.rejected > 0 || stats.flagged > 0) && (
          <Card className="mt-6 border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Requires Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                The following attendance records require attention:
              </p>
              <div className="space-y-2">
                {stats.rejected > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-600 mb-2">Rejected Records:</p>
                    <div className="flex flex-wrap gap-2">
                      {attendanceData
                        .filter((a: AttendanceMember) => a.status === "rejected")
                        .map((member: AttendanceMember) => (
                          <Badge key={member.id} variant="outline" className="border-red-300">
                            {member.name}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
                {stats.flagged > 0 && (
                  <div>
                    <p className="text-sm font-medium text-yellow-600 mb-2">Flagged Records:</p>
                    <div className="flex flex-wrap gap-2">
                      {attendanceData
                        .filter((a: AttendanceMember) => a.status === "flagged")
                        .map((member: AttendanceMember) => (
                          <Badge key={member.id} variant="outline" className="border-yellow-300">
                            {member.name}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-auto">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-lg">Attendance Details</DialogTitle>
              <DialogDescription className="text-sm">
                {selectedMember?.name} - {formatDate(selectedDate)}
              </DialogDescription>
            </DialogHeader>
            {selectedMember && (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Basic Info Section */}
                <div className="flex-shrink-0 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Employee Code</Label>
                      <span className="font-medium">{selectedMember.employeeCode}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Submitted At</Label>
                      <span className="font-medium">{selectedMember.submittedAt}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Status</Label>
                      <div className="ml-2">{getStatusBadge(selectedMember.status)}</div>
                    </div>
                    {selectedMember.reviewerName && (
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-muted-foreground">Reviewed By</Label>
                        <span className="font-medium text-right">
                          {selectedMember.reviewerName}
                          {selectedMember.reviewedAt && (
                            <div className="text-xs text-muted-foreground">
                              {new Date(selectedMember.reviewedAt).toLocaleString()}
                            </div>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto space-y-4 mt-4 pr-2">
                  {/* Review Notes */}
                  {selectedMember.reviewNotes && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Review Notes</Label>
                      <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                        <CardContent className="p-3">
                          <p className="text-sm whitespace-pre-wrap">{selectedMember.reviewNotes}</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Visit Report */}
                  <div>
                    <Label className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      Visit Report
                    </Label>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm whitespace-pre-wrap">{selectedMember.visitReport}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Photo Section */}
                  <div>
                    <Label className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                      <Camera className="h-4 w-4" />
                      Photo
                      {isAdminView && (
                        <Badge variant="outline" className="text-xs ml-2">
                          Admin Access
                        </Badge>
                      )}
                    </Label>
                    <Card>
                      <CardContent className="p-4">
                        {selectedMember.photoUrl ? (
                          <div className="w-full h-48 sm:h-40 rounded-lg overflow-hidden">
                            <Image
                              src={selectedMember.photoUrl || ''}
                              alt={`${selectedMember.name}'s attendance photo`}
                              width={400}
                              height={300}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                const img = e.currentTarget as HTMLImageElement;
                                const fallback = img.nextElementSibling as HTMLElement;
                                if (img && fallback) {
                                  img.style.display = 'none';
                                  fallback.style.display = 'flex';
                                }
                              }}
                            />
                            <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg items-center justify-center hidden">
                              <Camera className="h-8 w-8 text-gray-400" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-48 sm:h-40 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                              <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-500">No photo uploaded</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Enhanced Location Information */}
                  {selectedMember.location && (
                    <div>
                      <Label className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        Precise Location Details
                      </Label>
                      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                        <CardContent className="p-4 space-y-4">
                          {/* Primary Location Display - Full Width */}
                          <div className="flex items-start gap-3 p-3 bg-white/80 dark:bg-gray-800/50 rounded-lg border">
                            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg flex-shrink-0">
                              <MapPin className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white break-words">
                                {selectedMember.location}
                              </div>
                              {selectedMember.accuracy && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs border-green-300 text-green-600">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                                    GPS Accuracy: ±{Math.round(selectedMember.accuracy)}m
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* View Map Buttons - Responsive Row */}
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
                              onClick={() => {
                                // Enhanced map opening logic that handles both coordinates and addresses
                                if (!selectedMember?.location) {
                                  alert('No location information available');
                                  return;
                                }

                                // Check if location contains numeric coordinates
                                if (selectedMember.latitude && selectedMember.longitude) {
                                  // Location contains coordinates, use them directly
                                  const lat = selectedMember.latitude;
                                  const lng = selectedMember.longitude;
                                  console.log('Opening map for coordinates:', lat, lng);
                                  if (!isNaN(lat) && !isNaN(lng)) {
                                    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                                  } else {
                                    alert('Invalid coordinate format');
                                  }
                                } else {
                                  // Location is an address, search for it
                                  const query = encodeURIComponent(selectedMember.location.trim());
                                  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                                }
                              }}
                            >
                              <MapPin className="h-4 w-4 mr-2" />
                              <span className="text-sm">Google Maps</span>
                            </Button>
                            
                          </div>

                          {/* Enhanced Location Analysis for Admins */}
                          {isAdminView && (
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-2 mb-3">
                                <Shield className="h-5 w-5 text-blue-600" />
                                <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                  Advanced Location Analysis
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${selectedMember.isLocationValid !== false ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className="text-blue-700 dark:text-blue-300 font-medium">
                                      {selectedMember.isLocationValid !== false ? 'GPS Verified' : 'Location Invalid'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="text-blue-700 dark:text-blue-300">
                                      Accuracy: ±{selectedMember.accuracy || 'N/A'}m
                                    </span>
                                  </div>
                                  {selectedMember.locationAccuracyLevel && (
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                      <span className="text-blue-700 dark:text-blue-300">
                                        Level: {selectedMember.locationAccuracyLevel}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {selectedMember.locationSource && (
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                      <span className="text-blue-700 dark:text-blue-300">
                                        Source: {selectedMember.locationSource}
                                      </span>
                                    </div>
                                  )}
                                  {selectedMember.locationRiskLevel && (
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${
                                        selectedMember.locationRiskLevel.toLowerCase() === 'low' ? 'bg-green-500' :
                                        selectedMember.locationRiskLevel.toLowerCase() === 'medium' ? 'bg-yellow-500' :
                                        'bg-red-500'
                                      }`}></div>
                                      <span className="text-blue-700 dark:text-blue-300">
                                        Risk: {selectedMember.locationRiskLevel}
                                      </span>
                                    </div>
                                  )}
                                  {selectedMember.distanceFromLastLocation && (
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                      <span className="text-blue-700 dark:text-blue-300">
                                        Distance: {Math.round(selectedMember.distanceFromLastLocation)}m from last
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Additional location details */}
                              {(selectedMember.altitude || selectedMember.speed || selectedMember.heading) && (
                                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    {selectedMember.altitude && (
                                      <div className="text-center">
                                        <div className="font-medium text-blue-700 dark:text-blue-300">Altitude</div>
                                        <div className="text-blue-600 dark:text-blue-400">{Math.round(selectedMember.altitude)}m</div>
                                      </div>
                                    )}
                                    {selectedMember.speed && (
                                      <div className="text-center">
                                        <div className="font-medium text-blue-700 dark:text-blue-300">Speed</div>
                                        <div className="text-blue-600 dark:text-blue-400">{Math.round(selectedMember.speed * 3.6)} km/h</div>
                                      </div>
                                    )}
                                    {selectedMember.heading && (
                                      <div className="text-center">
                                        <div className="font-medium text-blue-700 dark:text-blue-300">Heading</div>
                                        <div className="text-blue-600 dark:text-blue-400">{Math.round(selectedMember.heading)}°</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                  📍 Precise location data captured with enhanced reverse geocoding for maximum accuracy
                                  {selectedMember.locationTimestamp && (
                                    <div className="mt-1">
                                      Location captured: {new Date(selectedMember.locationTimestamp).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Google Timeline */}
                  {selectedMember.timelineUrl && (
                    <div>
                      <Label className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4" />
                        Google Timeline
                      </Label>
                      <Card>
                        <CardContent className="p-4">
                          <a
                            href={selectedMember.timelineUrl || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-2"
                          >
                            <MapPin className="h-4 w-4" />
                            View Timeline
                          </a>
                        </CardContent>
                      </Card>
                    </div>
                  )}
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
