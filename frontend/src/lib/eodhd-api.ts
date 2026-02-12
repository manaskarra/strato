// EODHD API utility functions

const EODHD_BASE_URL = 'https://eodhd.com/api';
const API_KEY = process.env.EODHD_API_KEY || process.env.NEXT_PUBLIC_EODHD_API_KEY;

export interface TechnicalIndicatorData {
  date: string;
  rsi?: number;
  macd?: number;
  signal?: number;
  histogram?: number;
  sma?: number;
  ema?: number;
  volume?: number;
}

export interface FundamentalData {
  symbol: string;
  name: string;
  marketCap: number;
  peRatio: number;
  forwardPE: number;
  profitMargin: number;
  operatingMargin: number;
  revenueTTM: number;
  revenueGrowth: number;
  roe: number;
  roa: number;
}

export interface NewsArticle {
  date: string;
  title: string;
  content: string;
  link: string;
  symbols: string[];
  tags: string[];
  sentiment: {
    polarity: number;
    neg: number;
    neu: number;
    pos: number;
  };
}

export interface OHLCVData {
  datetime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Technical Analysis - fetch multiple indicators
export async function fetchTechnicalAnalysis(
  symbol: string,
  exchange: string = 'US'
): Promise<{
  rsi: TechnicalIndicatorData[];
  macd: TechnicalIndicatorData[];
  sma: TechnicalIndicatorData[];
}> {
  const ticker = `${symbol}.${exchange}`;
  const today = new Date().toISOString().split('T')[0];
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [rsiData, macdData, smaData] = await Promise.all([
    fetch(
      `${EODHD_BASE_URL}/technical/${ticker}?function=rsi&period=14&from=${sixMonthsAgo}&to=${today}&order=d&api_token=${API_KEY}&fmt=json`
    ).then((r) => r.json()),
    fetch(
      `${EODHD_BASE_URL}/technical/${ticker}?function=macd&fast_period=12&slow_period=26&signal_period=9&from=${sixMonthsAgo}&to=${today}&order=d&api_token=${API_KEY}&fmt=json`
    ).then((r) => r.json()),
    fetch(
      `${EODHD_BASE_URL}/technical/${ticker}?function=sma&period=50&from=${sixMonthsAgo}&to=${today}&order=d&api_token=${API_KEY}&fmt=json`
    ).then((r) => r.json()),
  ]);

  return {
    rsi: rsiData || [],
    macd: macdData || [],
    sma: smaData || [],
  };
}

// Fundamental Analysis - fetch key metrics
export async function fetchFundamentalAnalysis(
  symbol: string,
  exchange: string = 'US'
): Promise<FundamentalData | null> {
  const ticker = `${symbol}.${exchange}`;

  try {
    const response = await fetch(
      `${EODHD_BASE_URL}/fundamentals/${ticker}?api_token=${API_KEY}&fmt=json`
    );
    const data = await response.json();

    if (!data || !data.Highlights) return null;

    return {
      symbol,
      name: data.General?.Name || symbol,
      marketCap: data.Highlights.MarketCapitalization || 0,
      peRatio: data.Highlights.PERatio || 0,
      forwardPE: data.Valuation?.ForwardPE || 0,
      profitMargin: data.Highlights.ProfitMargin || 0,
      operatingMargin: data.Highlights.OperatingMarginTTM || 0,
      revenueTTM: data.Highlights.RevenueTTM || 0,
      revenueGrowth: data.Highlights.QuarterlyRevenueGrowthYOY || 0,
      roe: data.Highlights.ReturnOnEquityTTM || 0,
      roa: data.Highlights.ReturnOnAssetsTTM || 0,
    };
  } catch (error) {
    console.error('Error fetching fundamental data:', error);
    return null;
  }
}

// News Search - fetch recent news for symbol
export async function fetchNews(
  symbol: string,
  exchange: string = 'US',
  limit: number = 20
): Promise<NewsArticle[]> {
  const ticker = `${symbol}.${exchange}`;
  const today = new Date().toISOString().split('T')[0];
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const response = await fetch(
      `${EODHD_BASE_URL}/news?s=${ticker}&from=${oneWeekAgo}&to=${today}&limit=${limit}&api_token=${API_KEY}&fmt=json`
    );
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

// Live Chart Data - fetch intraday OHLCV
export async function fetchChartData(
  symbol: string,
  exchange: string = 'US',
  interval: '1m' | '5m' | '1h' = '5m'
): Promise<OHLCVData[]> {
  const ticker = `${symbol}.${exchange}`;
  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - 24 * 60 * 60;

  try {
    const response = await fetch(
      `${EODHD_BASE_URL}/intraday/${ticker}?interval=${interval}&from=${oneDayAgo}&to=${now}&api_token=${API_KEY}&fmt=json`
    );
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return [];
  }
}

// Historical EOD data - for longer-term charts
export async function fetchHistoricalData(
  symbol: string,
  exchange: string = 'US',
  period: 'month' | 'quarter' | 'year' = 'year'
): Promise<OHLCVData[]> {
  const ticker = `${symbol}.${exchange}`;
  const today = new Date().toISOString().split('T')[0];
  const periods = { month: 30, quarter: 90, year: 365 };
  const daysAgo = periods[period];
  const fromDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const response = await fetch(
      `${EODHD_BASE_URL}/eod/${ticker}?from=${fromDate}&to=${today}&period=d&api_token=${API_KEY}&fmt=json`
    );
    const data = await response.json();

    return (data || []).map((item: any) => ({
      datetime: new Date(item.date).getTime() / 1000,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }));
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
}

// Data Insights - combine multiple data sources for AI analysis
export async function fetchDataInsights(
  symbol: string,
  exchange: string = 'US'
): Promise<{
  technical: any;
  fundamental: FundamentalData | null;
  news: NewsArticle[];
  recentPrice: OHLCVData[];
}> {
  const [technical, fundamental, news, recentPrice] = await Promise.all([
    fetchTechnicalAnalysis(symbol, exchange),
    fetchFundamentalAnalysis(symbol, exchange),
    fetchNews(symbol, exchange, 10),
    fetchHistoricalData(symbol, exchange, 'month'),
  ]);

  return {
    technical,
    fundamental,
    news,
    recentPrice,
  };
}
