"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  Camera,
  Edit,
  Save,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Bell,
  Eye,
  EyeOff,
  Upload,
  CheckCircle,
  AlertTriangle,
  Settings,
  Activity,
  Lock,
  Globe,
  Users,
  Star,
  Award,
  TrendingUp,
  FileText,
  Image as ImageIcon,
  Loader2,
  Key,
  Trash2,
  Download,
  RefreshCw,
  Check,
  Zap,
  Crown,
  Target,
  Clock,
  MoreVertical,
  Heart,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  employeeCode: string;
  role: string;
  phone?: string;
  location?: string;
  bio?: string;
  avatar?: string;
  avatarThumbnail?: string;
  avatarMedium?: string;
  avatarLarge?: string;
  avatarFileName?: string;
  avatarFileSize?: number;
  avatarMimeType?: string;
  avatarUploadedAt?: string;
  joinDate: string;
  lastLogin?: string;
  department?: string;
  manager?: string;
  verified: boolean;
  twoFactorEnabled: boolean;
  profileCompleteness: number;
  stats?: {
    totalLeads: number;
    totalOpportunities: number;
    totalAttendances: number;
    attendanceRate: number;
  };
}

interface ActivityItem {
  id: number;
  type: string;
  description: string;
  timestamp: string;
  icon: string;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'team';
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  allowMessages: boolean;
  showActivity: boolean;
}

// Import privacy utilities
import { canSeeInfo, getMaskedValue } from '@/lib/privacy';

// Reusable component for privacy-aware information display
const PrivateInfo: React.FC<{
  value: string | null;
  type: 'email' | 'phone' | 'location';
  privacySetting: boolean;
  isAdminView?: boolean;
  currentUserRole?: string;
  className?: string;
}> = ({ value, type, privacySetting, isAdminView = false, currentUserRole = 'user', className = '' }) => {
  const canSee = canSeeInfo(privacySetting, isAdminView, currentUserRole);

  if (canSee && value) {
    return <span className={className}>{value}</span>;
  } else if (!canSee && value) {
    return <span className={`${className} opacity-50`}>{getMaskedValue(value, type)}</span>;
  } else {
    return <span className={`${className} text-gray-400`}>Not provided</span>;
  }
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role: string; id: number } | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profileVisibility: 'team',
    showEmail: false,
    showPhone: true,
    showLocation: true,
    allowMessages: true,
    showActivity: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isToggling2FA, setIsToggling2FA] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    location: '',
    bio: '',
    department: '',
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 5000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorMessage(true);
    setTimeout(() => setShowErrorMessage(false), 5000);
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    if (!editForm.name.trim()) {
      errors.name = "Name is required";
    }

    if (editForm.phone && !/^\+?[\d\s\-\(\)]+$/.test(editForm.phone)) {
      errors.phone = "Please enter a valid phone number";
    }

    if (editForm.bio && editForm.bio.length > 500) {
      errors.bio = "Bio must be less than 500 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = () => {
    const errors: {[key: string]: string} = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters";
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchProfile = async (userId?: string) => {
    setIsLoading(true);
    try {
      const url = userId ? `/api/profile?userId=${userId}` : '/api/profile';
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.profile) {
        setProfile(data.profile);
        setIsAdminView(data.profile.isAdminView || false);

        // Set current user info for privacy checks
        if (!userId) {
          setCurrentUser({ role: data.profile.role, id: data.profile.id });
        }

        setEditForm({
          name: data.profile.name,
          phone: data.profile.phone || '',
          location: data.profile.location || '',
          bio: data.profile.bio || '',
          department: data.profile.department || '',
        });
        setPrivacySettings(data.profile.privacySettings || privacySettings);
      } else {
        // Safely handle error response
        let errorMessage = "Failed to load profile";
        if (data && typeof data === 'object' && data.error) {
          errorMessage = data.error;
        } else {
          errorMessage = `Failed to load profile (HTTP ${response.status})`;
        }
        showError(errorMessage);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      showError("Failed to load profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activities');
      const data = await response.json();

      if (response.ok && data && data.activities) {
        setActivities(data.activities);
      } else {
        // Safely handle error response
        let errorMessage = 'Failed to fetch activities';

        if (data && typeof data === 'object') {
          if (data.error) {
            errorMessage = data.error;
          } else if (data.details) {
            errorMessage = `Failed to fetch activities: ${data.details}`;
          }
        } else {
          errorMessage = `Failed to fetch activities (HTTP ${response.status})`;
        }

        console.warn('Activities fetch failed:', errorMessage);
        // Fallback to empty array if API fails
        setActivities([]);
      }
    } catch (error) {
      console.warn('Network error fetching activities:', error instanceof Error ? error.message : 'Unknown network error');
      // Fallback to empty array if network fails
      setActivities([]);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchActivities();
  }, []);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update profile with all avatar URLs
        setProfile(prev => prev ? {
          ...prev,
          avatar: data.avatarUrls?.original || data.avatarUrl,
          avatarThumbnail: data.avatarUrls?.thumbnail,
          avatarMedium: data.avatarUrls?.medium || data.avatarUrl,
          avatarLarge: data.avatarUrls?.large,
          avatarFileName: data.metadata?.fileName,
          avatarFileSize: data.metadata?.fileSize,
          avatarMimeType: data.metadata?.mimeType,
          avatarUploadedAt: data.metadata?.uploadedAt,
        } : null);

        showSuccess("Avatar uploaded successfully!");
      } else {
        // Safely handle error response
        let errorMessage = 'Unknown error';
        if (data && typeof data === 'object' && data.error) {
          errorMessage = data.error;
        } else {
          errorMessage = `Upload failed (HTTP ${response.status})`;
        }
        console.warn('Avatar upload failed:', errorMessage);
        showError('Failed to upload avatar: ' + errorMessage);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      showError('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      showError("Please fix the errors in the form");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editForm,
          privacySettings,
        }),
      });

      const data = await response.json();

      if (response.ok && data.profile) {
        setProfile(data.profile);
        setIsEditing(false);
        setFormErrors({});
        showSuccess("Profile updated successfully!");
      } else {
        // Safely handle error response
        let errorMessage = 'Failed to save profile';
        if (data && typeof data === 'object' && data.error) {
          errorMessage = data.error;
        } else {
          errorMessage = `Failed to save profile (HTTP ${response.status})`;
        }
        showError(errorMessage);
      }
    } catch (error) {
      console.error('Save failed:', error);
      showError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateProfileCompleteness = (form: typeof editForm): number => {
    const fields = ['name', 'phone', 'location', 'bio', 'department'];
    const completed = fields.filter(field => form[field as keyof typeof form]?.trim()).length;
    return Math.round((completed / fields.length) * 100);
  };

  const handlePrivacyChange = (key: keyof PrivacySettings, value: any) => {
    setPrivacySettings(prev => ({ ...prev, [key]: value }));
  };

  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showSuccess("Password changed successfully!");
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setFormErrors({});
      } else {
        showError(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change failed:', error);
      showError('Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggle2FA = async (enabled: boolean) => {
    setIsToggling2FA(true);
    try {
      // In a real implementation, this would call an API endpoint
      // For now, we'll simulate the 2FA toggle
      await new Promise(resolve => setTimeout(resolve, 1500));

      setProfile(prev => prev ? { ...prev, twoFactorEnabled: enabled } : null);
      showSuccess(`Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully!`);
    } catch (error) {
      showError("Failed to update 2FA settings. Please try again.");
    } finally {
      setIsToggling2FA(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!profile?.avatar) return;

    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'DELETE',
      });

      if (response.ok) {
        setProfile(prev => prev ? { ...prev, avatar: undefined } : null);
        showSuccess("Avatar deleted successfully!");
      } else {
        // Safely handle error response
        let errorMessage = "Failed to delete avatar";
        try {
          const data = await response.json();
          if (data && typeof data === 'object' && data.error) {
            errorMessage = data.error;
          } else {
            errorMessage = `Failed to delete avatar (HTTP ${response.status})`;
          }
        } catch (parseError) {
          errorMessage = `Failed to delete avatar (HTTP ${response.status})`;
        }
        showError(errorMessage);
      }
    } catch (error) {
      showError("Failed to delete avatar. Please try again.");
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'attendance': return Calendar;
      case 'lead': return Users;
      case 'opportunity': return TrendingUp;
      default: return Activity;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (isLoading || !profile) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
          <div className="text-center">
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
              <div className="absolute inset-0 rounded-full border-4 border-purple-200 border-t-purple-600 mx-auto animate-spin animation-delay-75"></div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Loading Profile</h2>
              <p className="text-gray-600 dark:text-gray-400 animate-pulse">Please wait while we fetch your information...</p>
            </div>
            <div className="mt-6 flex justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce animation-delay-100"></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce animation-delay-200"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
        <div className="container mx-auto p-6 max-w-7xl">

          {/* Success/Error Messages */}
          {showSuccessMessage && (
            <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
              <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-200">Success!</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">{successMessage}</AlertDescription>
              </Alert>
            </div>
          )}

          {showErrorMessage && (
            <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
              <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800 dark:text-red-200">Error</AlertTitle>
                <AlertDescription className="text-red-700 dark:text-red-300">{errorMessage}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Profile</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account settings and preferences</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Last updated: {new Date().toLocaleDateString()}
              </span>
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Profile: {profile.profileCompleteness}% complete
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column - Profile Overview */}
            <div className="lg:col-span-1 space-y-6">

              {/* Profile Card */}
              <Card className="relative overflow-hidden shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600"></div>
                <CardContent className="pt-20 pb-8">
                  <div className="text-center relative">
                    {/* Avatar */}
                    <div className="relative inline-block mb-6 group">
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl ring-4 ring-white dark:ring-gray-800 transition-all duration-300 group-hover:scale-105 overflow-hidden">
                        {profile.avatar ? (
                          <Image
                            src={profile.avatarMedium || profile.avatar}
                            alt={profile.name}
                            width={112}
                            height={112}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to original or thumbnail on error
                              const target = e.target as HTMLImageElement;
                              if (target.src !== profile.avatar && profile.avatar) {
                                target.src = profile.avatar;
                              } else {
                                // Final fallback to default avatar
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent && !parent.querySelector('.fallback-avatar')) {
                                  const fallback = document.createElement('div');
                                  fallback.className = 'fallback-avatar w-full h-full flex items-center justify-center';
                                  fallback.innerHTML = '<svg class="h-14 w-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>';
                                  parent.appendChild(fallback);
                                }
                              }
                            }}
                          />
                        ) : (
                          <User className="h-14 w-14 text-white" />
                        )}
                      </div>

                      {/* Upload/Delete Buttons */}
                      <div className="absolute -bottom-2 -right-2 flex gap-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-110 ${
                            isUploading
                              ? 'bg-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                          title={isUploading ? "Uploading..." : "Upload new avatar"}
                        >
                          {isUploading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Camera className="h-5 w-5" />
                          )}
                        </button>
                        {profile.avatar && (
                          <button
                            onClick={handleAvatarDelete}
                            disabled={isUploading}
                            className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete avatar"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>

                      {/* Upload Progress Overlay */}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <div className="text-center text-white">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1" />
                            <p className="text-xs font-medium">Uploading...</p>
                          </div>
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Client-side validation
                            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                            const maxSize = 5 * 1024 * 1024; // 5MB

                            if (!allowedTypes.includes(file.type)) {
                              showError("Please select a valid image file (JPEG, PNG, or WebP)");
                              e.target.value = '';
                              return;
                            }

                            if (file.size > maxSize) {
                              showError("File size must be less than 5MB");
                              e.target.value = '';
                              return;
                            }

                            // If validation passes, proceed with upload
                            handleAvatarUpload(e);
                          }
                        }}
                        className="hidden"
                      />
                    </div>

                    {/* Name and Verification */}
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate max-w-full">{profile.name}</h2>
                      {profile.verified && (
                        <div className="relative">
                          <CheckCircle className="h-6 w-6 text-green-500 animate-pulse" />
                          <div className="absolute inset-0 h-6 w-6 bg-green-500 rounded-full animate-ping opacity-20"></div>
                        </div>
                      )}
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium truncate max-w-full">{profile.email}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-4 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full inline-block">{profile.employeeCode}</p>

                    {/* Role Badge */}
                    <div className="flex justify-center mb-6">
                      <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-4 py-1 capitalize font-medium">
                        <Crown className="h-4 w-4 mr-2" />
                        {profile.role}
                      </Badge>
                    </div>

                    {/* Profile Completeness */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-gray-700 dark:text-gray-300">Profile Completeness</span>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">{profile.profileCompleteness}%</span>
                      </div>
                      <Progress
                        value={profile.profileCompleteness}
                        className="h-3 bg-gray-200 dark:bg-gray-700"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Complete your profile to unlock all features
                      </p>
                    </div>

                    {/* Avatar Info */}
                    {profile.avatar && (
                      <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <ImageIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Avatar Information</span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                          {profile.avatarFileName && (
                            <p><span className="font-medium">File:</span> {profile.avatarFileName}</p>
                          )}
                          {profile.avatarFileSize && (
                            <p><span className="font-medium">Size:</span> {(profile.avatarFileSize / 1024).toFixed(1)} KB</p>
                          )}
                          {profile.avatarMimeType && (
                            <p><span className="font-medium">Type:</span> {profile.avatarMimeType.toUpperCase()}</p>
                          )}
                          {profile.avatarUploadedAt && (
                            <p><span className="font-medium">Uploaded:</span> {new Date(profile.avatarUploadedAt).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Total Leads</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Active leads this month</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {profile.stats?.totalLeads ?? 0}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Opportunities</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Pipeline value</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {profile.stats?.totalOpportunities ?? 0}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Attendance Rate</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">This month</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {profile.stats?.attendanceRate ?? 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Right Column - Main Content */}
            <div className="lg:col-span-2">

              <Tabs defaultValue="overview" className="space-y-6" value={activeTab} onValueChange={setActiveTab}>

                {/* Tab Navigation */}
                <TabsList className="grid w-full grid-cols-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 p-1 shadow-lg">
                  <TabsTrigger
                    value="overview"
                    className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
                  >
                    <User className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </TabsTrigger>
                  <TabsTrigger
                    value="privacy"
                    className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
                  >
                    <Shield className="h-4 w-4" />
                    Privacy
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
                  >
                    <Activity className="h-4 w-4" />
                    Activity
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">

                  {/* Personal Information */}
                  <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5 text-blue-600" />
                          Personal Information
                        </CardTitle>
                        <CardDescription>Your basic profile details and contact information</CardDescription>
                      </div>
                      <Button
                        variant={isEditing ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                        className={isEditing ? "" : "hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"}
                      >
                        {isEditing ? <X className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                        {isEditing ? 'Cancel' : 'Edit Profile'}
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {isEditing ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="name" className="text-sm font-medium">
                                Full Name *
                              </Label>
                              <Input
                                id="name"
                                value={editForm.name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                className={formErrors.name ? "border-red-500 focus:border-red-500" : ""}
                                placeholder="Enter your full name"
                              />
                              {formErrors.name && (
                                <p className="text-sm text-red-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {formErrors.name}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="department" className="text-sm font-medium">
                                Department
                              </Label>
                              <Input
                                id="department"
                                value={editForm.department}
                                onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                                placeholder="e.g. Sales, Marketing"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="phone" className="text-sm font-medium">
                                Phone Number
                              </Label>
                              <Input
                                id="phone"
                                value={editForm.phone}
                                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                className={formErrors.phone ? "border-red-500 focus:border-red-500" : ""}
                                placeholder="+1 (555) 123-4567"
                              />
                              {formErrors.phone && (
                                <p className="text-sm text-red-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {formErrors.phone}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="location" className="text-sm font-medium">
                                Location
                              </Label>
                              <Input
                                id="location"
                                value={editForm.location}
                                onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                                placeholder="City, State/Country"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="bio" className="text-sm font-medium">
                              Bio
                            </Label>
                            <Textarea
                              id="bio"
                              value={editForm.bio}
                              onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                              rows={4}
                              className={formErrors.bio ? "border-red-500 focus:border-red-500" : ""}
                              placeholder="Tell us about yourself, your role, and your experience..."
                            />
                            {formErrors.bio && (
                              <p className="text-sm text-red-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {formErrors.bio}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {editForm.bio.length}/500 characters
                            </p>
                          </div>

                          <div className="flex gap-3 pt-4 border-t">
                            <Button
                              onClick={handleSaveProfile}
                              disabled={isSaving}
                              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Saving Changes...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  Save Changes
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsEditing(false);
                                setFormErrors({});
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                                  <User className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</p>
                                  <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">{profile.name}</p>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                                  <Mail className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email Address</p>
                                  <p className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-full">{profile.email}</p>
                                </div>
                              </div>
                            </div>

                            {profile.phone && (
                              <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                                    <Phone className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone Number</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">{profile.phone}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {profile.location && (
                              <div className="p-4 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-800">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                                    <MapPin className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">{profile.location}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {profile.bio && (
                            <div className="p-6 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border border-gray-200 dark:border-gray-700">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-gray-500 flex items-center justify-center">
                                  <FileText className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">About Me</p>
                                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed break-words">{profile.bio}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Account Information */}
                  <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        Account Information
                      </CardTitle>
                      <CardDescription>Account details, security status, and membership information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border border-indigo-200 dark:border-indigo-800">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center">
                              <Calendar className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Member Since</p>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {new Date(profile.joinDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border border-emerald-200 dark:border-emerald-800">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                              <Shield className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Status</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={profile.verified ? "default" : "secondary"} className="flex items-center gap-1">
                                  {profile.verified ? (
                                    <>
                                      <CheckCircle className="h-3 w-3" />
                                      Verified
                                    </>
                                  ) : (
                                    'Pending Verification'
                                  )}
                                </Badge>
                                {profile.twoFactorEnabled && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Zap className="h-3 w-3" />
                                    2FA Enabled
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Account Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {Math.floor((new Date().getTime() - new Date(profile.joinDate).getTime()) / (1000 * 60 * 60 * 24))}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Days Active</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {(profile.stats?.totalLeads ?? 0) + (profile.stats?.totalOpportunities ?? 0)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Tasks Completed</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {profile.stats?.attendanceRate ?? 0}%
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Success Rate</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-6">

                  <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-blue-600" />
                        Account Settings
                      </CardTitle>
                      <CardDescription>Manage your account preferences, security settings, and authentication</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">

                      {/* Password Change */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2">
                          <Key className="h-5 w-5 text-blue-600" />
                          <h4 className="text-lg font-semibold">Change Password</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="current-password" className="text-sm font-medium">
                              Current Password *
                            </Label>
                            <Input
                              id="current-password"
                              type="password"
                              value={passwordForm.currentPassword}
                              onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                              className={formErrors.currentPassword ? "border-red-500 focus:border-red-500" : ""}
                              placeholder="Enter current password"
                            />
                            {formErrors.currentPassword && (
                              <p className="text-sm text-red-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {formErrors.currentPassword}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-password" className="text-sm font-medium">
                              New Password *
                            </Label>
                            <Input
                              id="new-password"
                              type="password"
                              value={passwordForm.newPassword}
                              onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                              className={formErrors.newPassword ? "border-red-500 focus:border-red-500" : ""}
                              placeholder="Enter new password"
                            />
                            {formErrors.newPassword && (
                              <p className="text-sm text-red-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {formErrors.newPassword}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password" className="text-sm font-medium">
                            Confirm New Password *
                          </Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            className={formErrors.confirmPassword ? "border-red-500 focus:border-red-500" : ""}
                            placeholder="Confirm new password"
                          />
                          {formErrors.confirmPassword && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {formErrors.confirmPassword}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={handlePasswordChange}
                          disabled={isChangingPassword}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                          {isChangingPassword ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Updating Password...
                            </>
                          ) : (
                            <>
                              <Key className="h-4 w-4 mr-2" />
                              Update Password
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Two-Factor Authentication */}
                      <div className="p-6 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                              <Shield className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Add an extra layer of security to your account with 2FA
                              </p>
                              {profile.twoFactorEnabled && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  2FA is currently enabled
                                </p>
                              )}
                            </div>
                          </div>
                          <Switch
                            checked={profile.twoFactorEnabled}
                            onCheckedChange={handleToggle2FA}
                            disabled={isToggling2FA}
                          />
                        </div>
                        {isToggling2FA && (
                          <div className="mt-4 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Updating 2FA settings...
                          </div>
                        )}
                      </div>

                      {/* Notification Preferences */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2">
                          <Bell className="h-5 w-5 text-blue-600" />
                          <h4 className="text-lg font-semibold">Notification Preferences</h4>
                        </div>
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                                  <Mail className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</span>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">Receive updates via email</p>
                                </div>
                              </div>
                              <Switch defaultChecked />
                            </div>
                          </div>

                          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                                  <Activity className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">Activity Updates</span>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">Get notified about your activity</p>
                                </div>
                              </div>
                              <Switch defaultChecked />
                            </div>
                          </div>

                          <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                                  <TrendingUp className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">Performance Reports</span>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">Weekly performance summaries</p>
                                </div>
                              </div>
                              <Switch />
                            </div>
                          </div>
                        </div>
                      </div>

                    </CardContent>
                  </Card>

                </TabsContent>

                {/* Privacy Tab */}
                <TabsContent value="privacy" className="space-y-6">

                  <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        Privacy Settings
                      </CardTitle>
                      <CardDescription>Control who can see your information, activity, and manage your data</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">

                      {/* Profile Visibility */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Globe className="h-5 w-5 text-blue-600" />
                          <h4 className="text-lg font-semibold">Profile Visibility</h4>
                        </div>
                        <div className="p-6 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
                          <Select
                            value={privacySettings.profileVisibility}
                            onValueChange={(value: any) => handlePrivacyChange('profileVisibility', value)}
                          >
                            <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="public" className="cursor-pointer">
                                <div className="flex items-center gap-3 py-2">
                                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                    <Globe className="h-4 w-4 text-white" />
                                  </div>
                                  <div>
                                    <p className="font-medium">Public</p>
                                    <p className="text-xs text-gray-500">Visible to everyone in the organization</p>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="team" className="cursor-pointer">
                                <div className="flex items-center gap-3 py-2">
                                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                    <Users className="h-4 w-4 text-white" />
                                  </div>
                                  <div>
                                    <p className="font-medium">Team Only</p>
                                    <p className="text-xs text-gray-500">Visible to team members only</p>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="private" className="cursor-pointer">
                                <div className="flex items-center gap-3 py-2">
                                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                                    <Lock className="h-4 w-4 text-white" />
                                  </div>
                                  <div>
                                    <p className="font-medium">Private</p>
                                    <p className="text-xs text-gray-500">Only visible to you</p>
                                  </div>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Information Visibility */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2">
                          <Eye className="h-5 w-5 text-blue-600" />
                          <h4 className="text-lg font-semibold">
                            Information Visibility
                            {isAdminView && (
                              <span className="ml-2 text-sm font-normal text-red-600 dark:text-red-400">
                                (Admin View)
                              </span>
                            )}
                          </h4>
                        </div>
                        {isAdminView && (
                          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
                              <p className="text-sm text-red-700 dark:text-red-300">
                                <strong>Admin Override Active:</strong> You can see all information regardless of the user&apos;s privacy settings.
                                Privacy controls are disabled to maintain transparency.
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                                  <Mail className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    Email Address
                                    {isAdminView && (
                                      <span className="ml-2 text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-2 py-1 rounded">
                                        Admin Override
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    Allow others to see your email
                                    {isAdminView && (
                                      <span className="text-red-500 dark:text-red-400 font-medium">
                                        (Admins can always see)
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                checked={privacySettings.showEmail}
                                onCheckedChange={(checked: boolean) => handlePrivacyChange('showEmail', checked)}
                                disabled={isAdminView}
                              />
                            </div>
                          </div>

                          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                                  <Phone className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    Phone Number
                                    {isAdminView && (
                                      <span className="ml-2 text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-2 py-1 rounded">
                                        Admin Override
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    Allow others to see your phone
                                    {isAdminView && (
                                      <span className="text-red-500 dark:text-red-400 font-medium">
                                        (Admins can always see)
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                checked={privacySettings.showPhone}
                                onCheckedChange={(checked: boolean) => handlePrivacyChange('showPhone', checked)}
                                disabled={isAdminView}
                              />
                            </div>
                          </div>

                          <div className="p-4 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-800">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                                  <MapPin className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    Location
                                    {isAdminView && (
                                      <span className="ml-2 text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-2 py-1 rounded">
                                        Admin Override
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    Allow others to see your location
                                    {isAdminView && (
                                      <span className="text-red-500 dark:text-red-400 font-medium">
                                        (Admins can always see)
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                checked={privacySettings.showLocation}
                                onCheckedChange={(checked: boolean) => handlePrivacyChange('showLocation', checked)}
                                disabled={isAdminView}
                              />
                            </div>
                          </div>

                          <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                                  <Activity className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    Activity Feed
                                    {isAdminView && (
                                      <span className="ml-2 text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-2 py-1 rounded">
                                        Admin Override
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    Allow others to see your activity
                                    {isAdminView && (
                                      <span className="text-red-500 dark:text-red-400 font-medium">
                                        (Admins can always see)
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                checked={privacySettings.showActivity}
                                onCheckedChange={(checked: boolean) => handlePrivacyChange('showActivity', checked)}
                                disabled={isAdminView}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Data Management */}
                      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-4">
                          <Download className="h-5 w-5 text-blue-600" />
                          <h4 className="text-lg font-semibold">Data Management</h4>
                        </div>
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border border-indigo-200 dark:border-indigo-800">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center">
                                  <Download className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">Export Your Data</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">Download all your profile data and activity</p>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" className="bg-white dark:bg-gray-800">
                                <Download className="h-4 w-4 mr-2" />
                                Export
                              </Button>
                            </div>
                          </div>

                          <div className="p-4 rounded-lg bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                                  <Trash2 className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">Delete Account</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">Permanently delete your account and all data</p>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" className="bg-white dark:bg-gray-800 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                    </CardContent>
                  </Card>

                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="space-y-6">

                  <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription>Your recent actions, updates, and system events</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {activities.length > 0 ? (
                          activities.map((activity) => {
                            const IconComponent = getActivityIcon(activity.type);
                            const activityColors = {
                              attendance: { bg: 'bg-green-100 dark:bg-green-900/30', icon: 'text-green-600 dark:text-green-400' },
                              lead: { bg: 'bg-blue-100 dark:bg-blue-900/30', icon: 'text-blue-600 dark:text-blue-400' },
                              opportunity: { bg: 'bg-purple-100 dark:bg-purple-900/30', icon: 'text-purple-600 dark:text-purple-400' },
                              default: { bg: 'bg-gray-100 dark:bg-gray-900/30', icon: 'text-gray-600 dark:text-gray-400' }
                            };
                            const colors = activityColors[activity.type as keyof typeof activityColors] || activityColors.default;

                            return (
                              <div key={activity.id} className="flex items-start gap-4 p-6 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                                <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center shadow-sm`}>
                                  <IconComponent className={`h-6 w-6 ${colors.icon}`} />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed break-words">{activity.description}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Clock className="h-3 w-3 text-gray-400" />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatTimeAgo(activity.timestamp)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                              <Activity className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Activity Yet</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Your recent activities will appear here as you use the system.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Load More Button */}
                      {activities.length > 0 && (
                        <div className="flex justify-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <Button variant="outline" className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Load More Activity
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </TabsContent>

              </Tabs>

            </div>

          </div>

        </div>
      </div>
    </>
  );
}
