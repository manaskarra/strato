import { NextRequest, NextResponse } from 'next/server';

const LLM_BASE = process.env.LLM_BASE_URL || 'https://litellmprod.deriv.ai/v1';
const LLM_API_KEY = process.env.LLM_API_KEY;

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

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

function validateChatRequest(body: any): { valid: boolean; error?: string } {
  // Validate messages array
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return { valid: false, error: 'Messages must be a non-empty array' };
  }

  // Validate message count
  if (body.messages.length > 100) {
    return { valid: false, error: 'Too many messages' };
  }

  // Validate each message
  for (const msg of body.messages) {
    if (!msg.role || !msg.content) {
      return { valid: false, error: 'Invalid message format' };
    }
    if (!['system', 'user', 'assistant'].includes(msg.role)) {
      return { valid: false, error: 'Invalid message role' };
    }
    if (typeof msg.content !== 'string' || msg.content.length > 50000) {
      return { valid: false, error: 'Invalid message content' };
    }
  }

  // Validate model (allowlist)
  const allowedModels = ['gpt-4.1-mini', 'gpt-4', 'gpt-3.5-turbo'];
  if (body.model && !allowedModels.includes(body.model)) {
    return { valid: false, error: 'Invalid model' };
  }

  // Validate temperature
  if (body.temperature !== undefined) {
    const temp = Number(body.temperature);
    if (isNaN(temp) || temp < 0 || temp > 2) {
      return { valid: false, error: 'Temperature must be between 0 and 2' };
    }
  }

  // Validate max_tokens
  if (body.max_tokens !== undefined) {
    const tokens = Number(body.max_tokens);
    if (isNaN(tokens) || tokens < 1 || tokens > 4000) {
      return { valid: false, error: 'Max tokens must be between 1 and 4000' };
    }
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  // Validate API key is configured
  if (!LLM_API_KEY) {
    console.error('LLM_API_KEY not configured');
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

  try {
    const body = await request.json();

    // Validate request
    const validation = validateChatRequest(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const res = await fetch(`${LLM_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: body.model || 'gpt-4.1-mini',
        messages: body.messages,
        temperature: body.temperature || 0.7,
        max_tokens: body.max_tokens || 1500,
      }),
    });

    if (!res.ok) {
      // Don't expose internal error details
      console.error(`LLM API error: ${res.status}`);
      return NextResponse.json(
        { error: 'Failed to process request' },
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
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
