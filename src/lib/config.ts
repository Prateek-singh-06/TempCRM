import { SheetsConfig, ExcelConfig, FileStorageConfig, NotificationConfig } from './types';

// Configuration for different data backends
export const sheetsConfig: SheetsConfig = {
  spreadsheetId: '', // Not used with Prisma
  serviceAccountKey: '', // Not used with Prisma
  sheets: {
    users: 'Users',
    attendance: 'Attendance',
    leads: 'Leads',
    companies: 'Companies',
    opportunities: 'Opportunities',
    activities: 'Activities',
    auditLog: 'AuditLog',
    forecasts: 'Forecasts',
    index: 'Index_Attendance_ByUserDate',
    counters: 'Counters',
    pendingQuotations: 'PendingQuotations',
    immediateSales: 'ImmediateSales',
  },
};

export const excelConfig: ExcelConfig = {
  clientId: process.env.EXCEL_CLIENT_ID || '',
  clientSecret: process.env.EXCEL_CLIENT_SECRET || '',
  tenantId: process.env.EXCEL_TENANT_ID || '',
  workbookId: process.env.EXCEL_WORKBOOK_ID || '',
  sheets: {
    users: 'Users',
    attendance: 'Attendance',
    leads: 'Leads',
    companies: 'Companies',
    opportunities: 'Opportunities',
    activities: 'Activities',
    auditLog: 'AuditLog',
    forecasts: 'Forecasts',
  },
};

export const fileStorageConfig: FileStorageConfig = {
  provider: (process.env.FILE_STORAGE_PROVIDER as 'google-drive' | 's3' | 'azure') || 'google-drive',
  bucket: process.env.FILE_STORAGE_BUCKET || '',
  credentials: {
    googleDriveServiceAccount: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY || '',
    s3AccessKey: process.env.AWS_ACCESS_KEY_ID || '',
    s3SecretKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Region: process.env.AWS_REGION || '',
    azureStorageAccount: process.env.AZURE_STORAGE_ACCOUNT || '',
    azureStorageKey: process.env.AZURE_STORAGE_KEY || '',
  },
};

export const notificationConfig: NotificationConfig = {
  email: {
    smtpHost: process.env.EMAIL_HOST || '',
    smtpPort: parseInt(process.env.EMAIL_PORT || '587'),
    username: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASS || '',
  },
};

// Data backend selection
export const DATA_BACKEND = process.env.DATA_BACKEND || 'prisma'; // 'prisma', 'sheets', 'excel'
export const FILE_STORAGE_BACKEND = process.env.FILE_STORAGE_BACKEND || 'local'; // 'local', 'google-drive', 's3', 'azure'

// Attendance validation settings
export const ATTENDANCE_CONFIG = {
  submissionWindow: {
    start: '05:00', // IST
    end: '13:00',   // IST
  },
  requiredEvidence: {
    selfie: true,
    timelineOrScreenshot: true, // at least one of timeline URL or screenshot
  },
  maxFileSize: 4 * 1024 * 1024, // 4MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
  timelineUrlPattern: /^https:\/\/(www\.)?(google\.com\/maps|maps\.app\.goo\.gl)/,
  exifTimeTolerance: 15 * 60 * 1000, // 15 minutes in milliseconds
  deviceFingerprintHistory: 7, // days to check for device changes
};

// IST timezone handling
export const IST_OFFSET = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds

export function toIST(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET);
}

export function fromIST(istDate: Date): Date {
  return new Date(istDate.getTime() - IST_OFFSET);
}

export function getTodayIST(): Date {
  const now = new Date();
  const istDate = toIST(now);
  return istDate; // return as Date, not string
}


export function isWithinSubmissionWindow(): boolean {
  const now = new Date();
  const istTime = toIST(now);
  const [startHour, startMin] = ATTENDANCE_CONFIG.submissionWindow.start.split(':').map(Number);
  const [endHour, endMin] = ATTENDANCE_CONFIG.submissionWindow.end.split(':').map(Number);

  const startTime = new Date(istTime);
  startTime.setHours(startHour, startMin, 0, 0);

  const endTime = new Date(istTime);
  endTime.setHours(endHour, endMin, 0, 0);

  return istTime >= startTime && istTime <= endTime;
}

export function isLateSubmission(): boolean {
  if (isWithinSubmissionWindow()) return false;

  const now = new Date();
  const istTime = toIST(now);
  const [, endMin] = ATTENDANCE_CONFIG.submissionWindow.end.split(':').map(Number);

  const deadline = new Date(istTime);
  deadline.setHours(13, endMin, 0, 0); // 13:00 IST deadline

  return istTime > deadline;
}
