import { NextRequest, NextResponse } from 'next/server';
import { analyzeWithAlto } from '@/alto/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, exchange, inputs, userContext } = body;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    if (!inputs || !Array.isArray(inputs)) {
      return NextResponse.json({ error: 'Inputs array is required' }, { status: 400 });
    }

    const result = await analyzeWithAlto({
      symbol,
      exchange: exchange || 'US',
      inputs,
      userContext,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Alto analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}
