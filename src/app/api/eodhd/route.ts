import { NextRequest, NextResponse } from 'next/server';

const EODHD_API_KEY = '695e4829e46ab6.29057877';
const EODHD_BASE = 'https://eodhd.com/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || '';
  const params = new URLSearchParams();

  searchParams.forEach((value, key) => {
    if (key !== 'endpoint') {
      params.set(key, value);
    }
  });

  params.set('api_token', EODHD_API_KEY);
  params.set('fmt', 'json');

  try {
    const res = await fetch(`${EODHD_BASE}/${endpoint}?${params.toString()}`);
    if (!res.ok) {
      return NextResponse.json({ error: `EODHD API error: ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch from EODHD' }, { status: 500 });
  }
}
