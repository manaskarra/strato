/**
 * Alto AI - Security Module
 *
 * Implements security measures to prevent:
 * - Prompt injection attacks
 * - Data exfiltration
 * - Malicious inputs
 * - Unauthorized access
 */

/**
 * Sanitize user input to prevent prompt injection
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove or escape potentially malicious patterns
  let sanitized = input
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Limit consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove excessive whitespace
    .replace(/\s{3,}/g, ' ')
    // Trim
    .trim();

  // Enforce max length
  const MAX_LENGTH = 10000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }

  return sanitized;
}

/**
 * Validate and sanitize data context for AI analysis
 */
export function sanitizeDataContext(data: any): any {
  if (!data || typeof data !== 'object') {
    return {};
  }

  // Deep clone to avoid mutations
  const sanitized = JSON.parse(JSON.stringify(data));

  // Remove any potentially sensitive keys
  const sensitiveKeys = ['api_key', 'token', 'password', 'secret', 'credential'];

  function removeSensitiveData(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(removeSensitiveData);
    }

    if (obj && typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (!sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
          cleaned[key] = removeSensitiveData(value);
        }
      }
      return cleaned;
    }

    return obj;
  }

  return removeSensitiveData(sanitized);
}

/**
 * Validate API response to ensure it's safe
 */
export function validateAIResponse(response: string): { valid: boolean; sanitized: string; error?: string } {
  if (!response || typeof response !== 'string') {
    return {
      valid: false,
      sanitized: '',
      error: 'Invalid response format',
    };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /system\s*:/i,
    /ignore\s+previous\s+instructions/i,
    /disregard\s+all\s+prior/i,
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i, // event handlers
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(response)) {
      return {
        valid: false,
        sanitized: '',
        error: 'Response contains suspicious patterns',
      };
    }
  }

  // Sanitize HTML/XSS
  const sanitized = response
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '');

  return {
    valid: true,
    sanitized,
  };
}

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  maxRequestsPerMinute: 10,
  maxRequestsPerHour: 100,
  maxTokensPerRequest: 4000,
};

/**
 * Create a secure context for AI analysis
 */
export function createSecureContext(data: {
  symbol: string;
  exchange: string;
  inputs: any[];
}): string {
  // Sanitize all inputs
  const sanitizedSymbol = sanitizeInput(data.symbol);
  const sanitizedExchange = sanitizeInput(data.exchange);
  const sanitizedInputs = data.inputs.map(sanitizeDataContext);

  // Build a structured, sanitized context
  const context = {
    symbol: sanitizedSymbol.toUpperCase(),
    exchange: sanitizedExchange.toUpperCase(),
    analysisData: sanitizedInputs,
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(context, null, 2);
}

/**
 * Validate environment configuration
 */
export function validateEnvironment(): { valid: boolean; error?: string } {
  const apiKey = process.env.ALTO_API_KEY;
  const baseUrl = process.env.ALTO_API_BASE_URL;
  const model = process.env.ALTO_MODEL;

  if (!apiKey || apiKey.length < 10) {
    return { valid: false, error: 'Invalid or missing ALTO_API_KEY' };
  }

  if (!baseUrl || !baseUrl.startsWith('https://')) {
    return { valid: false, error: 'Invalid or missing ALTO_API_BASE_URL' };
  }

  if (!model) {
    return { valid: false, error: 'Missing ALTO_MODEL' };
  }

  return { valid: true };
}
