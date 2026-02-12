import { NextRequest, NextResponse } from 'next/server';
import { fetchDataInsights } from '@/lib/eodhd-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const exchange = searchParams.get('exchange') || 'US';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const data = await fetchDataInsights(symbol, exchange);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Data insights error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data insights' },
      { status: 500 }
    );
  }
}
