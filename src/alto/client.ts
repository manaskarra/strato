/**
 * Alto AI Client
 *
 * Handles communication with the AI API
 */

import { getAltoSystemPrompt } from './persona';
import { sanitizeInput, sanitizeDataContext, validateAIResponse, createSecureContext, validateEnvironment } from './security';

const API_BASE_URL = process.env.ALTO_API_BASE_URL || '';
const API_KEY = process.env.ALTO_API_KEY || '';
const MODEL = process.env.ALTO_MODEL || 'gpt-4.1-mini';

export interface AltoAnalysisRequest {
  symbol: string;
  exchange: string;
  inputs: any[];
  userContext?: string;
}

export interface AltoAnalysisResponse {
  analysis: string;
  model: string;
  timestamp: string;
  tokensUsed?: number;
}

/**
 * Analyze financial data using Alto AI
 */
export async function analyzeWithAlto(request: AltoAnalysisRequest): Promise<AltoAnalysisResponse> {
  // Validate environment
  const envValidation = validateEnvironment();
  if (!envValidation.valid) {
    throw new Error(`Configuration error: ${envValidation.error}`);
  }

  // Create secure context
  const secureContext = createSecureContext({
    symbol: request.symbol,
    exchange: request.exchange,
    inputs: request.inputs,
  });

  // Sanitize user context if provided
  const userContext = request.userContext ? sanitizeInput(request.userContext) : '';

  // Build the prompt
  const systemPrompt = getAltoSystemPrompt();

  const userPrompt = `Analyze the following financial data for ${request.symbol}.${request.exchange}:

${secureContext}

${userContext ? `Additional context: ${userContext}` : ''}

Provide a comprehensive analysis based on the available data. Include insights on:
- Key trends and patterns
- Risk factors
- Notable findings
- Actionable recommendations

Be specific and reference the data in your analysis.`;

  try {
    // Make API call
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Extract the analysis
    const analysisText = data.choices?.[0]?.message?.content || '';

    // Validate the response
    const validation = validateAIResponse(analysisText);
    if (!validation.valid) {
      throw new Error(`Invalid AI response: ${validation.error}`);
    }

    return {
      analysis: validation.sanitized,
      model: MODEL,
      timestamp: new Date().toISOString(),
      tokensUsed: data.usage?.total_tokens,
    };
  } catch (error: any) {
    console.error('Alto AI analysis error:', error);
    throw new Error(`Analysis failed: ${error.message}`);
  }
}

/**
 * Format analysis data for display
 */
export function formatAnalysisData(inputs: any[]): string {
  const sections: string[] = [];

  inputs.forEach((input) => {
    if (!input) return;

    // Technical Analysis
    if (input.rsi || input.macd || input.sma) {
      sections.push('Technical Indicators:');
      if (input.rsi?.length > 0) {
        const latest = input.rsi[0];
        sections.push(`- RSI: ${latest.rsi?.toFixed(2) || 'N/A'}`);
      }
      if (input.macd?.length > 0) {
        const latest = input.macd[0];
        sections.push(`- MACD: ${latest.macd?.toFixed(2) || 'N/A'}`);
      }
      if (input.sma?.length > 0) {
        const latest = input.sma[0];
        sections.push(`- SMA(50): $${latest.sma?.toFixed(2) || 'N/A'}`);
      }
    }

    // Fundamental Analysis
    if (input.peRatio || input.marketCap) {
      sections.push('\nFundamental Metrics:');
      if (input.peRatio) sections.push(`- P/E Ratio: ${input.peRatio.toFixed(2)}`);
      if (input.marketCap) sections.push(`- Market Cap: $${(input.marketCap / 1e9).toFixed(2)}B`);
      if (input.profitMargin) sections.push(`- Profit Margin: ${(input.profitMargin * 100).toFixed(2)}%`);
      if (input.roe) sections.push(`- ROE: ${(input.roe * 100).toFixed(2)}%`);
    }

    // News
    if (Array.isArray(input) && input.length > 0 && input[0].title) {
      sections.push('\nRecent News:');
      input.slice(0, 3).forEach((article, i) => {
        sections.push(`${i + 1}. ${article.title}`);
      });
    }

    // Chart Data
    if (Array.isArray(input) && input.length > 0 && input[0].close) {
      const latest = input[input.length - 1];
      const first = input[0];
      const change = ((latest.close - first.close) / first.close) * 100;
      sections.push('\nPrice Data:');
      sections.push(`- Current: $${latest.close.toFixed(2)}`);
      sections.push(`- Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);
    }
  });

  return sections.join('\n');
}
