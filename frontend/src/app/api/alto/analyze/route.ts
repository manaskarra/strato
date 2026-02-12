import { NextRequest, NextResponse } from 'next/server';
import { analyzeWithAlto } from '@/alto/client';

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // Lower limit for AI analysis

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

function validateAnalysisRequest(body: any): { valid: boolean; error?: string } {
  // Validate symbol
  if (!body.symbol || typeof body.symbol !== 'string') {
    return { valid: false, error: 'Symbol is required' };
  }
  if (body.symbol.length > 20 || !/^[A-Za-z0-9.-]+$/.test(body.symbol)) {
    return { valid: false, error: 'Invalid symbol format' };
  }

  // Validate exchange
  if (body.exchange && typeof body.exchange !== 'string') {
    return { valid: false, error: 'Invalid exchange format' };
  }
  if (body.exchange && body.exchange.length > 10) {
    return { valid: false, error: 'Exchange name too long' };
  }

  // Validate inputs
  if (!Array.isArray(body.inputs)) {
    return { valid: false, error: 'Inputs must be an array' };
  }
  if (body.inputs.length === 0) {
    return { valid: false, error: 'Inputs array cannot be empty' };
  }
  if (body.inputs.length > 10) {
    return { valid: false, error: 'Too many inputs' };
  }

  // Validate userContext
  if (body.userContext !== undefined) {
    if (typeof body.userContext !== 'string') {
      return { valid: false, error: 'User context must be a string' };
    }
    if (body.userContext.length > 5000) {
      return { valid: false, error: 'User context too long' };
    }
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json();

    // Validate request
    const validation = validateAnalysisRequest(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { symbol, exchange, inputs, userContext } = body;

    const result = await analyzeWithAlto({
      symbol,
      exchange: exchange || 'US',
      inputs,
      userContext,
    });

    // Set security headers
    const response = NextResponse.json(result);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;
  } catch (error: any) {
    console.error('Alto analysis error:', error);
    // Don't expose internal error details
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
