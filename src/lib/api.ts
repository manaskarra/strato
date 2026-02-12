// ─── EODHD API (proxied through /api/eodhd) ───

export async function fetchStockQuote(symbol: string, exchange = 'US') {
  const res = await fetch(
    `/api/eodhd?endpoint=real-time/${symbol}.${exchange}`
  );
  if (!res.ok) throw new Error(`Failed to fetch quote for ${symbol}`);
  return res.json();
}

export async function fetchHistoricalData(symbol: string, from: string, to: string, exchange = 'US') {
  const res = await fetch(
    `/api/eodhd?endpoint=eod/${symbol}.${exchange}&from=${from}&to=${to}`
  );
  if (!res.ok) throw new Error(`Failed to fetch historical data for ${symbol}`);
  return res.json();
}

export async function fetchFundamentals(symbol: string, exchange?: string) {
  // Auto-detect exchange for crypto
  let finalExchange = exchange;
  let finalSymbol = symbol;

  if (!finalExchange) {
    if (symbol.includes('-USD') || symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('USDT')) {
      finalExchange = 'CC';
    } else if (symbol.includes('.')) {
      const parts = symbol.split('.');
      finalSymbol = parts[0];
      finalExchange = parts[1];
    } else {
      finalExchange = 'US';
    }
  }

  const res = await fetch(
    `/api/eodhd?endpoint=fundamentals/${finalSymbol}.${finalExchange}`
  );
  if (!res.ok) throw new Error(`Failed to fetch fundamentals for ${symbol}`);
  return res.json();
}

// Fetch real-time quotes for multiple symbols at once
export async function fetchBatchQuotes(symbols: string[], exchange = 'US') {
  if (symbols.length === 0) return [];

  // EODHD supports up to 15-20 symbols per request
  const batches: string[][] = [];
  for (let i = 0; i < symbols.length; i += 15) {
    batches.push(symbols.slice(i, i + 15));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      const primarySymbol = batch[0];
      const additionalSymbols = batch.slice(1).map(s => `${s}.${exchange}`).join(',');
      const endpoint = `real-time/${primarySymbol}.${exchange}${additionalSymbols ? `&s=${additionalSymbols}` : ''}`;

      const res = await fetch(`/api/eodhd?endpoint=${endpoint}`);
      if (!res.ok) throw new Error(`Failed to fetch quotes`);
      return res.json();
    })
  );

  return results.flat();
}

// Get current price for a single symbol
export async function fetchCurrentPrice(symbol: string, exchange?: string): Promise<number> {
  try {
    // Auto-detect exchange based on symbol format
    let finalExchange = exchange;
    let finalSymbol = symbol;

    if (!finalExchange) {
      // Crypto detection
      if (symbol.includes('-USD') || symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('USDT')) {
        finalExchange = 'CC'; // Crypto exchange
        // Convert BTC-USD to BTC-USD for EODHD
        finalSymbol = symbol;
      } else if (symbol.includes('.')) {
        // Already has exchange suffix
        const parts = symbol.split('.');
        finalSymbol = parts[0];
        finalExchange = parts[1];
      } else {
        finalExchange = 'US'; // Default to US stocks
      }
    }

    const res = await fetch(`/api/eodhd?endpoint=real-time/${finalSymbol}.${finalExchange}`);
    if (!res.ok) throw new Error(`Failed to fetch price for ${symbol}`);
    const data = await res.json();

    // Try multiple fields in order of preference
    const price = data.close || data.previousClose || data.price || data.last;

    // Ensure we return a valid number
    const numPrice = typeof price === 'number' ? price : parseFloat(price) || 0;

    console.log(`Fetched price for ${finalSymbol}.${finalExchange}: ${numPrice}`);
    return numPrice;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return 0;
  }
}

export async function fetchNews(symbol?: string) {
  const symbolParam = symbol ? `&s=${symbol}.US` : '';
  const res = await fetch(
    `/api/eodhd?endpoint=news${symbolParam}&limit=10`
  );
  if (!res.ok) throw new Error('Failed to fetch news');
  return res.json();
}

export async function searchSymbol(query: string) {
  const res = await fetch(
    `/api/eodhd?endpoint=search/${query}`
  );
  if (!res.ok) throw new Error('Failed to search');
  return res.json();
}

// ─── LLM API (proxied through /api/chat) ───

export async function chatCompletion(
  messages: { role: string; content: string }[],
  model = 'gpt-4.1-mini'
): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    throw new Error('LLM request failed');
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function generateMoveExplanation(
  symbol: string,
  changePercent: number,
  volume: number,
  sector: string
): Promise<string> {
  const direction = changePercent > 0 ? 'up' : 'down';
  return chatCompletion([
    {
      role: 'system',
      content: 'You are a financial analyst at Strato, a financial intelligence platform. Give concise, insightful explanations for stock moves. Be conversational and educational. Keep responses under 100 words.',
    },
    {
      role: 'user',
      content: `${symbol} moved ${direction} ${Math.abs(changePercent).toFixed(1)}% today. Volume was ${(volume / 1_000_000).toFixed(1)}M shares. Sector: ${sector}. Explain why this might have happened, considering earnings, news, sector rotation, or technical factors.`,
    },
  ]);
}

export async function generateTutorial(
  nodeLabels: string[],
  connections: string[]
): Promise<string> {
  return chatCompletion([
    {
      role: 'system',
      content: 'You are a friendly investing tutor at Strato. Create educational content about stock analysis. Be conversational, use examples, and avoid jargon without explanations. Format your response as JSON with this structure: {"title": "string", "sections": [{"heading": "string", "content": "string"}], "quiz": [{"question": "string", "options": ["a","b","c","d"], "correctAnswer": 0, "explanation": "string"}]}. Include 3-5 quiz questions.',
    },
    {
      role: 'user',
      content: `Create a tutorial about this analysis workflow. The user connected these analysis nodes: ${nodeLabels.join(', ')}. The connections are: ${connections.join(', ')}. Explain what each component does, why connecting them in this order matters, and give a real example.`,
    },
  ]);
}

export async function generatePortfolioInsight(
  holdings: { symbol: string; weight: number; gainLossPercent: number; sector: string; value: number }[]
): Promise<string> {
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const sectorBreakdown = holdings.reduce((acc, h) => {
    acc[h.sector] = (acc[h.sector] || 0) + h.weight;
    return acc;
  }, {} as Record<string, number>);

  const topHolding = holdings.reduce((max, h) => h.weight > max.weight ? h : max, holdings[0]);
  const avgReturn = holdings.reduce((sum, h) => sum + h.gainLossPercent * h.weight, 0);

  return chatCompletion([
    {
      role: 'system',
      content: `You are Alto, an AI portfolio analyst at Strato. Analyze portfolios with a focus on:
- Concentration risk (any single holding > 20% is concerning)
- Sector diversification (tech-heavy portfolios are common but risky)
- Geographic exposure (US-only vs international mix)
- Asset type balance (stocks vs bonds vs ETFs)
- Performance patterns and risk-adjusted returns

Be concise (under 150 words), actionable, and educational. Reference specific holdings by ticker when making points.`,
    },
    {
      role: 'user',
      content: `Analyze this portfolio:

**Portfolio Summary:**
- Total Value: $${totalValue.toLocaleString()}
- Number of Holdings: ${holdings.length}
- Average Return: ${avgReturn.toFixed(2)}%
- Largest Position: ${topHolding.symbol} at ${(topHolding.weight * 100).toFixed(1)}%

**Sector Breakdown:**
${Object.entries(sectorBreakdown).map(([sector, weight]) => `- ${sector}: ${(weight * 100).toFixed(1)}%`).join('\n')}

**Individual Holdings:**
${holdings.map(h => `${h.symbol}: ${(h.weight * 100).toFixed(1)}% allocation, ${h.gainLossPercent >= 0 ? '+' : ''}${h.gainLossPercent.toFixed(1)}% return`).join('\n')}

Provide actionable insights on diversification, risk, and specific improvements.`,
    },
  ]);
}
