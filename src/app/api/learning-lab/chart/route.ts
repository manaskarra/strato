import { NextRequest, NextResponse } from 'next/server';
import { fetchChartData, fetchHistoricalData } from '@/lib/eodhd-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const exchange = searchParams.get('exchange') || 'US';
  const interval = searchParams.get('interval') as '1m' | '5m' | '1h' || '5m';
  const period = searchParams.get('period') as 'month' | 'quarter' | 'year' | 'intraday';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const data = period === 'intraday'
      ? await fetchChartData(symbol, exchange, interval)
      : await fetchHistoricalData(symbol, exchange, period as any);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Chart data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}
