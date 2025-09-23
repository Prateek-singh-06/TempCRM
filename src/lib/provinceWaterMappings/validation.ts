import { CompanyType, CompanyRating } from '@prisma/client';

export interface ProvinceWaterMappingData {
  waterCompany: string;
  province: string;
  companyType: CompanyType;
  waterCompanyContacts?: string;
  contractors?: string;
  contractorContacts?: string;
  traders?: string;
  traderContacts?: string;
  consultants?: string;
  consultantContacts?: string;
  pic?: string;
  companyRating?: CompanyRating;
  reliabilityScore?: number;
  lastInteractionDate?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: ProvinceWaterMappingData;
}

export interface QueryParams {
  province?: string;
  companyType?: string;
  search?: string;
  limit?: string;
  offset?: string;
}

export function validateProvinceWaterMappingData(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field validation
  if (!data.waterCompany || typeof data.waterCompany !== 'string') {
    errors.push('Water company name is required and must be a string');
  } else if (data.waterCompany.trim().length < 2) {
    errors.push('Water company name must be at least 2 characters long');
  } else if (data.waterCompany.length > 100) {
    errors.push('Water company name must not exceed 100 characters');
  }

  if (!data.province || typeof data.province !== 'string') {
    errors.push('Province is required and must be a string');
  } else if (data.province.trim().length < 2) {
    errors.push('Province must be at least 2 characters long');
  } else if (data.province.length > 50) {
    errors.push('Province must not exceed 50 characters');
  }

  if (!data.companyType) {
    errors.push('Company type is required');
  } else if (!['FULL_GOVT', 'JOINT_STOCK', 'PRIVATE'].includes(data.companyType)) {
    errors.push('Company type must be one of: FULL_GOVT, JOINT_STOCK, PRIVATE');
  }

  // Optional field validation with length limits
  const optionalStringFields = [
    { field: 'waterCompanyContacts', maxLength: 500 },
    { field: 'contractors', maxLength: 500 },
    { field: 'contractorContacts', maxLength: 500 },
    { field: 'traders', maxLength: 500 },
    { field: 'traderContacts', maxLength: 500 },
    { field: 'consultants', maxLength: 500 },
    { field: 'consultantContacts', maxLength: 500 },
    { field: 'pic', maxLength: 100 },
  ];

  optionalStringFields.forEach(({ field, maxLength }) => {
    if (data[field] !== undefined) {
      if (typeof data[field] !== 'string') {
        errors.push(`${field} must be a string`);
      } else if (data[field].length > maxLength) {
        errors.push(`${field} must not exceed ${maxLength} characters`);
      }
    }
  });

  // Company rating validation
  if (data.companyRating !== undefined) {
    if (!['LOW', 'MEDIUM', 'HIGH', 'PREMIUM'].includes(data.companyRating)) {
      errors.push('Company rating must be one of: LOW, MEDIUM, HIGH, PREMIUM');
    }
  }

  // Reliability score validation
  if (data.reliabilityScore !== undefined) {
    if (typeof data.reliabilityScore !== 'number') {
      errors.push('Reliability score must be a number');
    } else if (data.reliabilityScore < 0 || data.reliabilityScore > 100) {
      errors.push('Reliability score must be between 0 and 100');
    }
  }

  // Last interaction date validation
  if (data.lastInteractionDate !== undefined) {
    if (typeof data.lastInteractionDate !== 'string') {
      errors.push('Last interaction date must be a valid date string');
    } else {
      const date = new Date(data.lastInteractionDate);
      if (isNaN(date.getTime())) {
        errors.push('Last interaction date must be a valid date');
      } else if (date > new Date()) {
        warnings.push('Last interaction date is in the future');
      }
    }
  }

  // Sanitize data
  const sanitizedData: ProvinceWaterMappingData = {
    waterCompany: data.waterCompany?.trim(),
    province: data.province?.trim(),
    companyType: data.companyType,
    waterCompanyContacts: data.waterCompanyContacts?.trim() || undefined,
    contractors: data.contractors?.trim() || undefined,
    contractorContacts: data.contractorContacts?.trim() || undefined,
    traders: data.traders?.trim() || undefined,
    traderContacts: data.traderContacts?.trim() || undefined,
    consultants: data.consultants?.trim() || undefined,
    consultantContacts: data.consultantContacts?.trim() || undefined,
    pic: data.pic?.trim() || undefined,
    companyRating: data.companyRating || 'MEDIUM',
    reliabilityScore: data.reliabilityScore,
    lastInteractionDate: data.lastInteractionDate,
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedData,
  };
}

export function validateQueryParams(params: URLSearchParams): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Province validation
  const province = params.get('province');
  if (province && (province.length < 2 || province.length > 50)) {
    errors.push('Province filter must be between 2 and 50 characters');
  }

  // Company type validation
  const companyType = params.get('companyType');
  if (companyType && !['FULL_GOVT', 'JOINT_STOCK', 'PRIVATE'].includes(companyType)) {
    errors.push('Company type filter must be one of: FULL_GOVT, JOINT_STOCK, PRIVATE');
  }

  // Search validation
  const search = params.get('search');
  if (search && search.length < 1) {
    errors.push('Search term cannot be empty');
  } else if (search && search.length > 100) {
    errors.push('Search term must not exceed 100 characters');
  }

  // Limit validation
  const limit = params.get('limit');
  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('Limit must be a number between 1 and 100');
    }
  }

  // Offset validation
  const offset = params.get('offset');
  if (offset) {
    const offsetNum = parseInt(offset);
    if (isNaN(offsetNum) || offsetNum < 0) {
      errors.push('Offset must be a non-negative number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateIdParam(id: string): ValidationResult {
  const errors: string[] = [];

  if (!id) {
    errors.push('ID parameter is required');
  } else {
    const idNum = parseInt(id);
    if (isNaN(idNum) || idNum < 1) {
      errors.push('ID must be a positive integer');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}

export function sanitizeUpdateData(data: any): Partial<ProvinceWaterMappingData> {
  const sanitized: Partial<ProvinceWaterMappingData> = {};

  // Only include fields that are provided and not undefined
  if (data.waterCompany !== undefined) sanitized.waterCompany = data.waterCompany?.trim();
  if (data.province !== undefined) sanitized.province = data.province?.trim();
  if (data.companyType !== undefined) sanitized.companyType = data.companyType;
  if (data.waterCompanyContacts !== undefined) sanitized.waterCompanyContacts = data.waterCompanyContacts?.trim() || undefined;
  if (data.contractors !== undefined) sanitized.contractors = data.contractors?.trim() || undefined;
  if (data.contractorContacts !== undefined) sanitized.contractorContacts = data.contractorContacts?.trim() || undefined;
  if (data.traders !== undefined) sanitized.traders = data.traders?.trim() || undefined;
  if (data.traderContacts !== undefined) sanitized.traderContacts = data.traderContacts?.trim() || undefined;
  if (data.consultants !== undefined) sanitized.consultants = data.consultants?.trim() || undefined;
  if (data.consultantContacts !== undefined) sanitized.consultantContacts = data.consultantContacts?.trim() || undefined;
  if (data.pic !== undefined) sanitized.pic = data.pic?.trim() || undefined;
  if (data.companyRating !== undefined) sanitized.companyRating = data.companyRating;
  if (data.reliabilityScore !== undefined) sanitized.reliabilityScore = data.reliabilityScore;
  if (data.lastInteractionDate !== undefined) sanitized.lastInteractionDate = data.lastInteractionDate;

  return sanitized;
}
