// Secure error handling utility
// Prevents sensitive data leakage while maintaining debugging capability

import { logger } from './logger';

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: any;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly isOperational: boolean;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = undefined;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error types
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

// Sanitize error objects to remove sensitive data
function sanitizeError(error: any): any {
  if (!error) return error;

  // Remove sensitive fields
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'jwt', 'authorization',
    'database_url', 'email_pass', 'api_key', 'api_secret'
  ];

  const sanitized = { ...error };

  // Remove sensitive fields from error object
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  // If it's an error with a stack trace, sanitize the message
  if (sanitized.message && typeof sanitized.message === 'string') {
    // Remove potential sensitive data from error messages
    sanitized.message = sanitized.message.replace(/password[^&\s]*/gi, '[REDACTED]');
    sanitized.message = sanitized.message.replace(/token[^&\s]*/gi, '[REDACTED]');
    sanitized.message = sanitized.message.replace(/secret[^&\s]*/gi, '[REDACTED]');
  }

  return sanitized;
}

// Handle API errors safely
export function handleApiError(error: any, context?: string): ApiError {
  // Log the full error for debugging (only in development or with proper logging)
  logger.error(`API Error${context ? ` in ${context}` : ''}`, error, {
    context,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
  });

  // If it's already an AppError, use it
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: process.env.NODE_ENV === 'development' ? sanitizeError(error.details) : undefined
    };
  }

  // Handle Prisma errors
  if (error?.code) {
    switch (error.code) {
      case 'P1001':
        return { message: 'Database connection failed', statusCode: 503, code: 'DB_CONNECTION_ERROR' };
      case 'P2002':
        return { message: 'A record with this information already exists', statusCode: 409, code: 'DUPLICATE_ERROR' };
      case 'P2025':
        return { message: 'Record not found', statusCode: 404, code: 'NOT_FOUND_ERROR' };
      default:
        return { message: 'Database operation failed', statusCode: 500, code: 'DATABASE_ERROR' };
    }
  }

  // Handle JWT errors
  if (error?.name === 'JsonWebTokenError') {
    return { message: 'Invalid authentication token', statusCode: 401, code: 'INVALID_TOKEN' };
  }

  if (error?.name === 'TokenExpiredError') {
    return { message: 'Authentication token has expired', statusCode: 401, code: 'TOKEN_EXPIRED' };
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  return {
    message: isDevelopment ? error?.message || 'An error occurred' : 'An internal error occurred',
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    details: isDevelopment ? sanitizeError(error) : undefined
  };
}

// Safe API response wrapper
export function createApiResponse<T>(
  data: T,
  statusCode: number = 200,
  message?: string
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    }),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }
  );
}

// Safe error response wrapper
export function createErrorResponse(error: ApiError): Response {
  const { message, code, statusCode, details } = error;

  const responseBody = {
    success: false,
    error: {
      message,
      code,
      ...(process.env.NODE_ENV === 'development' && details && { details })
    },
    timestamp: new Date().toISOString()
  };

  return new Response(
    JSON.stringify(responseBody),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }
  );
}

// Helper for API route handlers
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      const apiError = handleApiError(error, handler.name);
      return createErrorResponse(apiError);
    }
  };
}
