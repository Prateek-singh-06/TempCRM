"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import { DailyFollowUpForm } from "@/components/forms/DailyFollowUpForm";

import {
  Camera,
  Upload,
  Calendar,
  User,
  IdCard,
  FileText,
  MapPin,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Navigation,
  Smartphone,
  Shield
} from "lucide-react";
import { generateDeviceFingerprint, extractExifData } from "@/lib/attendance/validation";
import { getTodayIST, isWithinSubmissionWindow, isLateSubmission } from "@/lib/config";
import {
  getLocationDisplay,
  formatCoordinates,
  LocationInfo,
  getComprehensiveLocation,
  getLocationPermissionStatus,
  diagnoseGPSIssues,
  checkPermissionsPolicy
} from "@/lib/location";

async function safeJson(response: Response) {
  if (!response.ok) {
    // throw new Error(`HTTP error! status: ${response.status}`);
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

interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  locationInfo?: LocationInfo;
}

interface ValidationResult {
  warnings: string[];
  metadata: any;
}

interface DailyFollowUpOption {
  id: string;
  actionType: string;
  actionDescription: string;
  followUpDate: string;
  status: string;
  notes?: string;
}

export default function AttendancePage() {
  const [visitReport, setVisitReport] = useState("");
  const [timelineUrl, setTimelineUrl] = useState("");
  const [timelineScreenshotUrl, setTimelineScreenshotUrl] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [geolocation, setGeolocation] = useState<GeolocationData | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationMethod, setLocationMethod] = useState<'GPS' | 'IP' | 'Fallback' | null>(null);
  const [locationWarnings, setLocationWarnings] = useState<string[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [deviceFingerprint, setDeviceFingerprint] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [submissionProgress, setSubmissionProgress] = useState(0);
  const [exifData, setExifData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string; employeeCode: string; email: string; role?: string } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [followUpFormData, setFollowUpFormData] = useState({
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
  const [followUpMode, setFollowUpMode] = useState<'new' | 'existing'>("new");
  const [availableFollowUps, setAvailableFollowUps] = useState<DailyFollowUpOption[]>([]);
  const [selectedExistingFollowUpId, setSelectedExistingFollowUpId] = useState("");
  const [isLoadingFollowUps, setIsLoadingFollowUps] = useState(false);
  const [followUpFetchError, setFollowUpFetchError] = useState<string | null>(null);

  const todayDisplay = getTodayIST().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });



  // Mock user data
  

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const submissionWindowStatus = isWithinSubmissionWindow()
    ? { status: 'on-time', message: 'Within submission window (05:00-13:00 IST)' }
    : isLateSubmission()
    ? { status: 'late', message: 'Late submission - after 13:00 IST' }
    : { status: 'early', message: 'Early submission - before 05:00 IST' };

  // Load user data on component mount
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }

    // Generate device fingerprint
    const fingerprint = generateDeviceFingerprint();
    setDeviceFingerprint(fingerprint);

    // Run comprehensive GPS diagnostics
    const diagnostics = diagnoseGPSIssues();

    console.log('🔍 GPS Diagnostics Results:');
    console.log('  - Permissions Policy:', diagnostics.permissionsPolicyCheck.details);

    if (diagnostics.permissionsPolicyCheck.hasPermissionsPolicy) {
      console.warn('🚫 Permissions policy blocking GPS - will use IP fallback');
      setPermissionStatus('blocked');
      setLocationError('Geolocation is blocked by browser permissions policy. Location will work via IP address.');
    } else if (diagnostics.recommendations.length > 0) {
      console.log('⚠️ GPS Issues detected:', diagnostics.recommendations);
      setLocationError(`GPS Issues: ${diagnostics.recommendations.join(', ')}`);
    } else {
      console.log('✅ GPS diagnostics passed - GPS should work');
    }

    // Check initial permission status and request geolocation
    checkPermissionAndRequestLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetchTodaysFollowUps = async () => {
      setIsLoadingFollowUps(true);
      setFollowUpFetchError(null);
      try {
        const response = await fetch('/api/daily-followups?period=week');
        const data = await safeJson(response);

        if (response.ok && data?.dailyFollowUps) {
          const todaysFollowUps = (data.dailyFollowUps as any[]).filter((followUp) => followUp?.isToday);
          const normalized: DailyFollowUpOption[] = todaysFollowUps.map((followUp) => ({
            id: String(followUp.id),
            actionType: followUp.actionType,
            actionDescription: followUp.actionDescription,
            followUpDate: followUp.followUpDate,
            status: followUp.status,
            notes: followUp.notes,
          }));

          setAvailableFollowUps(normalized);
          if (normalized.length > 0) {
            setSelectedExistingFollowUpId((prev) => prev || normalized[0].id);
            setFollowUpMode((prev) => (prev === 'new' ? 'existing' : prev));
          }
        } else {
          const message = data?.error || 'Unable to load follow-ups for today.';
          setFollowUpFetchError(message);
          setAvailableFollowUps([]);
        }
      } catch (error) {
        console.error('Failed to load follow-ups for today:', error);
        setFollowUpFetchError('Failed to load follow-ups for today.');
        setAvailableFollowUps([]);
      } finally {
        setIsLoadingFollowUps(false);
      }
    };

    fetchTodaysFollowUps();
  }, []);

  // Check if user is admin
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'SuperAdmin';

  // Location tracking is for admin insights only - no bounds enforcement for any user

  // Enhanced geolocation functions
  const checkPermissionAndRequestLocation = async () => {
    try {
      // Check permission status but don't rely on it - always try GPS first
      const status = await getLocationPermissionStatus();
      console.log('📍 Initial permission status:', status);

      // Always try to get location first - this will trigger permission dialog if needed
      await requestEnhancedGeolocation();

    } catch (error) {
      console.error('Failed to check permission status:', error);

      // Better error logging
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error message:', (error as any)?.message);
      console.error('Error code:', (error as any)?.code);
      console.error('Error name:', (error as any)?.name);

      // Fallback to enhanced geolocation even if permission check fails
      await requestEnhancedGeolocation();
    }
  };

  const requestEnhancedGeolocation = async () => {
    setIsGettingLocation(true);
    setLocationError(null);
    setLocationWarnings([]);

    try {
      console.log('🚀 Starting enhanced geolocation process...');
      const result = await getComprehensiveLocation();

      // Set location data
      if (result.location) {
        const geoData: GeolocationData = {
          latitude: result.location.latitude,
          longitude: result.location.longitude,
          accuracy: result.location.accuracy || 0,
          timestamp: result.location.timestamp || Date.now(),
          locationInfo: result.location
        };

        setGeolocation(geoData);
        setLocationMethod(result.method);
        setLocationWarnings(result.warnings);

        console.log(`✅ Location obtained via ${result.method}:`, result.location);
      }

    } catch (error) {
      // Silent error handling for better user experience
      console.log('ℹ️ Enhanced geolocation failed - using fallback');

      if (error && typeof error === 'object' && 'code' in error) {
        const geoError = error as GeolocationPositionError;

        // Try direct property access for better reliability
        const directCode = geoError.code;
        const directMessage = geoError.message;

        // Log detailed error information
        console.log('ℹ️ GPS error received:', {
          code: geoError.code,
          message: geoError.message,
          directCode: directCode,
          directMessage: directMessage,
          hasCode: !!geoError.code,
          hasMessage: !!geoError.message,
          errorString: String(geoError)
        });

        // Check for permissions policy error (most common issue)
        const isPermissionsPolicyError = directMessage && (
          directMessage.includes('permissions policy') ||
          directMessage.includes('blocked because of a permissions policy') ||
          directMessage.includes('Geolocation has been disabled')
        );

        if (isPermissionsPolicyError) {
          console.log('ℹ️ Permissions policy violation detected - GPS blocked by browser/server policy');
          setPermissionStatus('blocked');
          setLocationError('Geolocation is blocked by browser permissions policy. This is a browser/server security setting.');
          await requestEnhancedGeolocation(); // Silent fallback to IP
          return;
        }

        // Handle empty error object (common issue)
        if (!geoError.code && !geoError.message) {
          console.log('ℹ️ Empty GPS error object - likely permissions policy or browser issue');
          setPermissionStatus('blocked');
          setLocationError('GPS access blocked by browser security settings.');
          await requestEnhancedGeolocation(); // Silent fallback to IP
          return;
        }

        switch (geoError.code) {
          case 1: // PERMISSION_DENIED
            if (isPermissionsPolicyError) {
              console.log('ℹ️ Permissions policy active - GPS blocked');
              setPermissionStatus('blocked');
              setLocationError('Geolocation is blocked by browser permissions policy. Contact system administrator.');
            } else {
              console.log('ℹ️ GPS permission denied by user');
              setPermissionStatus('denied');
              setLocationError('GPS permission was denied. Please enable location access in browser settings.');
            }
            await requestEnhancedGeolocation();
            break;
          case 2: // POSITION_UNAVAILABLE
            console.log('ℹ️ Location unavailable - using IP fallback');
            setPermissionStatus('unavailable');
            setLocationError(null);
            break;
          case 3: // TIMEOUT
            console.log('ℹ️ Location request timed out - using IP fallback');
            setPermissionStatus('timeout');
            setLocationError(null);
            break;
          default:
            console.log('ℹ️ Location request failed - using IP fallback');
            setPermissionStatus('error');
            setLocationError(null);
        }
      } else {
        console.log('ℹ️ Location error - using IP fallback');
        setPermissionStatus('denied');
        setLocationError(null);
      }

      // Set fallback location
      const fallbackLocation: LocationInfo = {
        latitude: 20.5937, // Center of India
        longitude: 78.9629,
        displayName: 'Location Unavailable',
        country: 'India',
        source: 'fallback',
        confidence: 0.0,
        accuracyLevel: 'Unknown',
        locationProvider: 'Fallback',
        timestamp: Date.now(),
        isValidLocation: false,
        locationSource: 'Fallback'
      };

      const geoData: GeolocationData = {
        latitude: fallbackLocation.latitude,
        longitude: fallbackLocation.longitude,
        accuracy: 0,
        timestamp: fallbackLocation.timestamp || Date.now(),
        locationInfo: fallbackLocation
      };

      setGeolocation(geoData);
      setLocationMethod('Fallback');
      setLocationWarnings(['Location services unavailable - using fallback location']);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const validateTimelineUrl = (url: string): boolean => {
    const pattern = /^https:\/\/(www\.)?(google\.com\/maps|maps\.app\.goo\.gl)/;
    return pattern.test(url);
  };

  // Manual GPS test function for debugging
  const testGPSDirectly = async () => {
    console.log('🧪 Testing GPS directly with high accuracy...');

    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        console.log('📡 Calling navigator.geolocation.getCurrentPosition with high accuracy...');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log('✅ Direct GPS call successful:', {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: new Date(pos.timestamp).toLocaleTimeString()
            });
            resolve(pos);
          },
          (err) => {
            console.error('❌ Direct GPS call failed:', {
              code: err.code,
              message: err.message
            });
            reject(err);
          },
          {
            enableHighAccuracy: true,
            timeout: 20000, // Longer timeout for high accuracy
            maximumAge: 0 // Force fresh location
          }
        );
      });

      console.log('🎯 GPS coordinates obtained with high accuracy:', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: `${Math.round(position.coords.accuracy)}m`,
        altitude: position.coords.altitude,
        speed: position.coords.speed
      });

      setLocationError(null);
      await requestEnhancedGeolocation(); // Try the full flow

    } catch (error) {
      console.error('❌ Direct GPS test failed:', error);

      let errorMessage = 'GPS test failed';
      if (error && typeof error === 'object' && 'code' in error) {
        const geoError = error as GeolocationPositionError;
        switch (geoError.code) {
          case 1:
            errorMessage = 'GPS permission denied - please enable location access';
            break;
          case 2:
            errorMessage = 'GPS unavailable - check device GPS settings or move to open area';
            break;
          case 3:
            errorMessage = 'GPS timed out - weak signal or indoors';
            break;
          default:
            errorMessage = `GPS error (${geoError.code}): ${geoError.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = `GPS test failed: ${error.message}`;
      }

      setLocationError(errorMessage);
    }
  };

  // Manual GPS permission request function
  const requestGPSPermission = async () => {
    console.log('🔄 Manually requesting GPS permission...');

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000
        });
      });

      console.log('✅ GPS permission granted manually!');
      setPermissionStatus('granted');

      // Now get enhanced location data
      const result = await getComprehensiveLocation();

      if (result.location) {
        const geoData: GeolocationData = {
          latitude: result.location.latitude,
          longitude: result.location.longitude,
          accuracy: result.location.accuracy || position.coords.accuracy,
          timestamp: result.location.timestamp || position.timestamp,
          locationInfo: result.location
        };

        setGeolocation(geoData);
        setLocationMethod(result.method);
        setLocationWarnings(result.warnings);

        console.log(`✅ Manual GPS location obtained:`, result.location);
      }

    } catch (error) {
      // Silent error handling for manual GPS request
      console.log('ℹ️ Manual GPS request failed - using IP fallback');

      if (error && typeof error === 'object' && 'code' in error) {
        const geoError = error as GeolocationPositionError;

        // Handle permissions policy silently
        if (geoError.message && geoError.message.includes('permissions policy')) {
          console.log('ℹ️ Permissions policy active - manual GPS blocked');
          setPermissionStatus('blocked');
          setLocationError(null);
          await requestEnhancedGeolocation();
          return;
        }

        switch (geoError.code) {
          case 1: // PERMISSION_DENIED
            if (geoError.message && geoError.message.includes('permissions policy')) {
              console.log('ℹ️ Permissions policy active - manual GPS blocked');
              setPermissionStatus('blocked');
              setLocationError(null);
            } else {
              console.log('ℹ️ Manual GPS permission denied by user');
              setPermissionStatus('denied');
              setLocationError(null);
            }
            await requestEnhancedGeolocation();
            break;
          case 2: // POSITION_UNAVAILABLE
            console.log('ℹ️ Manual GPS position unavailable');
            setPermissionStatus('unavailable');
            setLocationError(null);
            await requestEnhancedGeolocation();
            break;
          case 3: // TIMEOUT
            console.log('ℹ️ Manual GPS request timed out');
            setPermissionStatus('timeout');
            setLocationError(null);
            await requestEnhancedGeolocation();
            break;
          default:
            console.log('ℹ️ Manual GPS request failed');
            setPermissionStatus('error');
            setLocationError(null);
            await requestEnhancedGeolocation();
        }
      } else {
        console.log('ℹ️ Manual GPS error - using IP fallback');
        setPermissionStatus('denied');
        setLocationError(null);
        await requestEnhancedGeolocation();
      }

      // Fall back to IP-based location
      console.log('🌐 Falling back to IP-based location...');
      try {
        const result = await getComprehensiveLocation();
        if (result.location) {
          const geoData: GeolocationData = {
            latitude: result.location.latitude,
            longitude: result.location.longitude,
            accuracy: result.location.accuracy || 0,
            timestamp: result.location.timestamp || Date.now(),
            locationInfo: result.location
          };

          setGeolocation(geoData);
          setLocationMethod(result.method);
          setLocationWarnings(result.warnings);
        }
      } catch (fallbackError) {
        console.error('❌ Fallback location also failed:', fallbackError);
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleTimelineUrlChange = (value: string) => {
    setTimelineUrl(value);

    // Basic validation feedback
    if (value && !validateTimelineUrl(value)) {
      // Could show a warning here
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);

      // Extract EXIF data for validation
      try {
        const extractedExif = await extractExifData(file);
        setExifData(extractedExif);
      } catch (error) {
        console.error('Failed to extract EXIF data:', error);
        setExifData(null);
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          setPhotoPreview(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Enhanced validation
    if (!visitReport.trim()) {
      alert("Please provide a visit report");
      return;
    }

    if (!selectedPhoto) {
      alert("Please capture or upload a Geo-tag selfie");
      return;
    }

    // Check evidence requirement: at least one of timeline URL or screenshot
    if (!timelineUrl.trim() && !timelineScreenshotUrl.trim()) {
      alert("Please provide either a timeline URL or upload a timeline screenshot");
      return;
    }

    // Validate followup form
    if (followUpMode === 'new') {
      if (
        !followUpFormData.description ||
        !followUpFormData.nextAction ||
        !followUpFormData.nextActionDate
      ) {
        alert("Please fill out all required fields in the Daily Follow-up form.");
        return;
      }
    } else if (!selectedExistingFollowUpId) {
      alert("Please select today's follow-up or switch to creating a new one.");
      return;
    }

    // Validate timeline URL if provided
    if (timelineUrl.trim() && !validateTimelineUrl(timelineUrl)) {
      alert("Please provide a valid Google Maps timeline URL");
      return;
    }

    setIsSubmitting(true);
    setSubmissionProgress(0);

    try {
      // File upload will be implemented later

      // Convert photo to data URL for now (later we'll implement proper file storage)
      const photoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(selectedPhoto);
      });

      setSubmissionProgress(30);

      // Prepare enhanced submission data with comprehensive geolocation
      const submissionData = {
        visitReport: visitReport.trim(),
        timelineUrl: timelineUrl.trim() || undefined,
        timelineScreenshotUrl: timelineScreenshotUrl.trim() || undefined,
        selfieUrl: photoDataUrl, // Use photoDataUrl variable
        clientLat: geolocation?.latitude,
        clientLng: geolocation?.longitude,
        clientAccuracyM: geolocation?.accuracy,
        deviceFingerprint,
        exifTakenAt: exifData?.dateTimeOriginal,

        // Enhanced geolocation data
        clientLocationInfo: geolocation?.locationInfo,
        clientLocationMethod: locationMethod,
        clientLocationWarnings: locationWarnings,
        clientLocationTimestamp: geolocation?.timestamp,
        clientAltitude: geolocation?.locationInfo?.altitude,
        clientSpeed: geolocation?.locationInfo?.speed,
        clientHeading: geolocation?.locationInfo?.heading,
        clientLocationAccuracyLevel: geolocation?.locationInfo?.accuracyLevel,
        clientLocationProvider: geolocation?.locationInfo?.locationProvider,
        clientAddress: geolocation?.locationInfo?.address,
        clientCity: geolocation?.locationInfo?.city,
        clientState: geolocation?.locationInfo?.state,
        clientCountry: geolocation?.locationInfo?.country,
        clientPostalCode: geolocation?.locationInfo?.postalCode,
      };
      
      const followUpPayload =
        followUpMode === 'existing'
          ? { mode: 'existing', id: selectedExistingFollowUpId }
          : { mode: 'new', ...followUpFormData };

      const combinedData = {
        ...submissionData,
        followUp: followUpPayload
      };

      // Log location data for debugging
      console.log('📍 Submitting attendance with location data:', {
        latitude: geolocation?.latitude,
        longitude: geolocation?.longitude,
        accuracy: geolocation?.accuracy,
        method: locationMethod,
        displayName: geolocation?.locationInfo?.displayName,
        hasLocationInfo: !!geolocation?.locationInfo,
        hasCity: !!geolocation?.locationInfo?.city,
        hasAddress: !!geolocation?.locationInfo?.address,
        warnings: locationWarnings
      });

      setSubmissionProgress(60);

      // Submit to API
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(combinedData),
      });

      const result = await response.json();

      setSubmissionProgress(90);

      if (!response.ok) {
        throw new Error(result.error || 'Submission failed');
      }

      // Store validation result
      if (result.validation) {
        setValidationResult(result.validation);
      }

      setSubmissionProgress(100);

      // Success
      setHasSubmittedToday(true);

      // Clear form
      handleReset();

    } catch (error) {
      console.error('Submission error:', error);
      alert(`Submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
      setSubmissionProgress(0);
    }
  };

  const handleReset = () => {
    setVisitReport("");
    setTimelineUrl("");
    setTimelineScreenshotUrl("");
    setSelectedPhoto(null);
    setPhotoPreview("");
    setValidationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
    setFollowUpFormData({
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
    setFollowUpMode('new');
    setSelectedExistingFollowUpId('');
  };

if (hasSubmittedToday) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Attendance Submitted Successfully</CardTitle>
            <CardDescription>
              Your attendance has been saved with location tracking information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="font-medium">{todayDisplay}</span>
              </div>

              {/* Location Information */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Location Verified</span>
                  {locationMethod && (
                    <Badge variant="outline" className={`text-xs ${
                      locationMethod === 'GPS' ? 'border-green-300 text-green-700' :
                      locationMethod === 'IP' ? 'border-blue-300 text-blue-700' :
                      'border-yellow-300 text-yellow-700'
                    }`}>
                      {locationMethod === 'GPS' ? 'GPS Tracked' :
                       locationMethod === 'IP' ? 'IP-based' : 'Fallback'}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  {geolocation ? (
                    <>
                      <div className="font-medium text-blue-900 dark:text-blue-100">
                        📍 {geolocation.locationInfo?.displayName ||
                           getLocationDisplay(geolocation.locationInfo!) ||
                           formatCoordinates(geolocation.latitude, geolocation.longitude)}
                      </div>
                      {geolocation.locationInfo?.city && (
                        <div className="text-blue-600 dark:text-blue-400">
                          City: {geolocation.locationInfo.city}
                        </div>
                      )}
                      {geolocation.locationInfo?.address && (
                        <div className="text-blue-600 dark:text-blue-400">
                          Address: {geolocation.locationInfo.address}
                        </div>
                      )}
                      <div className="text-blue-600 dark:text-blue-400">
                        Coordinates: {formatCoordinates(geolocation.latitude, geolocation.longitude)}
                      </div>
                      <div className="text-blue-600 dark:text-blue-400">
                        Accuracy: ±{Math.round(geolocation.accuracy || 0)}m
                      </div>
                    </>
                  ) : (
                    <div className="text-blue-600 dark:text-blue-400">
                      Location tracking was not available during submission
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Submitted</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-muted-foreground">Time Saved</span>
                <span className="font-medium">09:30 AM</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = '/dashboard'}>
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Daily Attendance</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Submit your daily visit report and attendance</p>
        </div>

        {/* Date and User Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Today&apos;s Date</p>
                  <p className="font-medium">{today}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{currentUser?.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm">
                  <IdCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Employee Code</p>
                  <p className="font-semibold text-lg text-gray-900 dark:text-white">{currentUser?.employeeCode || 'Loading...'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Submission Window Status */}
          <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -mr-8 -mt-8"></div>
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shadow-sm ${
                  submissionWindowStatus.status === 'on-time'
                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                    : submissionWindowStatus.status === 'late'
                    ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                    : 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white'
                }`}>
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Submission Status</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">{submissionWindowStatus.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Geolocation Status */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -mr-8 -mt-8"></div>
            <CardContent className="p-4 relative z-10">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 ${
                  geolocation && locationMethod === 'GPS'
                    ? 'location-status-gps'
                    : geolocation && locationMethod === 'IP'
                    ? 'location-status-ip'
                    : geolocation && locationMethod === 'Fallback'
                    ? 'location-status-fallback'
                    : locationError
                    ? 'location-status-error'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400 shadow-gray-200'
                } ${
                  geolocation && locationMethod === 'GPS'
                    ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                    : geolocation && locationMethod === 'IP'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                    : geolocation && locationMethod === 'Fallback'
                    ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400'
                    : locationError
                    ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                    : ''
                }`}>
                  {isGettingLocation ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : geolocation ? (
                    <Navigation className="h-5 w-5" />
                  ) : locationError ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <Smartphone className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">Location Tracking</p>
                    {locationMethod && (
                      <Badge variant="outline" className={`text-xs ${
                        locationMethod === 'GPS' ? 'border-green-300 text-green-700' :
                        locationMethod === 'IP' ? 'border-blue-300 text-blue-700' :
                        'border-yellow-300 text-yellow-700'
                      }`}>
                        {locationMethod === 'GPS' ? 'GPS' :
                         locationMethod === 'IP' ? 'IP-based' : 'Fallback'}
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground mb-2">
                    {geolocation ? (
                      <>
                        <div className="font-medium text-foreground">
                          {geolocation.locationInfo?.displayName ||
                           (geolocation.locationInfo ? getLocationDisplay(geolocation.locationInfo) : null) ||
                           formatCoordinates(geolocation.latitude, geolocation.longitude)}
                        </div>
                        <div className="text-gray-500 mt-1 space-y-1">
                          <div className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            📍 {locationMethod === 'GPS' ? 'High-precision GPS location' :
                                locationMethod === 'IP' ? 'Approximate location (IP-based)' :
                                'Fallback location (limited accuracy)'}
                          </div>
                          {geolocation.locationInfo?.accuracyLevel && (
                            <div className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-600">
                              🎯 Accuracy: {geolocation.locationInfo.accuracyLevel}
                            </div>
                          )}
                        </div>
                      </>
                    ) : locationError ? (
                      <div className="text-red-600">
                        {locationError}
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        Detecting your location...
                      </div>
                    )}
                  </div>

                  {/* Location Warnings */}
                  {locationWarnings.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {locationWarnings.map((warning, index) => (
                        <div key={index} className="location-warning">
                          ⚠️ {warning}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-2">
                    {locationError && !isGettingLocation && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={requestEnhancedGeolocation}
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    )}

                    {geolocation && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={requestEnhancedGeolocation}
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        Refresh
                      </Button>
                    )}

                    {permissionStatus === 'denied' && !isGettingLocation && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-3 bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 hover:text-orange-800 mr-2"
                        onClick={testGPSDirectly}
                      >
                        <Smartphone className="h-3 w-3 mr-1" />
                        Test GPS
                      </Button>
                    )}

                    {(permissionStatus === 'denied' || permissionStatus === 'timeout') && !isGettingLocation && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-3 bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:text-red-800"
                        onClick={requestGPSPermission}
                      >
                        <Smartphone className="h-3 w-3 mr-1" />
                        Enable GPS
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-3 text-muted-foreground"
                      onClick={() => setLocationError(null)}
                      disabled={!locationError && !geolocation}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>

                  {/* Permission Status */}
                  {permissionStatus !== 'unknown' && (
                    <div className="mt-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Permission: </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            permissionStatus === 'granted' ? 'bg-green-100 text-green-700 border border-green-200' :
                            permissionStatus === 'denied' ? 'bg-red-100 text-red-700 border border-red-200' :
                            permissionStatus === 'blocked' ? 'bg-red-100 text-red-700 border border-red-200' :
                            permissionStatus === 'unavailable' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                            permissionStatus === 'timeout' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                            permissionStatus === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
                            'bg-yellow-100 text-yellow-700 border border-yellow-200'
                          }`}>
                            {permissionStatus === 'granted' ? '✅ Granted' :
                             permissionStatus === 'denied' ? '❌ Denied' :
                             permissionStatus === 'blocked' ? '🚫 Blocked' :
                             permissionStatus === 'unavailable' ? '📍 Unavailable' :
                             permissionStatus === 'timeout' ? '⏰ Timeout' :
                             permissionStatus === 'error' ? '❌ Error' :
                             '⏳ Prompt'}
                          </span>
                        </div>
                        {(permissionStatus === 'denied' || permissionStatus === 'timeout') && (
                          <div className="text-red-600 text-xs">
                            {permissionStatus === 'denied' ? 'Click "Enable GPS" to request permission' :
                             'Click "Enable GPS" to try again'}
                          </div>
                        )}
                        {permissionStatus === 'blocked' && (
                          <div className="text-red-600 text-xs">
                            Contact system administrator
                          </div>
                        )}
                        {permissionStatus === 'unavailable' && (
                          <div className="text-orange-600 text-xs">
                            Check GPS settings
                          </div>
                        )}
                      </div>
                      {permissionStatus === 'denied' && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          💡 If the permission dialog doesn&apos;t appear, check your browser settings or try refreshing the page.
                        </div>
                      )}
                      {permissionStatus === 'granted' && locationWarnings.some(w => w.includes('GPS geolocation failed')) && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          📍 GPS failed despite permission granted. Possible causes:<br/>
                          • Weak GPS signal (move outdoors)<br/>
                          • GPS disabled on device<br/>
                          • Indoor location blocking signal<br/>
                          • Device GPS hardware issue<br/>
                          💡 Try the &quot;Test GPS&quot; button above for detailed diagnostics.
                        </div>
                      )}
                      {permissionStatus === 'blocked' && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          ℹ️ Using IP-based location (GPS blocked by policy)
                        </div>
                      )}
                      {permissionStatus === 'unavailable' && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          📍 GPS position unavailable. Ensure you have GPS enabled and clear sky view.
                        </div>
                      )}
                      {permissionStatus === 'timeout' && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          ⏰ Request timed out. Check your internet connection and try again.
                        </div>
                      )}
                      {permissionStatus === 'error' && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          ❌ An unknown error occurred. Please try refreshing the page.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device Fingerprint */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 flex items-center justify-center">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Device</p>
                  <p className="text-xs text-muted-foreground">
                    {deviceFingerprint ? 'Verified' : 'Checking...'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submission Progress */}
        {isSubmitting && submissionProgress > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Submitting attendance...</span>
                  <span>{submissionProgress}%</span>
                </div>
                <Progress value={submissionProgress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validation Warnings */}
        {validationResult && validationResult.warnings.length > 0 && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle>Validation Warnings</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index} className="text-sm">{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Admin Exemption Notice */}
        {isAdmin && (
          <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800 dark:text-blue-200">Admin Exemption</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              As an administrator, you are exempt from daily attendance submission. You can monitor all user attendance through the Attendance Log or Attendance Review pages.
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/attendance-log'}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  View Attendance Log
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/attendance-review'}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  Review Submissions
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Alert */}
        {!isAdmin && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              All fields are mandatory. Please ensure your Google Timeline is shared and you have a clear Geo-tagged selfie photo ready.
              Your location is tracked for admin insights - you can submit attendance from anywhere.
            </AlertDescription>
          </Alert>
        )}

        {/* Attendance Form - Only show for non-admin users */}
        {!isAdmin && (
          <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Attendance Details</CardTitle>
              <CardDescription>
                Please fill in all the required information for today&apos;s attendance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Visit Report */}
              <div className="space-y-2">
                <Label htmlFor="visit-report" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Visit Report *
                </Label>
                <Textarea
                  id="visit-report"
                  placeholder="Describe your day's work, client visits, meetings, and accomplishments..."
                  value={visitReport}
                  onChange={(e) => setVisitReport(e.target.value)}
                  rows={6}
                  className="resize-none"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Minimum 50 characters required. Current: {visitReport.length} characters
                </p>
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <Label htmlFor="photo" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Geo-Tagged Photo (Selfie) *
                </Label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <input
                      ref={cameraInputRef}
                      type="file"
                      id="photo"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      required
                      aria-label="Upload photo"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {selectedPhoto ? "Change Photo" : "Upload Photo"}
                    </Button>
                                      {selectedPhoto && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Selected: {selectedPhoto.name}
                      </p>
                      {exifData && (
                        <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800 p-2 rounded">
                          <p>Photo taken: {new Date(exifData.dateTimeOriginal).toLocaleString()}</p>
                          {exifData.make && exifData.model && (
                            <p>Device: {exifData.make} {exifData.model}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                  {photoPreview && (
                    <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                      <Image
                        src={photoPreview}
                        alt="Preview"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Please upload a clear selfie Geo-Tagged photo taken today
                </p>
              </div>

              {/* Timeline Evidence (URL or Screenshot) */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Timeline Evidence *
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Provide either a Google Timeline link OR upload a timeline screenshot
                  </p>
                </div>

                {/* Timeline URL */}
                <div className="space-y-2">
                  <Label htmlFor="timeline" className="text-sm">Google Timeline Link</Label>
                  <Input
                    id="timeline"
                    type="url"
                    placeholder="https://www.google.com/maps/timeline or https://maps.app.goo.gl/..."
                    value={timelineUrl}
                    onChange={(e) => handleTimelineUrlChange(e.target.value)}
                    className={timelineUrl && !validateTimelineUrl(timelineUrl) ? "border-red-500" : ""}
                  />
                  {timelineUrl && !validateTimelineUrl(timelineUrl) && (
                    <p className="text-sm text-red-500">
                      Please provide a valid Google Maps timeline URL
                    </p>
                  )}
                </div>

                {/* OR separator */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
                  <span className="text-sm text-muted-foreground bg-white dark:bg-gray-900 px-2">OR</span>
                  <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
                </div>

                {/* Timeline Screenshot */}
                <div className="space-y-2">
                  <Label htmlFor="timeline-screenshot" className="text-sm">Timeline Screenshot</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="timeline-screenshot"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setTimelineScreenshotUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {timelineScreenshotUrl ? "Change Screenshot" : "Upload Screenshot"}
                  </Button>
                  {timelineScreenshotUrl && (
                    <div className="mt-2">
                      <Image
                        src={timelineScreenshotUrl}
                        alt="Timeline Screenshot"
                        width={300}
                        height={200}
                        className="w-full max-w-sm rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <DailyFollowUpForm
              formData={followUpFormData}
              onFormChange={setFollowUpFormData}
              currentUser={currentUser}
              mode={followUpMode}
              onModeChange={(mode) => {
                setFollowUpMode(mode);
                if (mode === 'existing' && availableFollowUps.length > 0) {
                  setSelectedExistingFollowUpId((prev) => prev || availableFollowUps[0].id);
                }
              }}
              existingFollowUps={availableFollowUps}
              selectedExistingFollowUpId={selectedExistingFollowUpId}
              onSelectExisting={setSelectedExistingFollowUpId}
              isLoadingExisting={isLoadingFollowUps}
              fetchError={followUpFetchError}
            />
            <CardFooter className="flex gap-3">
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting || !visitReport.trim() || !selectedPhoto || (!timelineUrl.trim() && !timelineScreenshotUrl)}
              >
                {isSubmitting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Attendance
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                Clear Form
              </Button>
            </CardFooter>
          </Card>
        </form>
        )}

        {/* Instructions Card - Only show for non-admin users */}
        {!isAdmin && (
          <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">How to Submit Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-semibold">
                  1
                </span>
                <span>Write a detailed visit report describing your day&apos;s activities and accomplishments</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-semibold">
                  2
                </span>
                <span>Take a clear selfie Geo-Tagged photo and upload it using the upload button</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-semibold">
                  3
                </span>
                <span>Open Google Maps, go to Your Timeline, share today&apos;s timeline, and paste the link</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-semibold">
                  4
                </span>
                <span>Review all information and click Submit Attendance</span>
              </li>
            </ol>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
    </>
  );
}
