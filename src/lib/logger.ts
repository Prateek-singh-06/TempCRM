// Safe logging utility for production environments
// Prevents sensitive data leakage while maintaining debugging capability

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  action?: string;
  ip?: string;
  userAgent?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  [key: string]: string | number | boolean | undefined | {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(this.sanitizeContext(context))}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private sanitizeContext(context: LogContext): LogContext {
    const sanitized = { ...context };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'jwt', 'authorization'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.isProduction) {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (!this.isProduction) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        // Don't include stack trace in production logs
        stack: this.isProduction ? undefined : error.stack
      } : undefined
    };

    console.error(this.formatMessage('error', message, errorContext));
  }

  // Security-specific logging (always logs, but sanitized)
  security(message: string, context?: LogContext): void {
    console.warn(`[SECURITY] ${this.formatMessage('warn', message, context)}`);
  }
}

export const logger = new Logger();

// Helper functions for common logging patterns
export const logAuthAttempt = (email: string, success: boolean, ip?: string) => {
  logger.info(`Authentication ${success ? 'successful' : 'failed'}`, {
    action: 'auth_attempt',
    userId: email,
    success,
    ip
  });
};

export const logApiRequest = (method: string, path: string, userId?: string, duration?: number) => {
  logger.debug(`API ${method} ${path}`, {
    action: 'api_request',
    method,
    path,
    userId,
    duration
  });
};

export const logDatabaseError = (operation: string, error: Error, context?: LogContext) => {
  logger.error(`Database ${operation} failed`, error, {
    ...context,
    operation
  });
};

export const logSecurityEvent = (event: string, context?: LogContext) => {
  logger.security(`Security event: ${event}`, context);
};
