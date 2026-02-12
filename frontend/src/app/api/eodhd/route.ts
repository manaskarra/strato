import { NextRequest, NextResponse } from 'next/server';

const EODHD_API_KEY = process.env.EODHD_API_KEY;
const EODHD_BASE = 'https://eodhd.com/api';

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count++;
  return true;
}

// Allowlist of permitted endpoints to prevent SSRF
const ALLOWED_ENDPOINTS = [
  'eod',
  'intraday',
  'fundamentals',
  'technical',
  'news',
  'real-time',
  'search',
  'exchanges',
  'exchange-symbol-list',
];

function validateEndpoint(endpoint: string): boolean {
  if (!endpoint || typeof endpoint !== 'string') {
    return false;
  }

  // Remove slashes and check against allowlist
  const cleanEndpoint = endpoint.replace(/^\/+|\/+$/g, '');

  // Check if endpoint starts with any allowed value
  return ALLOWED_ENDPOINTS.some(allowed => cleanEndpoint.startsWith(allowed));
}

function sanitizeParams(searchParams: URLSearchParams): URLSearchParams {
  const sanitized = new URLSearchParams();
  const allowedParams = [
    'symbol', 'from', 'to', 'period', 'order', 'filter',
    'function', 'interval', 'limit', 's', 'exchange',
    'fast_period', 'slow_period', 'signal_period'
  ];

  searchParams.forEach((value, key) => {
    if (key !== 'endpoint' && allowedParams.includes(key)) {
      // Validate param length
      if (value.length <= 200) {
        sanitized.set(key, value);
      }
    }
  });

  return sanitized;
}

export async function GET(request: NextRequest) {
  // Validate API key is configured
  if (!EODHD_API_KEY) {
    console.error('EODHD_API_KEY not configured');
    return NextResponse.json({ error: 'Service configuration error' }, { status: 500 });
  }

  // Rate limiting
  const clientIp = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown';

  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || '';

  // Validate endpoint to prevent SSRF
  if (!validateEndpoint(endpoint)) {
    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
  }

  // Sanitize parameters
  const params = sanitizeParams(searchParams);
  params.set('api_token', EODHD_API_KEY || '');
  params.set('fmt', 'json');

  try {
    // Construct URL with validated endpoint
    const url = `${EODHD_BASE}/${endpoint}?${params.toString()}`;

    // Additional safety: ensure URL is still pointing to EODHD
    if (!url.startsWith(EODHD_BASE)) {
      console.error('URL validation failed:', url);
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const res = await fetch(url, {
      // Set timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!res.ok) {
      console.error(`EODHD API error: ${res.status}`);
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        { status: res.status >= 500 ? 503 : 400 }
      );
    }

    const data = await res.json();

    // Set security headers
    const response = NextResponse.json(data);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;
  } catch (error) {
    console.error('EODHD fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
