import { NextRequest } from 'next/server';
import { fetchChartData, fetchHistoricalData } from '@/lib/eodhd-api';
import {
  checkRateLimit,
  validateSymbol,
  validateExchange,
  validateEnum,
  secureJsonResponse,
  secureErrorResponse,
  getClientIp,
  RATE_LIMITS,
} from '@/lib/security';

const VALID_INTERVALS = ['1m', '5m', '1h'] as const;
const VALID_PERIODS = ['month', 'quarter', 'year', 'intraday'] as const;

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientIp = getClientIp(request);
  if (!checkRateLimit(clientIp, RATE_LIMITS.standard)) {
    return secureErrorResponse('Rate limit exceeded. Please try again later.', 429);
  }

  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const exchange = searchParams.get('exchange') || 'US';
  const interval = searchParams.get('interval') || '5m';
  const period = searchParams.get('period') || 'month';

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

  // Validate interval
  const intervalValidation = validateEnum(interval, VALID_INTERVALS);
  if (!intervalValidation.valid) {
    return secureErrorResponse(intervalValidation.error!, 400);
  }

  // Validate period
  const periodValidation = validateEnum(period, VALID_PERIODS);
  if (!periodValidation.valid) {
    return secureErrorResponse(periodValidation.error!, 400);
  }

  try {
    const data = periodValidation.value === 'intraday'
      ? await fetchChartData(symbol, exchange, intervalValidation.value!)
      : await fetchHistoricalData(symbol, exchange, periodValidation.value!);

    return secureJsonResponse(data);
  } catch (error) {
    console.error('Chart data error:', error);
    return secureErrorResponse('Failed to fetch chart data', 500);
  }
}
