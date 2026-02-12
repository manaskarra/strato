/**
 * Security Utilities
 * Shared security functions for API routes
 */

import { NextResponse } from 'next/server';

// Rate limiting storage (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const RATE_LIMITS = {
  standard: { windowMs: 60000, maxRequests: 30 },
  strict: { windowMs: 60000, maxRequests: 10 },
  ai: { windowMs: 60000, maxRequests: 5 },
};

/**
 * Check rate limit for an identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.standard
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return true;
  }

  if (record.count >= config.maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Validate stock symbol format
 */
export function validateSymbol(symbol: string): { valid: boolean; error?: string } {
  if (!symbol || typeof symbol !== 'string') {
    return { valid: false, error: 'Symbol is required' };
  }

  if (symbol.length > 20) {
    return { valid: false, error: 'Symbol too long' };
  }

  if (!/^[A-Za-z0-9.-]+$/.test(symbol)) {
    return { valid: false, error: 'Invalid symbol format' };
  }

  return { valid: true };
}

/**
 * Validate exchange code
 */
export function validateExchange(exchange: string): { valid: boolean; error?: string } {
  if (!exchange || typeof exchange !== 'string') {
    return { valid: false, error: 'Exchange is required' };
  }

  if (exchange.length > 10) {
    return { valid: false, error: 'Exchange code too long' };
  }

  if (!/^[A-Z]+$/.test(exchange)) {
    return { valid: false, error: 'Invalid exchange format' };
  }

  return { valid: true };
}

/**
 * Validate integer parameter
 */
export function validateInteger(
  value: string | null,
  min: number,
  max: number
): { valid: boolean; value?: number; error?: string } {
  if (value === null) {
    return { valid: false, error: 'Value is required' };
  }

  const num = parseInt(value, 10);

  if (isNaN(num)) {
    return { valid: false, error: 'Must be a valid integer' };
  }

  if (num < min || num > max) {
    return { valid: false, error: `Must be between ${min} and ${max}` };
  }

  return { valid: true, value: num };
}

/**
 * Validate enum parameter
 */
export function validateEnum<T extends string>(
  value: string | null,
  allowedValues: readonly T[]
): { valid: boolean; value?: T; error?: string } {
  if (value === null) {
    return { valid: false, error: 'Value is required' };
  }

  if (!allowedValues.includes(value as T)) {
    return {
      valid: false,
      error: `Must be one of: ${allowedValues.join(', ')}`,
    };
  }

  return { valid: true, value: value as T };
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

/**
 * Create secure JSON response with headers
 */
export function secureJsonResponse(data: any, status = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  return addSecurityHeaders(response);
}

/**
 * Create secure error response
 */
export function secureErrorResponse(
  message: string,
  status = 500
): NextResponse {
  return secureJsonResponse({ error: message }, status);
}

/**
 * Get client IP from request
 */
export function getClientIp(request: Request): string {
  const headers = new Headers(request.headers);
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
