import { StockMover, UnnoticedLeader, CorrelationAlert, PortfolioHolding, WorkflowTemplate } from './types';

export const mockMovers: StockMover[] = [
  {
    symbol: 'NVDA', name: 'NVIDIA Corporation', price: 875.32, change: 47.21, changePercent: 5.7,
    volume: 68_000_000, avgVolume: 42_000_000, marketCap: 2_150_000_000_000, sector: 'Technology',
    exchange: 'NASDAQ', moveCategory: 'earnings',
    aiExplanation: 'NVIDIA surged 5.7% after reporting Q4 earnings that crushed expectations. Revenue hit $22.1B (vs $20.4B expected), driven by data center demand up 409% YoY. CEO Jensen Huang highlighted that "accelerated computing has reached a tipping point." The Blackwell architecture announcement added fuel, with analysts raising price targets across the board.'
  },
  {
    symbol: 'SMCI', name: 'Super Micro Computer', price: 1024.15, change: -89.33, changePercent: -8.0,
    volume: 31_000_000, avgVolume: 12_000_000, marketCap: 58_000_000_000, sector: 'Technology',
    exchange: 'NASDAQ', moveCategory: 'technical',
    aiExplanation: 'Super Micro dropped 8% on massive volume (2.5x average) as the stock hit overbought territory after a 250% run. No specific news catalyst — this appears to be a technical correction with profit-taking. RSI had reached 87 before the reversal. Short interest remains elevated at 12% of float.'
  },
  {
    symbol: 'MRNA', name: 'Moderna Inc', price: 98.45, change: 12.67, changePercent: 14.8,
    volume: 45_000_000, avgVolume: 18_000_000, marketCap: 37_000_000_000, sector: 'Healthcare',
    exchange: 'NASDAQ', moveCategory: 'news',
    aiExplanation: 'Moderna rallied 14.8% on news of promising Phase 3 results for its cancer vaccine (mRNA-4157/V940) in combination with Keytruda. The trial showed a 44% reduction in recurrence of melanoma. This validates mRNA technology beyond COVID vaccines and opens a massive oncology market opportunity.'
  },
  {
    symbol: 'BA', name: 'Boeing Co', price: 198.76, change: -15.43, changePercent: -7.2,
    volume: 28_000_000, avgVolume: 14_000_000, marketCap: 120_000_000_000, sector: 'Industrials',
    exchange: 'NYSE', moveCategory: 'news',
    aiExplanation: 'Boeing fell 7.2% after the FAA ordered inspections of all 737 MAX 9 aircraft following a door plug blowout incident. Airlines grounded approximately 171 aircraft. The financial impact includes estimated compensation costs of $1-2B and potential delivery delays. Analysts noted this could push 2024 delivery targets down 10-15%.'
  },
  {
    symbol: 'COIN', name: 'Coinbase Global', price: 187.92, change: 23.45, changePercent: 14.2,
    volume: 32_000_000, avgVolume: 15_000_000, marketCap: 45_000_000_000, sector: 'Financial Services',
    exchange: 'NASDAQ', moveCategory: 'sector',
    aiExplanation: 'Coinbase surged 14.2% riding the broader crypto rally as Bitcoin broke above $52,000 for the first time since 2021. Spot Bitcoin ETF inflows exceeded $600M this week, driving increased trading volumes. Coinbase benefits directly as the custodian for 8 of 11 approved Bitcoin ETFs.'
  },
  {
    symbol: 'RIVN', name: 'Rivian Automotive', price: 16.88, change: -2.34, changePercent: -12.2,
    volume: 55_000_000, avgVolume: 30_000_000, marketCap: 17_000_000_000, sector: 'Consumer Cyclical',
    exchange: 'NASDAQ', moveCategory: 'earnings',
    aiExplanation: 'Rivian plunged 12.2% after guiding for flat 2024 production of 57,000 vehicles, missing analyst expectations of 80,000+. The company also announced a pause on construction of its Georgia factory to preserve cash. Cash burn rate of $1.6B/quarter raises concerns about the path to profitability.'
  },
  {
    symbol: 'META', name: 'Meta Platforms', price: 474.32, change: 21.56, changePercent: 4.8,
    volume: 24_000_000, avgVolume: 18_000_000, marketCap: 1_215_000_000_000, sector: 'Technology',
    exchange: 'NASDAQ', moveCategory: 'earnings',
    aiExplanation: 'Meta rose 4.8% as markets continued to digest its first-ever dividend announcement and $50B buyback program. The "Year of Efficiency" is paying off — operating margins expanded to 41% from 20% a year ago. AI-driven ad targeting improvements drove 24% revenue growth, exceeding guidance.'
  },
];

export const mockUnnoticedLeaders: UnnoticedLeader[] = [
  { symbol: 'PLTR', name: 'Palantir Technologies', price: 24.56, changePercent: 18.3, sectorPerformance: 3.2, outperformance: 15.1, sector: 'Technology', mediaScore: 25 },
  { symbol: 'VST', name: 'Vistra Corp', price: 48.92, changePercent: 22.7, sectorPerformance: 4.1, outperformance: 18.6, sector: 'Utilities', mediaScore: 12 },
  { symbol: 'AXON', name: 'Axon Enterprise', price: 267.45, changePercent: 16.8, sectorPerformance: 2.5, outperformance: 14.3, sector: 'Industrials', mediaScore: 18 },
  { symbol: 'MELI', name: 'MercadoLibre', price: 1678.90, changePercent: 14.2, sectorPerformance: 1.8, outperformance: 12.4, sector: 'Consumer Cyclical', mediaScore: 22 },
  { symbol: 'TRGP', name: 'Targa Resources', price: 98.34, changePercent: 19.5, sectorPerformance: 5.2, outperformance: 14.3, sector: 'Energy', mediaScore: 8 },
];

export const mockCorrelationAlerts: CorrelationAlert[] = [
  {
    asset1: 'GLD (Gold)', asset2: 'UUP (US Dollar)',
    currentCorrelation: -0.12, historicalCorrelation: -0.65,
    decorrelationPercent: 81.5, timeframe: '30 days',
    explanation: 'Gold and the US Dollar have historically moved inversely. The current breakdown in this relationship suggests conflicting macro signals — gold is rising on safe-haven demand while the dollar strengthens on rate differential expectations. Watch for a reversion.'
  },
  {
    asset1: 'XLK (Tech Sector)', asset2: 'QQQ (Nasdaq 100)',
    currentCorrelation: 0.72, historicalCorrelation: 0.96,
    decorrelationPercent: 25.0, timeframe: '14 days',
    explanation: 'Tech sector ETF and Nasdaq 100 are unusually decorrelated. This is driven by the mega-cap AI trade — NVDA, META, MSFT are carrying QQQ while broader tech lags. Consider this a sign of narrowing market breadth within tech.'
  },
  {
    asset1: 'TLT (Long Bonds)', asset2: 'SPY (S&P 500)',
    currentCorrelation: 0.35, historicalCorrelation: -0.42,
    decorrelationPercent: 183.3, timeframe: '60 days',
    explanation: 'Bonds and stocks are moving together, which breaks the traditional diversification benefit. This typically happens during regime changes in monetary policy. The "stocks and bonds both fall" scenario is a key risk for 60/40 portfolios right now.'
  },
];

export const mockPortfolioHoldings: PortfolioHolding[] = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc', shares: 50, avgCost: 155.00, currentPrice: 182.52, value: 9126, gainLoss: 1376, gainLossPercent: 17.74, sector: 'Technology', assetType: 'Stock', geography: 'US', weight: 0 },
  { id: '2', symbol: 'MSFT', name: 'Microsoft Corp', shares: 30, avgCost: 310.00, currentPrice: 404.87, value: 12146.1, gainLoss: 2846.1, gainLossPercent: 30.58, sector: 'Technology', assetType: 'Stock', geography: 'US', weight: 0 },
  { id: '3', symbol: 'GOOGL', name: 'Alphabet Inc', shares: 40, avgCost: 125.00, currentPrice: 141.80, value: 5672, gainLoss: 672, gainLossPercent: 13.44, sector: 'Technology', assetType: 'Stock', geography: 'US', weight: 0 },
  { id: '4', symbol: 'AMZN', name: 'Amazon.com', shares: 25, avgCost: 140.00, currentPrice: 178.25, value: 4456.25, gainLoss: 956.25, gainLossPercent: 27.32, sector: 'Consumer Cyclical', assetType: 'Stock', geography: 'US', weight: 0 },
  { id: '5', symbol: 'JPM', name: 'JPMorgan Chase', shares: 20, avgCost: 145.00, currentPrice: 183.27, value: 3665.4, gainLoss: 765.4, gainLossPercent: 26.39, sector: 'Financial Services', assetType: 'Stock', geography: 'US', weight: 0 },
  { id: '6', symbol: 'JNJ', name: 'Johnson & Johnson', shares: 35, avgCost: 160.00, currentPrice: 156.74, value: 5485.9, gainLoss: -114.1, gainLossPercent: -2.04, sector: 'Healthcare', assetType: 'Stock', geography: 'US', weight: 0 },
  { id: '7', symbol: 'TSM', name: 'Taiwan Semiconductor', shares: 45, avgCost: 95.00, currentPrice: 134.56, value: 6055.2, gainLoss: 1780.2, gainLossPercent: 41.64, sector: 'Technology', assetType: 'Stock', geography: 'Asia', weight: 0 },
  { id: '8', symbol: 'ASML', name: 'ASML Holding', shares: 8, avgCost: 650.00, currentPrice: 912.45, value: 7299.6, gainLoss: 2099.6, gainLossPercent: 40.38, sector: 'Technology', assetType: 'Stock', geography: 'Europe', weight: 0 },
  { id: '9', symbol: 'VTI', name: 'Vanguard Total Stock', shares: 40, avgCost: 215.00, currentPrice: 248.32, value: 9932.8, gainLoss: 1332.8, gainLossPercent: 15.50, sector: 'Diversified', assetType: 'ETF', geography: 'US', weight: 0 },
  { id: '10', symbol: 'BND', name: 'Vanguard Total Bond', shares: 60, avgCost: 74.00, currentPrice: 72.85, value: 4371, gainLoss: -69, gainLossPercent: -1.55, sector: 'Fixed Income', assetType: 'ETF', geography: 'US', weight: 0 },
];

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'ai-research',
    name: 'AI Research Workflow',
    description: 'Complete AI-powered research workflow from news to analysis',
    difficulty: 'beginner',
    category: 'AI Analysis',
    nodes: [
      { id: '1', type: 'custom', position: { x: 100, y: 100 }, data: { label: 'News Search', nodeType: 'news-search', color: '#ec4899' } },
      { id: '2', type: 'custom', position: { x: 100, y: 220 }, data: { label: 'Stock Selection', nodeType: 'stock-selection', color: '#3b82f6' } },
      { id: '3', type: 'custom', position: { x: 320, y: 160 }, data: { label: 'Ask Alto', nodeType: 'alto-analysis', color: '#ec4899' } },
    ],
    edges: [
      { id: 'e1-3', source: '1', target: '3' },
      { id: 'e2-3', source: '2', target: '3' },
    ],
  },
  {
    id: 'technical-strategy',
    name: 'Technical Analysis Strategy',
    description: 'Analyze stocks using technical indicators and chart patterns',
    difficulty: 'beginner',
    category: 'Technical Analysis',
    nodes: [
      { id: '1', type: 'custom', position: { x: 100, y: 150 }, data: { label: 'Stock Symbol', nodeType: 'symbol-input', color: '#3b82f6' } },
      { id: '2', type: 'custom', position: { x: 300, y: 150 }, data: { label: 'Technical Analysis', nodeType: 'technical-analysis', color: '#ec4899' } },
      { id: '3', type: 'custom', position: { x: 500, y: 150 }, data: { label: 'Live Chart', nodeType: 'live-chart', color: '#ec4899' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
    ],
  },
  {
    id: 'value',
    name: 'Value Investing',
    description: 'Find undervalued stocks using fundamental analysis and AI insights',
    difficulty: 'intermediate',
    category: 'Fundamental Analysis',
    nodes: [
      { id: '1', type: 'custom', position: { x: 100, y: 150 }, data: { label: 'Stock Selection', nodeType: 'stock-selection', color: '#3b82f6' } },
      { id: '2', type: 'custom', position: { x: 300, y: 150 }, data: { label: 'Fundamental Analysis', nodeType: 'fundamental-analysis', color: '#ec4899' } },
      { id: '3', type: 'custom', position: { x: 520, y: 150 }, data: { label: 'Ask Alto', nodeType: 'alto-analysis', color: '#ec4899' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
    ],
  },
  {
    id: 'comprehensive',
    name: 'Comprehensive Analysis',
    description: 'Full analysis combining news, technical, fundamental, and AI insights',
    difficulty: 'advanced',
    category: 'Complete Strategy',
    nodes: [
      { id: '1', type: 'custom', position: { x: 100, y: 80 }, data: { label: 'News Search', nodeType: 'news-search', color: '#ec4899' } },
      { id: '2', type: 'custom', position: { x: 100, y: 240 }, data: { label: 'Stock Selection', nodeType: 'stock-selection', color: '#3b82f6' } },
      { id: '3', type: 'custom', position: { x: 300, y: 80 }, data: { label: 'Technical Analysis', nodeType: 'technical-analysis', color: '#ec4899' } },
      { id: '4', type: 'custom', position: { x: 300, y: 240 }, data: { label: 'Fundamental Analysis', nodeType: 'fundamental-analysis', color: '#ec4899' } },
      { id: '5', type: 'custom', position: { x: 520, y: 160 }, data: { label: 'Ask Alto', nodeType: 'alto-analysis', color: '#ec4899' } },
    ],
    edges: [
      { id: 'e1-3', source: '1', target: '3' },
      { id: 'e2-4', source: '2', target: '4' },
      { id: 'e3-5', source: '3', target: '5' },
      { id: 'e4-5', source: '4', target: '5' },
    ],
  },
];

// Chart colors — red/blue theme
export const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899',
  '#6366f1', '#f43f5e', '#2563eb', '#7c3aed', '#0ea5e9',
];

export const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#3b82f6',
  'Healthcare': '#06b6d4',
  'Financial Services': '#8b5cf6',
  'Consumer Cyclical': '#ec4899',
  'Industrials': '#6366f1',
  'Energy': '#ef4444',
  'Utilities': '#0ea5e9',
  'Fixed Income': '#7c3aed',
  'Diversified': '#f43f5e',
  'Other': '#64748b',
};
