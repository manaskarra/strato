import { NextRequest, NextResponse } from 'next/server';
import { fetchTechnicalAnalysis } from '@/lib/eodhd-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const exchange = searchParams.get('exchange') || 'US';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const data = await fetchTechnicalAnalysis(symbol, exchange);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Technical analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch technical analysis' },
      { status: 500 }
    );
  }
}
