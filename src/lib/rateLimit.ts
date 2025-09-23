// Simple in-memory rate limiter for authentication endpoints
// Suitable for CRM system with moderate traffic

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private windowMs: number = 15 * 60 * 1000, // 15 minutes
    private maxRequests: number = 5, // 5 requests per window
    private cleanupMs: number = 60 * 1000 // cleanup every minute
  ) {
    // Clean up expired entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupMs);
  }

  checkLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    // Increment counter
    entry.count++;
    this.store.set(identifier, entry);

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Rate limiters for different endpoints
export const authRateLimiter = new RateLimiter(1 * 60 * 1000, 100); // 5 requests per 15 minutes for auth
export const generalRateLimiter = new RateLimiter(60 * 1000, 60); // 60 requests per minute for general API

// Helper function to get client IP
export function getClientIP(request: Request): string {
  // Try to get IP from various headers (for reverse proxy setups)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');

  // For local development, use a default identifier
  // In production with reverse proxy, use forwarded headers
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (clientIP) {
    return clientIP;
  }

  // Fallback for local development
  return '127.0.0.1';
}

// Middleware function for rate limiting
export function checkRateLimit(
  request: Request,
  limiter: RateLimiter,
  identifier?: string
): { allowed: boolean; remaining: number; resetTime: number; errorResponse?: Response } {
  const clientIP = identifier || getClientIP(request);
  const result = limiter.checkLimit(clientIP);

  if (!result.allowed) {
    const resetInSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);
    return {
      ...result,
      errorResponse: new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Please try again later',
          retryAfter: resetInSeconds
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': resetInSeconds.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString()
          }
        }
      )
    };
  }

  return result;
}
