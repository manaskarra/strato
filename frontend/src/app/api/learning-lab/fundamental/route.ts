import { NextRequest } from 'next/server';
import { fetchFundamentalAnalysis } from '@/lib/eodhd-api';
import {
  checkRateLimit,
  validateSymbol,
  validateExchange,
  secureJsonResponse,
  secureErrorResponse,
  getClientIp,
  RATE_LIMITS,
} from '@/lib/security';

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientIp = getClientIp(request);
  if (!checkRateLimit(clientIp, RATE_LIMITS.standard)) {
    return secureErrorResponse('Rate limit exceeded. Please try again later.', 429);
  }

  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const exchange = searchParams.get('exchange') || 'US';

  // Validate symbol
  if (!symbol) {
    return secureErrorResponse('Symbol is required', 400);
  }

  const symbolValidation = validateSymbol(symbol);
  if (!symbolValidation.valid) {
    return secureErrorResponse(symbolValidation.error!, 400);
  }

  // Validate exchange
  const exchangeValidation = validateExchange(exchange);
  if (!exchangeValidation.valid) {
    return secureErrorResponse(exchangeValidation.error!, 400);
  }

  try {
    const data = await fetchFundamentalAnalysis(symbol, exchange);
    return secureJsonResponse(data);
  } catch (error) {
    console.error('Fundamental analysis error:', error);
    return secureErrorResponse('Failed to fetch fundamental analysis', 500);
  }
}
