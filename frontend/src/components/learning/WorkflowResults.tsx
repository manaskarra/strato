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
  const successfulResults = resultsArray.filter((r) => r.status === 'success');

  return (
    <div className="w-[400px] border-l border-border bg-card flex flex-col shrink-0">
      <div className="flex items-center justify-between p-4 border-b border-border">
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
        <div className="p-4 space-y-4">
          {resultsArray.map((result) => (
            <Card key={result.nodeId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    {formatNodeType(result.nodeType)}
                  </CardTitle>
                  <StatusBadge status={result.status} />
                </div>
              </CardHeader>
              {result.status === 'success' && result.data && (
                <CardContent className="pt-0">
                  <ResultContent nodeType={result.nodeType} data={result.data} />
                </CardContent>
              )}
              {result.status === 'error' && (
                <CardContent className="pt-0">
                  <p className="text-xs text-red-500">{result.error}</p>
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
        <div key={idx} className="border-l-2 border-blue-500 pl-2">
          <p className="text-xs font-medium text-foreground line-clamp-2">{article.title}</p>
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
    <div className="flex items-center justify-between">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
              {label}
              <HelpCircle className="w-3 h-3 opacity-50" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[200px]">
            <p className="text-xs leading-relaxed">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  );
}

function TechnicalResults({ data }: { data: any }) {
  const latestRSI = data.rsi?.[0]?.rsi;
  const latestMACD = data.macd?.[0];
  const latestSMA = data.sma?.[0]?.sma;

  return (
    <div className="space-y-2">
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
      {latestSMA && (
        <MetricRow
          label="SMA (50):"
          value={`$${latestSMA.toFixed(2)}`}
          tooltip="Simple Moving Average over 50 days. Price above SMA = uptrend, below = downtrend."
        />
      )}
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
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Latest Price:</span>
        <span className="text-xs font-semibold">${latest?.close?.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Change:</span>
        <span className={`text-xs font-semibold flex items-center gap-1 ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {changePercent.toFixed(2)}%
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Data Points:</span>
        <span className="text-xs font-semibold">{data.length}</span>
      </div>
    </div>
  );
}

function AltoResults({ data }: { data: any }) {
  if (!data || !data.analysis) {
    return <p className="text-xs text-muted-foreground">No analysis available</p>;
  }

  // Simple markdown-to-HTML conversion
  const formatAnalysis = (text: string) => {
    return text
      // Bold text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Bullet points
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Paragraphs
      .split('\n\n')
      .map(para => {
        if (para.includes('<li>')) {
          return `<ul class="list-disc pl-4 space-y-1">${para}</ul>`;
        }
        return `<p>${para}</p>`;
      })
      .join('');
  };

  return (
    <div className="space-y-3">
      <div
        className="text-xs text-foreground leading-relaxed space-y-2 [&>p]:mb-2 [&>ul]:mb-2 [&>strong]:font-semibold [&>strong]:text-foreground"
        dangerouslySetInnerHTML={{ __html: formatAnalysis(data.analysis) }}
      />
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
