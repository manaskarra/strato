import { NextRequest, NextResponse } from 'next/server';

const LLM_BASE = 'https://litellmprod.deriv.ai/v1';
const LLM_API_KEY = 'sk-1Ab_kC563L6vCwcvhLN2aQ';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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
      const text = await res.text();
      return NextResponse.json({ error: `LLM error: ${text}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to call LLM' }, { status: 500 });
  }
}
