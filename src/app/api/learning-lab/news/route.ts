import { NextRequest, NextResponse } from 'next/server';
import { fetchNews } from '@/lib/eodhd-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const exchange = searchParams.get('exchange') || 'US';
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const data = await fetchNews(symbol, exchange, limit);
    return NextResponse.json(data);
  } catch (error) {
    console.error('News fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
