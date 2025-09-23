import crypto from 'crypto';
import { AttendanceRecord, DeviceFingerprint, ExifData, ValidationResult } from '../types';
import { ATTENDANCE_CONFIG, isLateSubmission } from '../config';

export async function validateAttendanceSubmission(
  record: Partial<AttendanceRecord>,
  deviceFingerprint?: DeviceFingerprint
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const metadata: ValidationResult['metadata'] = {};

  // Required fields validation
  if (!record.note || record.note.trim().length < 3) {
    errors.push('Visit report is required and must be at least 3 characters long');
  }

  if (!record.selfieUrl) {
    errors.push('Selfie is required');
  }

  // Evidence validation
  const hasTimelineUrl = record.timelineUrl && record.timelineUrl.trim().length > 0;
  const hasScreenshot = record.timelineScreenshotUrl && record.timelineScreenshotUrl.trim().length > 0;

  if (!hasTimelineUrl && !hasScreenshot) {
    errors.push('Either timeline URL or screenshot is required');
  }

  // Timeline URL validation
  if (record.timelineUrl) {
    if (!ATTENDANCE_CONFIG.timelineUrlPattern.test(record.timelineUrl)) {
      errors.push('Timeline URL must be from Google Maps');
    } else {
      // Validate URL by making a HEAD request
      try {
        const response = await fetch(record.timelineUrl, { method: 'HEAD' });
        if (!response.ok) {
          warnings.push('Timeline URL is not accessible');
        }
        metadata.timelineUrl = {
          isValid: response.ok,
          domain: new URL(record.timelineUrl).hostname,
          resolvedUrl: response.url,
        };
      } catch (_error) {
        warnings.push('Could not validate timeline URL');
      }
    }
  }

  // Late submission check
  if (isLateSubmission()) {
    warnings.push('Submission is after the standard time window');
  }

  // Device fingerprint validation
  if (deviceFingerprint) {
    metadata.deviceFingerprint = deviceFingerprint;

    // Check for suspicious patterns
    if (deviceFingerprint.screenWidth < 320 || deviceFingerprint.screenHeight < 240) {
      warnings.push('Device screen size is unusually small');
    }

    if (!deviceFingerprint.cookieEnabled) {
      warnings.push('Cookies are disabled - may affect functionality');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata,
  };
}

export function generateDeviceFingerprint(): DeviceFingerprint {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return {
      userAgent: 'server',
      timezone: 'UTC',
      language: 'en',
      platform: 'server',
      cookieEnabled: false,
      screenWidth: 1920,
      screenHeight: 1080,
      colorDepth: 24,
      pixelRatio: 1,
    };
  }

  return {
    userAgent: navigator.userAgent,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    screenWidth: screen.width,
    screenHeight: screen.height,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio || 1,
  };
}

export function hashDeviceFingerprint(fingerprint: DeviceFingerprint): string {
  const fingerprintString = JSON.stringify({
    userAgent: fingerprint.userAgent,
    timezone: fingerprint.timezone,
    language: fingerprint.language,
    platform: fingerprint.platform,
    screenWidth: fingerprint.screenWidth,
    screenHeight: fingerprint.screenHeight,
    colorDepth: fingerprint.colorDepth,
    pixelRatio: fingerprint.pixelRatio,
  });

  return crypto.createHash('sha256').update(fingerprintString).digest('hex');
}

export async function extractExifData(file: File): Promise<ExifData | null> {
  try {
    // For now, just return basic file metadata
    // TODO: Implement proper EXIF extraction with a client-side EXIF library
    return {
      dateTimeOriginal: new Date(file.lastModified).toISOString(),
      make: 'Unknown',
      model: 'Unknown',
      software: 'Unknown',
    };
  } catch (error) {
    console.error('Error extracting EXIF data:', error);

    // Fallback to basic file metadata
    return {
      dateTimeOriginal: new Date(file.lastModified).toISOString(),
      make: 'Unknown',
      model: 'Unknown',
      software: 'Unknown',
    };
  }
}

export function validateExifData(exifData: ExifData, submissionTime: Date): boolean {
  if (!exifData.dateTimeOriginal) return true; // No EXIF data to validate

  const exifTime = new Date(exifData.dateTimeOriginal);
  const timeDiff = Math.abs(submissionTime.getTime() - exifTime.getTime());

  return timeDiff <= ATTENDANCE_CONFIG.exifTimeTolerance;
}

export function generateRecordHash(record: Partial<AttendanceRecord>): string {
  const canonicalData = {
    userId: record.userId,
    dateIST: record.dateIST,
    note: record.note,
    timelineUrl: record.timelineUrl,
    timelineScreenshotUrl: record.timelineScreenshotUrl,
    selfieUrl: record.selfieUrl,
    clientLat: record.clientLat,
    clientLng: record.clientLng,
    submittedAtUTC: record.submittedAtUTC,
  };

  const dataString = JSON.stringify(canonicalData, Object.keys(canonicalData).sort());
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

export function detectTampering(record: AttendanceRecord): boolean {
  const currentHash = generateRecordHash(record);
  return currentHash !== record.hash;
}

export async function validateGeolocation(lat: number, lng: number): Promise<{ isValid: boolean; accuracy: number; address?: string }> {
  // This would integrate with a geocoding service
  // For now, just validate the coordinates are reasonable
  const isValidLat = lat >= -90 && lat <= 90;
  const isValidLng = lng >= -180 && lng <= 180;

  return {
    isValid: isValidLat && isValidLng,
    accuracy: 100, // meters
  };
}

export function checkDuplicateSubmission(userId: string, dateIST: string, existingRecords: AttendanceRecord[]): boolean {
  return existingRecords.some(record =>
    record.userId === userId && record.dateIST === dateIST
  );
}
