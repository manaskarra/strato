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

// ── Constants ──────────────────────────────────────────────

const CATEGORIES = [
  { key: 'earnings', label: 'Earnings', icon: BarChart3 },
  { key: 'stocks', label: 'Stocks', icon: TrendingUp },
  { key: 'indices', label: 'Indices', icon: DollarSign },
  { key: 'fed-rates', label: 'Fed Rates', icon: Landmark },
  { key: 'macro-edge', label: 'Macro Edge', icon: Activity },
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

// ── Alto Analysis Modal ────────────────────────────────────

function AltoAnalysisModal({
  event,
  open,
  onClose,
}: {
  event: PolymarketEvent | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Alto's Analysis
          </DialogTitle>
          <DialogDescription>
            {event.title}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-6">
          {/* Placeholder content */}
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">
              Alto's Prediction Model
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Advanced market analysis coming soon. This will include fundamental analysis,
              technical indicators, insider sentiment, and more.
            </p>
          </div>
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

// ── Event Card With Alto Button ────────────────────────────

function EventCardWithAlto({
  event,
  onAltoClick,
}: {
  event: PolymarketEvent;
  onAltoClick: (event: PolymarketEvent) => void;
}) {
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

        {/* Alto's Prediction Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => onAltoClick(event)}
        >
          <Activity className="w-3.5 h-3.5" />
          Alto's Prediction
        </Button>

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
  loading,
  error,
  onRefresh,
  onAltoClick,
}: {
  category: string;
  allData: AllCategories | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onAltoClick: (event: PolymarketEvent) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  if (loading && !allData) return <MarketsSkeleton />;

  if (error && !allData) {
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

  const events = allData?.[category as keyof AllCategories] ?? [];

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
            <EventCardWithAlto key={event.id} event={event} onAltoClick={onAltoClick} />
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Alto modal state
  const [selectedEvent, setSelectedEvent] = useState<PolymarketEvent | null>(null);
  const [showAltoModal, setShowAltoModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.fetchPolymarketFinance();
      console.log('Polymarket data received:', result);
      console.log('Earnings data:', result?.earnings);
      console.log('Stocks data:', result?.stocks);
      setAllData(result);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching polymarket data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data when switching away from macro-edge
  useEffect(() => {
    if (activeTab === 'macro-edge') return;
    if (!allData && !loading) {
      fetchData();
    }
  }, [activeTab, allData, loading, fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (activeTab === 'macro-edge') return;
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeTab, fetchData]);

  const handleRefresh = () => {
    if (activeTab === 'macro-edge') return;
    fetchData();
  };

  const handleAltoClick = (event: PolymarketEvent) => {
    setSelectedEvent(event);
    setShowAltoModal(true);
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
        {CATEGORIES.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <Button
              key={key}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className="text-xs group relative overflow-hidden"
              onClick={() => setActiveTab(key)}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className={cn(
                "transition-all whitespace-nowrap",
                isActive
                  ? "inline-block opacity-100 max-w-[200px] ml-2"
                  : "inline-block opacity-0 max-w-0 ml-0 group-hover:opacity-100 group-hover:max-w-[200px] group-hover:ml-2"
              )}>
                {label}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'macro-edge' ? (
        <MacroEdgeTracker />
      ) : (
        <FinanceMarketsView
          category={activeTab}
          allData={allData}
          loading={loading}
          error={error}
          onRefresh={handleRefresh}
          onAltoClick={handleAltoClick}
        />
      )}

      {/* Alto Analysis Modal */}
      <AltoAnalysisModal
        event={selectedEvent}
        open={showAltoModal}
        onClose={() => setShowAltoModal(false)}
      />
    </div>
  );
}
