/**
 * API Client for Python Backend
 *
 * All API calls now go to the FastAPI Python backend
 */

const PYTHON_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export const apiClient = {
  /**
   * Fetch technical analysis
   */
  async fetchTechnicalAnalysis(symbol: string, exchange: string = 'US') {
    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/eodhd/technical?symbol=${symbol}&exchange=${exchange}`
    );
    if (!response.ok) throw new Error('Failed to fetch technical analysis');
    return response.json();
  },

  /**
   * Fetch fundamental analysis
   */
  async fetchFundamentalAnalysis(symbol: string, exchange: string = 'US') {
    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/eodhd/fundamental?symbol=${symbol}&exchange=${exchange}`
    );
    if (!response.ok) throw new Error('Failed to fetch fundamental analysis');
    return response.json();
  },

  /**
   * Fetch news
   */
  async fetchNews(symbol: string, exchange: string = 'US', limit: number = 20) {
    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/eodhd/news?symbol=${symbol}&exchange=${exchange}&limit=${limit}`
    );
    if (!response.ok) throw new Error('Failed to fetch news');
    return response.json();
  },

  /**
   * Fetch chart data
   */
  async fetchChartData(
    symbol: string,
    exchange: string = 'US',
    period: string = 'month',
    interval: string = '5m'
  ) {
    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/eodhd/chart?symbol=${symbol}&exchange=${exchange}&period=${period}&interval=${interval}`
    );
    if (!response.ok) throw new Error('Failed to fetch chart data');
    return response.json();
  },

  /**
   * Alto AI analysis
   */
  async analyzeWithAlto(data: {
    symbol: string;
    exchange: string;
    inputs: any[];
    userContext?: string;
  }) {
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/alto/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: data.symbol,
        exchange: data.exchange,
        inputs: data.inputs,
        user_context: data.userContext,
      }),
    });
    if (!response.ok) throw new Error('Failed to analyze with Alto');
    return response.json();
  },
};
