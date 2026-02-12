// ─── Market Data Types ───
export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  sector: string;
  exchange: string;
}

export interface StockMover extends StockQuote {
  aiExplanation?: string;
  moveCategory: 'earnings' | 'sector' | 'news' | 'technical' | 'volume' | 'unknown';
  isLoading?: boolean;
}

export interface UnnoticedLeader {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  sectorPerformance: number;
  outperformance: number;
  sector: string;
  mediaScore: number; // 0-100, lower = less attention
}

export interface CorrelationAlert {
  asset1: string;
  asset2: string;
  currentCorrelation: number;
  historicalCorrelation: number;
  decorrelationPercent: number;
  explanation?: string;
  timeframe: string;
}

export interface ScreenerFilter {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap: number;
  pe: number;
  volume: number;
  sector: string;
}

// ─── Portfolio Types ───
export interface PortfolioHolding {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  value: number;
  gainLoss: number;
  gainLossPercent: number;
  sector: string;
  assetType: string;
  geography: string;
  weight: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  beta: number;
  volatility: number;
  sharpeRatio: number;
  concentrationRisk: number; // 0-100
  healthScore: number; // 0-100
  recommendations: string[];
}

export interface AllocationData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

// ─── Learning Lab Types ───
export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  category: 'input' | 'data' | 'technical' | 'fundamental' | 'analysis';
  icon: string;
  description: string;
  color: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  nodes: WorkflowNodePosition[];
  edges: WorkflowEdge[];
}

export interface WorkflowNodePosition {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: { label: string; nodeType: string; color: string };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface TutorialContent {
  title: string;
  sections: {
    heading: string;
    content: string;
  }[];
  quiz: QuizQuestion[];
}

// ─── API Types ───
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}
