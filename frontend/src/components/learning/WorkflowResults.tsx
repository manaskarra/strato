'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NodeResult } from '@/lib/workflow-executor';
import {
  X, TrendingUp, TrendingDown, DollarSign, Newspaper,
  BarChart3, CheckCircle2, XCircle, Loader2, HelpCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WorkflowResultsProps {
  results: Map<string, NodeResult>;
  onClose: () => void;
}

export function WorkflowResults({ results, onClose }: WorkflowResultsProps) {
  const resultsArray = Array.from(results.values());
  // Filter out input nodes - only show analysis results
  const analysisResults = resultsArray.filter(
    (r) => !['symbol-input', 'stock-selection'].includes(r.nodeType)
  );
  const successfulResults = analysisResults.filter((r) => r.status === 'success');

  return (
    <div className="w-[320px] border-l border-border bg-card flex flex-col shrink-0 h-full overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-bold text-foreground">Workflow Results</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {analysisResults.map((result) => (
            <Card key={result.nodeId} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <CardTitle className="text-sm font-semibold truncate">
                    {formatNodeType(result.nodeType)}
                  </CardTitle>
                  <StatusBadge status={result.status} />
                </div>
              </CardHeader>
              {result.status === 'success' && result.data && (
                <CardContent className="pt-0 overflow-hidden">
                  <ResultContent nodeType={result.nodeType} data={result.data} />
                </CardContent>
              )}
              {result.status === 'error' && (
                <CardContent className="pt-0 overflow-hidden">
                  <p className="text-xs text-red-500 break-words">{result.error}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    loading: { icon: Loader2, label: 'Loading', className: 'bg-blue-500/20 text-blue-500' },
    success: { icon: CheckCircle2, label: 'Success', className: 'bg-emerald-500/20 text-emerald-500' },
    error: { icon: XCircle, label: 'Error', className: 'bg-red-500/20 text-red-500' },
    idle: { icon: CheckCircle2, label: 'Idle', className: 'bg-gray-500/20 text-gray-500' },
  };

  const { icon: Icon, label, className } = config[status as keyof typeof config] || config.idle;

  return (
    <Badge className={`text-[10px] gap-1 border-0 ${className}`}>
      <Icon className={`w-3 h-3 ${status === 'loading' ? 'animate-spin' : ''}`} />
      {label}
    </Badge>
  );
}

function ResultContent({ nodeType, data }: { nodeType: string; data: any }) {
  switch (nodeType) {
    case 'news-search':
      return <NewsResults data={data} />;
    case 'technical-analysis':
      return <TechnicalResults data={data} />;
    case 'fundamental-analysis':
      return <FundamentalResults data={data} />;
    case 'sentiment-analysis':
      return <SentimentResults data={data} />;
    case 'live-chart':
      return <ChartResults data={data} />;
    case 'alto-analysis':
      return <AltoResults data={data} />;
    default:
      return <pre className="text-[10px] text-muted-foreground overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
  }
}

function NewsResults({ data }: { data: any[] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="text-xs text-muted-foreground">No news found</p>;
  }

  return (
    <div className="space-y-2">
      {data.slice(0, 3).map((article, idx) => (
        <div key={idx} className="border-l-2 border-blue-500 pl-2 min-w-0">
          <p className="text-xs font-medium text-foreground line-clamp-2 break-words">{article.title}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {new Date(article.date).toLocaleDateString()}
          </p>
        </div>
      ))}
      {data.length > 3 && (
        <p className="text-[10px] text-muted-foreground">+ {data.length - 3} more articles</p>
      )}
    </div>
  );
}

function MetricRow({ label, value, tooltip }: { label: string; value: string | number; tooltip: string }) {
  return (
    <div className="flex items-center justify-between gap-2 min-w-0">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-muted-foreground flex items-center gap-1 cursor-help shrink-0">
              {label}
              <HelpCircle className="w-3 h-3 opacity-50" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[200px]">
            <p className="text-xs leading-relaxed">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className="text-xs font-semibold shrink-0">{value}</span>
    </div>
  );
}

function TechnicalResults({ data }: { data: any }) {
  const latestRSI = data.rsi?.[0]?.rsi;
  const latestMACD = data.macd?.[0];
  const latestSMA = data.sma?.[0]?.sma;
  const latestBBands = data.bbands?.[0];
  const latestEMA20 = data.ema20?.[0]?.ema;
  const latestEMA50 = data.ema50?.[0]?.ema;
  const latestEMA200 = data.ema200?.[0]?.ema;
  const latestATR = data.atr?.[0]?.atr;
  const latestStoch = data.stoch?.[0];

  return (
    <div className="space-y-3">
      {/* Momentum Indicators */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Momentum</p>
        {latestRSI && (
          <MetricRow
            label="RSI (14):"
            value={latestRSI.toFixed(2)}
            tooltip="Relative Strength Index measures momentum. Above 70 = overbought, below 30 = oversold."
          />
        )}
        {latestMACD && (
          <MetricRow
            label="MACD:"
            value={latestMACD.macd?.toFixed(2) || 'N/A'}
            tooltip="Moving Average Convergence Divergence shows trend direction and momentum. Positive = bullish, negative = bearish."
          />
        )}
        {latestStoch && (
          <MetricRow
            label="Stochastic:"
            value={latestStoch.SlowK?.toFixed(2) || 'N/A'}
            tooltip="Stochastic Oscillator compares closing price to price range. Above 80 = overbought, below 20 = oversold."
          />
        )}
      </div>

      {/* Trend Indicators */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Trend</p>
        {latestSMA && (
          <MetricRow
            label="SMA (50):"
            value={`$${latestSMA.toFixed(2)}`}
            tooltip="Simple Moving Average over 50 days. Price above SMA = uptrend, below = downtrend."
          />
        )}
        {latestEMA20 && (
          <MetricRow
            label="EMA (20):"
            value={`$${latestEMA20.toFixed(2)}`}
            tooltip="Exponential Moving Average over 20 days. More responsive to recent prices than SMA."
          />
        )}
        {latestEMA50 && (
          <MetricRow
            label="EMA (50):"
            value={`$${latestEMA50.toFixed(2)}`}
            tooltip="Exponential Moving Average over 50 days. Key intermediate trend indicator."
          />
        )}
        {latestEMA200 && (
          <MetricRow
            label="EMA (200):"
            value={`$${latestEMA200.toFixed(2)}`}
            tooltip="Exponential Moving Average over 200 days. Major long-term trend indicator."
          />
        )}
      </div>

      {/* Volatility Indicators */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Volatility</p>
        {latestBBands && (
          <>
            <MetricRow
              label="BB Upper:"
              value={`$${latestBBands.upper_band?.toFixed(2) || 'N/A'}`}
              tooltip="Bollinger Band Upper: Price touching upper band suggests overbought conditions."
            />
            <MetricRow
              label="BB Middle:"
              value={`$${latestBBands.middle_band?.toFixed(2) || 'N/A'}`}
              tooltip="Bollinger Band Middle: 20-period SMA, the baseline for the bands."
            />
            <MetricRow
              label="BB Lower:"
              value={`$${latestBBands.lower_band?.toFixed(2) || 'N/A'}`}
              tooltip="Bollinger Band Lower: Price touching lower band suggests oversold conditions."
            />
          </>
        )}
        {latestATR && (
          <MetricRow
            label="ATR (14):"
            value={latestATR.toFixed(2)}
            tooltip="Average True Range measures volatility. Higher ATR = more volatile price movement."
          />
        )}
      </div>
    </div>
  );
}

function FundamentalResults({ data }: { data: any }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data</p>;

  return (
    <div className="space-y-2">
      <MetricRow
        label="P/E Ratio:"
        value={data.peRatio?.toFixed(2) || 'N/A'}
        tooltip="Price-to-Earnings ratio. Shows how much investors pay per dollar of earnings. Lower can mean value, higher can mean growth expectations."
      />
      <MetricRow
        label="Profit Margin:"
        value={`${((data.profitMargin || 0) * 100).toFixed(2)}%`}
        tooltip="Net profit as a percentage of revenue. Higher margins mean the company keeps more of each dollar earned."
      />
      <MetricRow
        label="ROE:"
        value={`${((data.roe || 0) * 100).toFixed(2)}%`}
        tooltip="Return on Equity. Measures how efficiently a company uses shareholder capital to generate profit. Higher is better."
      />
      <MetricRow
        label="Market Cap:"
        value={`$${(data.marketCap / 1e9).toFixed(2)}B`}
        tooltip="Total market value of all outstanding shares. Indicates company size: <$2B = small cap, $2-10B = mid cap, >$10B = large cap."
      />
    </div>
  );
}

function SentimentResults({ data }: { data: any }) {
  if (!data || !data.latest) {
    return <p className="text-xs text-muted-foreground">No sentiment data</p>;
  }

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'text-emerald-500';
    if (score < -0.3) return 'text-red-500';
    return 'text-yellow-500';
  };

  const getSentimentLabel = (score: number) => {
    if (score > 0.5) return 'Very Positive';
    if (score > 0.2) return 'Positive';
    if (score > -0.2) return 'Neutral';
    if (score > -0.5) return 'Negative';
    return 'Very Negative';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-xs text-muted-foreground shrink-0">Latest Sentiment:</span>
        <span className={`text-xs font-semibold shrink-0 ${getSentimentColor(data.latest.normalized)}`}>
          {getSentimentLabel(data.latest.normalized)} ({data.latest.normalized.toFixed(2)})
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-xs text-muted-foreground shrink-0">30-Day Average:</span>
        <span className={`text-xs font-semibold shrink-0 ${getSentimentColor(data.average)}`}>
          {data.average.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-xs text-muted-foreground shrink-0">Articles Analyzed:</span>
        <span className="text-xs font-semibold shrink-0">{data.totalArticles}</span>
      </div>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-xs text-muted-foreground shrink-0">Latest Date:</span>
        <span className="text-xs font-semibold shrink-0">{data.latest.date}</span>
      </div>
    </div>
  );
}

function ChartResults({ data }: { data: any[] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="text-xs text-muted-foreground">No chart data</p>;
  }

  const latest = data[data.length - 1];
  const first = data[0];
  const change = latest?.close - first?.close;
  const changePercent = (change / first?.close) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-xs text-muted-foreground shrink-0">Latest Price:</span>
        <span className="text-xs font-semibold shrink-0">${latest?.close?.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-xs text-muted-foreground shrink-0">Change:</span>
        <span className={`text-xs font-semibold flex items-center gap-1 shrink-0 ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {changePercent.toFixed(2)}%
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-xs text-muted-foreground shrink-0">Data Points:</span>
        <span className="text-xs font-semibold shrink-0">{data.length}</span>
      </div>
    </div>
  );
}

function AltoResults({ data }: { data: any }) {
  if (!data || !data.analysis) {
    return <p className="text-xs text-muted-foreground">No analysis available</p>;
  }

  // Parse markdown safely without dangerouslySetInnerHTML
  const renderAnalysis = (text: string) => {
    // Split into paragraphs
    const paragraphs = text.split('\n\n');

    return paragraphs.map((para, pIdx) => {
      // Check if it's a bullet list
      const lines = para.split('\n');
      if (lines[0]?.trim().startsWith('-')) {
        return (
          <ul key={pIdx} className="list-disc pl-4 space-y-1 text-xs mb-2">
            {lines.map((line, lIdx) => {
              const content = line.replace(/^-\s*/, '');
              return <li key={lIdx}>{renderText(content)}</li>;
            })}
          </ul>
        );
      }

      // Regular paragraph
      return (
        <p key={pIdx} className="text-xs mb-2">
          {renderText(para)}
        </p>
      );
    });
  };

  // Render text with bold formatting (safe)
  const renderText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-3">
      <div className="text-foreground leading-relaxed space-y-2">
        {renderAnalysis(data.analysis)}
      </div>
      {data.tokensUsed && (
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground">
            Analyzed by {data.model} • {data.tokensUsed} tokens
          </p>
        </div>
      )}
    </div>
  );
}

function formatNodeType(nodeType: string): string {
  return nodeType
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
