// Domain types for the repository pattern
export interface UserRecord {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
  role: 'SuperAdmin' | 'Admin' | 'Manager' | 'Staff' | 'Viewer';
  managerId?: string;
  team?: string;
  region?: string;
  status: 'active' | 'inactive';
  createdAtUTC: string;
  lastLoginUTC?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  dateIST: string; // YYYY-MM-DD in IST
  submittedAtUTC: string;
  note: string;
  timelineUrl?: string;
  timelineScreenshotUrl?: string;
  selfieUrl?: string;
  clientLat?: number;
  clientLng?: number;
  clientAccuracyM?: number;
  exifTakenAt?: string;
  deviceFingerprint?: string;
  clientLocationProvider?: string;
  clientLocationInfo?: any;
  clientAltitude?: number;
  clientSpeed?: number;
  clientHeading?: number;
  clientLocationTimestamp?: number;
  clientLocationMethod?: string;
  clientLocationAccuracyLevel?: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  clientCountry?: string;
  clientPostalCode?: string;
  clientLocationWarnings?: string[];
  ipCity?: string;
  ipCountry?: string;
  status: 'SUBMITTED' | 'AUTO_FLAGGED' | 'APPROVED' | 'REJECTED' | 'AMENDED';
  reviewerId?: string;
  reviewedAtUTC?: string;
  reviewNotes?: string;
  hash: string;
  // Enhanced geolocation fields from database
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
  approvedAt?: string;
  // User relationship data
  users_attendances_userIdTousers?: {
    name: string;
    email: string;
    employeeCode: string;
    role: string;
  };
  users_attendances_reviewerIdTousers?: {
    name: string;
    email: string;
  };
  // Add optional properties for compatibility with filterByPeriod
  createdAt?: string;
  date?: string;
  createdAtUTC?: string;
  createdDate?: string;
}

export interface LeadRecord {
  id: string;
  ownerUserId: string;
  name: string;
  source?: string;
  stage: string;
  value?: number;
  probability?: number;
  nextActionAt?: string;
  notes?: string;
  createdAtUTC: string;
  updatedAtUTC: string;
}

export interface CompanyRecord {
  id: string;
  name: string;
  region?: string;
  type?: string;
  address?: string;
  website?: string;
  totalOpportunities: number;
  openDeals: number;
  totalValue: number;
  createdAtUTC: string;
  updatedAtUTC: string;
}

export interface OpportunityRecord {
  id: string;
  companyId?: string;
  leadId?: string;
  name: string;
  stage: string;
  dealSize: number;
  probability: number;
  classification?: string;
  expectedCloseDate?: string;
  nextFollowupDate?: string;
  ownerUserId: string;
  createdAtUTC: string;
  updatedAtUTC: string;
}

export interface ActivityRecord {
  id: string;
  userId: string;
  leadId?: string;
  type: 'call' | 'visit' | 'meeting' | 'other';
  occurredAtUTC: string;
  durationMin?: number;
  summary?: string;
  evidenceUrl?: string;
}

export interface AuditLogRecord {
  id: string;
  actorUserId: string;
  action: string;
  entity: string;
  entityId: string;
  beforeJson?: string;
  afterJson?: string;
  ip?: string;
  tsUTC: string;
}

export interface ForecastRecord {
  id: string;
  userId: string;
  year: number;
  month: number;
  region: string;
  target: number;
  achieved: number;
  createdAtUTC: string;
  updatedAtUTC: string;
}

// Repository interfaces
export interface AttendanceRepo {
  upsert(record: AttendanceRecord): Promise<void>;
  findByUserDate(userId: string, dateIST: string): Promise<AttendanceRecord | null>;
  listForDate(dateIST: string, scope?: { teamId?: string; managerId?: string }): Promise<AttendanceRecord[]>;
  approve(id: string, reviewerId: string, notes?: string): Promise<void>;
  reject(id: string, reviewerId: string, notes?: string): Promise<void>;
  listByUser(userId: string, startDate?: string, endDate?: string): Promise<AttendanceRecord[]>;
}

export interface UserRepo {
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  listByManager(managerId: string): Promise<UserRecord[]>;
  listByTeam(team: string): Promise<UserRecord[]>;
  listByRegion(region: string): Promise<UserRecord[]>;
}

export interface LeadRepo {
  create(record: Omit<LeadRecord, 'id' | 'createdAtUTC' | 'updatedAtUTC'>): Promise<string>;
  findById(id: string): Promise<LeadRecord | null>;
  listByOwner(ownerUserId: string): Promise<LeadRecord[]>;
  update(id: string, updates: Partial<LeadRecord>): Promise<void>;
  delete(id: string): Promise<void>;
  convertToOpportunity(id: string, opportunityData: Partial<OpportunityRecord>): Promise<string>;
}

export interface CompanyRepo {
  create(record: Omit<CompanyRecord, 'id' | 'createdAtUTC' | 'updatedAtUTC'>): Promise<string>;
  findById(id: string): Promise<CompanyRecord | null>;
  listAll(): Promise<CompanyRecord[]>;
  update(id: string, updates: Partial<CompanyRecord>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface OpportunityRepo {
  create(record: Omit<OpportunityRecord, 'id' | 'createdAtUTC' | 'updatedAtUTC'>): Promise<string>;
  findById(id: string): Promise<OpportunityRecord | null>;
  listByOwner(ownerUserId: string): Promise<OpportunityRecord[]>;
  listByCompany(companyId: string): Promise<OpportunityRecord[]>;
  update(id: string, updates: Partial<OpportunityRecord>): Promise<void>;
  delete(id: string): Promise<void>;
  updateStage(id: string, stage: string, probability: number): Promise<void>;
}

export interface AuditRepo {
  log(entry: Omit<AuditLogRecord, 'id' | 'tsUTC'>): Promise<void>;
  listByEntity(entity: string, entityId: string): Promise<AuditLogRecord[]>;
  listByUser(userId: string): Promise<AuditLogRecord[]>;
  listByAction(action: string): Promise<AuditLogRecord[]>;
}

// Configuration types
export interface SheetsConfig {
  spreadsheetId: string;
  serviceAccountKey: string;
  sheets: {
    users: string;
    attendance: string;
    leads: string;
    companies: string;
    opportunities: string;
    activities: string;
    auditLog: string;
    forecasts: string;
    index: string;
    counters: string;
    pendingQuotations: string;
    immediateSales: string;
  };
}

export interface ExcelConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  workbookId: string;
  sheets: {
    users: string;
    attendance: string;
    leads: string;
    companies: string;
    opportunities: string;
    activities: string;
    auditLog: string;
    forecasts: string;
  };
}

export interface FileStorageConfig {
  provider: 'google-drive' | 's3' | 'azure';
  bucket?: string;
  credentials: Record<string, string>;
}

// EXIF and validation types
export interface ExifData {
  dateTimeOriginal?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  make?: string;
  model?: string;
  software?: string;
}

export interface DeviceFingerprint {
  userAgent: string;
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  pixelRatio: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    exifData?: ExifData;
    deviceFingerprint?: DeviceFingerprint;
    timelineUrl?: {
      isValid: boolean;
      domain: string;
      resolvedUrl?: string;
    };
  };
}

// Notification types
export interface NotificationConfig {
  slack?: {
    webhookUrl: string;
    channel: string;
  };
  email?: {
    smtpHost: string;
    smtpPort: number;
    username: string;
    password: string;
  };
  whatsapp?: {
    apiKey: string;
    phoneNumber: string;
  };
}
