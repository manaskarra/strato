'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { MacroEdgeTracker } from '@/components/signals/MacroEdgeTracker';
import { apiClient } from '@/lib/api-client';
import {
  Search, RefreshCw, ExternalLink, Clock, AlertTriangle,
  Activity, TrendingUp, BarChart3, DollarSign, Landmark,
  CheckCircle2, XCircle, TrendingDown as TrendingDownIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────

interface Market {
  question: string;
  outcomes: string[];
  prices: number[];
  volume: number;
  end_date: string;
}

interface PolymarketEvent {
  id: string;
  title: string;
  image: string;
  icon: string;
  slug: string;
  volume: number;
  volume24hr: number;
  liquidity: number;
  markets: Market[];
}

interface AllCategories {
  stocks: PolymarketEvent[];
  earnings: PolymarketEvent[];
  indices: PolymarketEvent[];
  'fed-rates': PolymarketEvent[];
}

interface EarningsWithEdge extends PolymarketEvent {
  ticker?: string;
  alto_prediction?: {
    beat_probability: number;
    prediction: string;
    confidence: string;
    signals: any[];
  };
  edge_analysis?: {
    edge: number;
    edge_abs: number;
    category: string;
    color: string;
    recommendation: string;
    signal: string;
  };
}

// ── Constants ──────────────────────────────────────────────

const CATEGORIES = [
  { key: 'earnings', label: 'Earnings', icon: BarChart3 },
  { key: 'macro-edge', label: 'Macro Edge', icon: Activity },
  { key: 'stocks', label: 'Stocks', icon: TrendingUp },
  { key: 'indices', label: 'Indices', icon: DollarSign },
  { key: 'fed-rates', label: 'Fed Rates', icon: Landmark },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'];

// ── Helpers ────────────────────────────────────────────────

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatEndDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

// ── Signal Detail Modal ────────────────────────────────────

function SignalDetailModal({
  signal,
  ticker,
  open,
  onClose,
}: {
  signal: any;
  ticker: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!signal) return null;

  const renderHistoricalBeatRate = () => {
    const data = signal.raw_data || [];
    if (data.length === 0) return <p className="text-sm text-muted-foreground">No historical data available</p>;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Beat Rate:</span>
          <span className="font-semibold text-foreground">{signal.beat_rate}%</span>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Quarter</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Estimate</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Actual</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Result</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Surprise</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row: any, idx: number) => (
                <tr key={idx} className="border-t border-border">
                  <td className="py-2 px-3 font-mono text-xs">{row.quarter}</td>
                  <td className="py-2 px-3 text-right">${row.estimate?.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-semibold">${row.actual?.toFixed(2)}</td>
                  <td className="py-2 px-3 text-center">
                    {row.beat ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                    )}
                  </td>
                  <td className={cn(
                    'py-2 px-3 text-right font-semibold',
                    row.surprise_pct > 0 ? 'text-emerald-500' : 'text-red-500'
                  )}>
                    {row.surprise_pct > 0 ? '+' : ''}{row.surprise_pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderRevenueGrowth = () => {
    const data = signal.raw_data || {};
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">YoY Growth</p>
            <p className={cn(
              'text-2xl font-bold',
              data.growth_yoy > 0 ? 'text-emerald-500' : 'text-red-500'
            )}>
              {data.growth_yoy > 0 ? '+' : ''}{data.growth_yoy}%
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Revenue TTM</p>
            <p className="text-2xl font-bold text-foreground">
              ${(data.revenue_ttm / 1e9).toFixed(2)}B
            </p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Market Cap:</span>
            <span className="font-semibold">${(data.market_cap / 1e9).toFixed(2)}B</span>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Analysis</p>
            <p className="text-xs text-foreground">
              {data.growth_yoy > 20 ? '🚀 Strong revenue acceleration - typically signals earnings beat' :
               data.growth_yoy > 10 ? '📈 Healthy revenue growth - positive indicator' :
               data.growth_yoy > 0 ? '➡️ Modest growth - neutral signal' :
               '⚠️ Revenue contraction - warning signal for earnings'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderProfitMargin = () => {
    const data = signal.raw_data || {};
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground mb-1">Profit Margin</p>
            <p className="text-xl font-bold text-foreground">{data.profit_margin}%</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground mb-1">Gross Margin</p>
            <p className="text-xl font-bold text-foreground">{data.gross_margin}%</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground mb-1">Operating Margin</p>
            <p className="text-xl font-bold text-foreground">{data.operating_margin}%</p>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">Margin Analysis</p>
          <p className="text-xs text-foreground">
            {data.profit_margin > 20 ? '✅ Excellent margins - strong pricing power and efficiency' :
             data.profit_margin > 10 ? '✅ Healthy margins - good profitability' :
             data.profit_margin > 5 ? '⚠️ Moderate margins - watch for compression' :
             '🔴 Weak margins - profitability concerns'}
          </p>
        </div>
      </div>
    );
  };

  const renderMomentum = () => {
    const data = signal.raw_data || [];
    if (data.length === 0) return <p className="text-sm text-muted-foreground">No price data available</p>;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Price Change</p>
            <p className={cn(
              'text-2xl font-bold',
              signal.price_change_pct > 0 ? 'text-emerald-500' : 'text-red-500'
            )}>
              {signal.price_change_pct > 0 ? '+' : ''}{signal.price_change_pct}%
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Current Price</p>
            <p className="text-2xl font-bold text-foreground">
              ${signal.end_price?.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">Last 10 Days</p>
          </div>
          <div className="p-3 space-y-1">
            {data.map((row: any, idx: number) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{row.date}</span>
                <span className="font-semibold">${row.close.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">Momentum Analysis</p>
          <p className="text-xs text-foreground">
            {signal.price_change_pct > 5 ? '📈 Strong upward momentum - market may be pricing in a beat' :
             signal.price_change_pct > 0 ? '↗️ Positive momentum - mild optimism' :
             signal.price_change_pct > -5 ? '↘️ Downward pressure - caution warranted' :
             '📉 Significant decline - market pessimistic about earnings'}
          </p>
        </div>
      </div>
    );
  };

  const renderInsiderSentiment = () => {
    const data = signal.raw_data || [];
    if (data.length === 0) return <p className="text-sm text-muted-foreground">No insider activity</p>;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs text-muted-foreground mb-1">Buys</p>
            <p className="text-3xl font-bold text-emerald-500">{signal.buys}</p>
          </div>
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-muted-foreground mb-1">Sells</p>
            <p className="text-3xl font-bold text-red-500">{signal.sells}</p>
          </div>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-2 px-3 text-[10px] font-medium text-muted-foreground">Date</th>
                <th className="text-left py-2 px-3 text-[10px] font-medium text-muted-foreground">Owner</th>
                <th className="text-center py-2 px-3 text-[10px] font-medium text-muted-foreground">Type</th>
                <th className="text-right py-2 px-3 text-[10px] font-medium text-muted-foreground">Shares</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row: any, idx: number) => (
                <tr key={idx} className="border-t border-border">
                  <td className="py-2 px-3 font-mono">{row.date}</td>
                  <td className="py-2 px-3 truncate max-w-[120px]">{row.owner}</td>
                  <td className="py-2 px-3 text-center">
                    <Badge variant={row.type.includes('buy') || row.type.includes('purchase') ? 'default' : 'destructive'} className="text-[9px]">
                      {row.type.includes('buy') || row.type.includes('purchase') ? 'BUY' : 'SELL'}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-right font-semibold">{row.shares.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">Insider Analysis</p>
          <p className="text-xs text-foreground">
            {signal.buys > signal.sells + 2 ? '🟢 Strong insider buying - executives confident in upcoming results' :
             signal.buys > signal.sells ? '🟢 Net insider buying - positive signal' :
             signal.sells > signal.buys + 2 ? '🔴 Heavy insider selling - potential concern' :
             signal.sells > signal.buys ? '🔴 Net insider selling - caution' :
             '⚪ Balanced activity - neutral signal'}
          </p>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (signal.name) {
      case 'Historical Beat Rate':
        return renderHistoricalBeatRate();
      case 'Revenue Growth':
        return renderRevenueGrowth();
      case 'Profit Margin':
        return renderProfitMargin();
      case 'Pre-Earnings Momentum':
        return renderMomentum();
      case 'Insider Sentiment':
        return renderInsiderSentiment();
      default:
        return <p className="text-sm text-muted-foreground">No detailed data available</p>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {signal.name}
            <Badge variant="secondary" className="text-xs font-mono">{ticker}</Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 pt-1">
            <span>Impact: {signal.value}</span>
            <Badge className={cn(
              'text-[10px]',
              signal.impact === 'bullish' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
              signal.impact === 'bearish' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
              'bg-muted text-muted-foreground'
            )}>
              {signal.impact}
            </Badge>
            {signal.score !== 0 && (
              <span className={cn(
                'text-xs font-mono font-semibold',
                signal.score > 0 ? 'text-emerald-500' : 'text-red-500'
              )}>
                {signal.score > 0 ? '+' : ''}{signal.score}pts
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Event Card ─────────────────────────────────────────────

function EventCard({ event }: { event: PolymarketEvent }) {
  const topMarkets = event.markets.slice(0, 3);
  const polymarketUrl = `https://polymarket.com/event/${event.slug}`;

  return (
    <Card className="hover:shadow-md transition-all group">
      <CardContent className="p-5 space-y-4">
        {/* Header: image + title */}
        <div className="flex items-start gap-3">
          {(event.image || event.icon) && (
            <img
              src={event.image || event.icon}
              alt=""
              className="w-10 h-10 rounded-lg object-cover shrink-0 bg-muted"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="flex-1 min-w-0">
            <a
              href={polymarketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 flex items-start gap-1"
            >
              {event.title}
              <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity" />
            </a>
          </div>
        </div>

        {/* Markets / Outcomes */}
        <div className="space-y-2">
          {topMarkets.map((market, idx) => {
            const yesPrice = market.prices[0] ?? 0;
            const noPrice = market.prices[1] ?? 0;
            const yesPct = Math.round(yesPrice * 100);
            const noPct = Math.round(noPrice * 100);
            const question = market.question !== event.title ? market.question : '';

            return (
              <div key={idx} className="space-y-1">
                {question && (
                  <p className="text-xs text-muted-foreground truncate">{question}</p>
                )}
                <div className="flex items-center gap-2">
                  {/* Probability bar */}
                  <div className="flex-1 h-7 rounded-md overflow-hidden flex bg-muted/50">
                    {yesPct > 0 && (
                      <div
                        className="bg-emerald-500/20 flex items-center justify-start px-2 transition-all"
                        style={{ width: `${yesPct}%` }}
                      >
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          Yes {yesPct}%
                        </span>
                      </div>
                    )}
                    {noPct > 0 && (
                      <div
                        className={cn(
                          "flex items-center px-2 transition-all",
                          yesPct === 0 ? "bg-red-500/20 justify-start" : "flex-1 justify-end"
                        )}
                        style={yesPct === 0 ? { width: `${noPct}%` } : {}}
                      >
                        <span className="text-xs font-semibold text-red-500 dark:text-red-400 whitespace-nowrap">
                          No {noPct}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {event.markets.length > 3 && (
            <p className="text-[10px] text-muted-foreground">
              +{event.markets.length - 3} more outcomes
            </p>
          )}
        </div>

        {/* Footer: volume + end date */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
          <div className="flex items-center gap-3">
            <span>Vol: {formatVolume(event.volume)}</span>
            {event.volume24hr > 0 && (
              <span>24h: {formatVolume(event.volume24hr)}</span>
            )}
          </div>
          {topMarkets[0]?.end_date && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatEndDate(topMarkets[0].end_date)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Earnings Card with Edge Analysis ───────────────────────

function EarningsCardWithEdge({ event }: { event: EarningsWithEdge }) {
  const [showSignals, setShowSignals] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<any>(null);
  const [showSignalModal, setShowSignalModal] = useState(false);

  const polymarketUrl = `https://polymarket.com/event/${event.slug}`;
  const firstMarket = event.markets[0];
  const polymarketYes = firstMarket?.prices[0] ? Math.round(firstMarket.prices[0] * 100) : null;
  const altoScore = event.alto_prediction?.beat_probability;
  const edge = event.edge_analysis;

  const handleSignalClick = (signal: any) => {
    setSelectedSignal(signal);
    setShowSignalModal(true);
  };

  // Edge badge styling
  const edgeBadgeClass = edge?.category === 'SIGNIFICANT EDGE'
    ? 'bg-red-500/20 text-red-600 dark:text-red-400'
    : edge?.category === 'SMALL EDGE'
    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
    : 'bg-muted text-muted-foreground';

  return (
    <Card className="hover:shadow-md transition-all group">
      <CardContent className="p-5 space-y-4">
        {/* Header: image + title + ticker */}
        <div className="flex items-start gap-3">
          {(event.image || event.icon) && (
            <img
              src={event.image || event.icon}
              alt=""
              className="w-10 h-10 rounded-lg object-cover shrink-0 bg-muted"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {event.ticker && (
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {event.ticker}
                </Badge>
              )}
              {edge && (
                <Badge className={cn('text-[10px]', edgeBadgeClass)}>
                  {edge.category}
                </Badge>
              )}
            </div>
            <a
              href={polymarketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 flex items-start gap-1 mt-1"
            >
              {event.title}
              <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity" />
            </a>
          </div>
        </div>

        {/* Prediction Comparison */}
        <div className="grid grid-cols-2 gap-3">
          {/* Polymarket Odds */}
          <div className="text-center p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
              Polymarket
            </p>
            {polymarketYes !== null ? (
              <p className="text-2xl font-bold text-foreground">{polymarketYes}%</p>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground/40">--</p>
            )}
            <p className="text-[9px] text-muted-foreground mt-0.5">will beat</p>
          </div>

          {/* Alto Prediction - Clickable */}
          <button
            onClick={() => setShowSignals(!showSignals)}
            className="text-center p-3 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors cursor-pointer w-full"
            disabled={!event.alto_prediction}
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 flex items-center justify-center gap-1">
              Alto's Model
              {event.alto_prediction && (
                <span className="text-[8px] text-primary">(click)</span>
              )}
            </p>
            {altoScore !== undefined ? (
              <>
                <p className={cn(
                  'text-2xl font-bold',
                  altoScore >= 60 ? 'text-emerald-500' : altoScore <= 40 ? 'text-red-500' : 'text-foreground'
                )}>
                  {altoScore}%
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {event.alto_prediction?.prediction}
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground/40">--</p>
            )}
          </button>
        </div>

        {/* Edge Indicator */}
        {edge && edge.edge_abs > 5 && (
          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="text-muted-foreground">Edge:</span>
            <span className={cn(
              'font-semibold',
              edge.edge > 0 ? 'text-emerald-500' : 'text-red-500'
            )}>
              {edge.edge > 0 ? '+' : ''}{edge.edge.toFixed(0)}pts
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground text-[11px]">
              {edge.recommendation}
            </span>
          </div>
        )}

        {/* Signal Breakdown - Expandable */}
        {showSignals && event.alto_prediction?.signals && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs font-semibold text-foreground mb-2">
              Signal Breakdown: <span className="text-muted-foreground font-normal">(click for details)</span>
            </p>
            {event.alto_prediction.signals.map((signal: any, idx: number) => (
              <button
                key={idx}
                onClick={() => handleSignalClick(signal)}
                className="flex items-start gap-2 text-xs w-full hover:bg-muted/50 p-2 rounded-lg transition-colors cursor-pointer"
              >
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0 mt-1.5',
                  signal.impact === 'bullish' ? 'bg-emerald-500' :
                  signal.impact === 'bearish' ? 'bg-red-500' :
                  'bg-muted-foreground'
                )} />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{signal.name}</span>
                    <span className="text-muted-foreground shrink-0">{signal.value}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className={cn(
                      'text-[9px] px-1.5 py-0',
                      signal.impact === 'bullish' ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400' :
                      signal.impact === 'bearish' ? 'border-red-500/50 text-red-600 dark:text-red-400' :
                      'border-muted-foreground/30 text-muted-foreground'
                    )}>
                      {signal.impact}
                    </Badge>
                    {signal.score !== 0 && (
                      <span className={cn(
                        'text-[10px] font-mono',
                        signal.score > 0 ? 'text-emerald-500' : 'text-red-500'
                      )}>
                        {signal.score > 0 ? '+' : ''}{signal.score}pts
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Signal Detail Modal */}
        <SignalDetailModal
          signal={selectedSignal}
          ticker={event.ticker || ''}
          open={showSignalModal}
          onClose={() => setShowSignalModal(false)}
        />

        {/* Footer: volume + confidence */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
          <span>Vol: {formatVolume(event.volume)}</span>
          {event.alto_prediction && (
            <Badge variant="outline" className="text-[9px]">
              {event.alto_prediction.confidence} confidence
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Loading Skeleton ───────────────────────────────────────

function MarketsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} lines={4} />
      ))}
    </div>
  );
}

// ── Finance Markets View ───────────────────────────────────

function FinanceMarketsView({
  category,
  allData,
  earningsWithEdge,
  loading,
  error,
  onRefresh,
}: {
  category: string;
  allData: AllCategories | null;
  earningsWithEdge: EarningsWithEdge[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  if (loading && !allData && !earningsWithEdge) return <MarketsSkeleton />;

  if (error && !allData && !earningsWithEdge) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6 flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="w-10 h-10 text-destructive" />
          <div>
            <h3 className="font-semibold text-foreground">Failed to load market data</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Use earnings with edge data if available, otherwise fall back to regular data
  const useEdgeData = category === 'earnings' && earningsWithEdge;
  const events = useEdgeData
    ? earningsWithEdge
    : (allData?.[category as keyof AllCategories] ?? []);

  const filtered = searchQuery
    ? events.filter((e) =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.markets.some((m) => m.question.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : events;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search markets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((event) => (
            useEdgeData ? (
              <EarningsCardWithEdge key={event.id} event={event as EarningsWithEdge} />
            ) : (
              <EventCard key={event.id} event={event} />
            )
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">
            {searchQuery ? 'No markets match your search.' : 'No active markets in this category.'}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────

export function Polymarket() {
  const [activeTab, setActiveTab] = useState<CategoryKey>('earnings');
  const [allData, setAllData] = useState<AllCategories | null>(null);
  const [earningsWithEdge, setEarningsWithEdge] = useState<EarningsWithEdge[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.fetchPolymarketFinance();
      setAllData(result);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEarningsWithEdge = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.fetchEarningsWithEdge();
      setEarningsWithEdge(result.events);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch earnings edge data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data when switching away from macro-edge
  useEffect(() => {
    if (activeTab === 'macro-edge') return;

    if (activeTab === 'earnings') {
      // Fetch earnings with edge analysis
      if (!earningsWithEdge && !loading) {
        fetchEarningsWithEdge();
      }
    } else {
      // Fetch regular category data
      if (!allData && !loading) {
        fetchData();
      }
    }
  }, [activeTab, allData, earningsWithEdge, loading, fetchData, fetchEarningsWithEdge]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (activeTab === 'macro-edge') return;

    const interval = activeTab === 'earnings'
      ? setInterval(fetchEarningsWithEdge, 5 * 60 * 1000)
      : setInterval(fetchData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [activeTab, fetchData, fetchEarningsWithEdge]);

  const handleRefresh = () => {
    if (activeTab === 'macro-edge') return;
    if (activeTab === 'earnings') {
      fetchEarningsWithEdge();
    } else {
      fetchData();
    }
  };

  return (
    <div className="p-6 lg:p-8 lg:px-12 xl:px-16 space-y-6 w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">
            Polymarket
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live finance prediction markets & macro edge analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && activeTab !== 'macro-edge' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastUpdated}
            </span>
          )}
          {activeTab !== 'macro-edge' && (
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-2">
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeTab === key ? 'default' : 'outline'}
            size="sm"
            className="gap-2 text-xs"
            onClick={() => setActiveTab(key)}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'macro-edge' ? (
        <MacroEdgeTracker />
      ) : (
        <FinanceMarketsView
          category={activeTab}
          allData={allData}
          earningsWithEdge={earningsWithEdge}
          loading={loading}
          error={error}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
