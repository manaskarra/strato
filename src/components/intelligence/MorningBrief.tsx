'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonCard, SkeletonRow } from '@/components/shared/SkeletonCard';
import { mockMovers } from '@/lib/mock-data';
import { generateMoveExplanation } from '@/lib/api';
import { StockMover } from '@/lib/types';
import {
  TrendingUp, TrendingDown, Volume2, Sparkles,
  ChevronDown, ChevronUp, BarChart3, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  earnings: { label: 'Earnings', color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400', icon: BarChart3 },
  sector: { label: 'Sector Move', color: 'bg-purple-500/20 text-purple-600 dark:text-purple-400', icon: TrendingUp },
  news: { label: 'News Catalyst', color: 'bg-red-500/20 text-red-600 dark:text-red-400', icon: Zap },
  technical: { label: 'Technical', color: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400', icon: TrendingDown },
  volume: { label: 'Volume Anomaly', color: 'bg-rose-500/20 text-rose-600 dark:text-rose-400', icon: Volume2 },
  unknown: { label: 'Mixed', color: 'bg-muted text-muted-foreground', icon: Sparkles },
};

function MoverCard({ mover }: { mover: StockMover }) {
  const [expanded, setExpanded] = useState(false);
  const [explanation, setExplanation] = useState(mover.aiExplanation || '');
  const [loading, setLoading] = useState(false);
  const isPositive = mover.changePercent > 0;
  const cat = categoryConfig[mover.moveCategory] || categoryConfig.unknown;
  const CatIcon = cat.icon;

  const handleExpand = async () => {
    setExpanded(!expanded);
    if (!explanation && !expanded) {
      setLoading(true);
      try {
        const result = await generateMoveExplanation(mover.symbol, mover.changePercent, mover.volume, mover.sector);
        setExplanation(result);
      } catch {
        setExplanation(mover.aiExplanation || 'Unable to generate explanation at this time.');
      } finally { setLoading(false); }
    }
  };

  return (
    <Card className="group hover:shadow-md dark:hover:shadow-blue-500/5 transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
              {isPositive ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">{mover.symbol}</span>
                <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 border-0', cat.color)}>
                  <CatIcon className="w-3 h-3 mr-1" />{cat.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{mover.name}</p>
            </div>
          </div>
          <div className="text-right shrink-0 ml-3">
            <p className="font-semibold text-sm text-foreground">${mover.price.toFixed(2)}</p>
            <p className={cn('text-sm font-medium', isPositive ? 'text-emerald-500' : 'text-red-500')}>
              {isPositive ? '+' : ''}{mover.changePercent.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground shrink-0">Volume</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', mover.volume > mover.avgVolume * 1.5 ? 'bg-red-500' : 'bg-blue-500')}
              style={{ width: `${Math.min((mover.volume / mover.avgVolume) * 50, 100)}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {(mover.volume / 1_000_000).toFixed(1)}M
            {mover.volume > mover.avgVolume * 1.5 && <span className="text-red-500 ml-1">({((mover.volume / mover.avgVolume) * 100 - 100).toFixed(0)}%+)</span>}
          </span>
        </div>

        <Button variant="ghost" size="sm" className="w-full mt-3 text-xs gap-1.5 h-7 text-muted-foreground" onClick={handleExpand}>
          <Sparkles className="w-3 h-3 text-primary" />
          {expanded ? 'Hide' : 'Why did this move?'}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>

        {expanded && (
          <div className="mt-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
            {loading ? (
              <div className="space-y-2">
                <div className="h-3 bg-primary/10 rounded animate-shimmer" />
                <div className="h-3 bg-primary/10 rounded animate-shimmer w-4/5" />
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-foreground/80">{explanation}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MorningBrief() {
  const [movers, setMovers] = useState<StockMover[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => { setMovers(mockMovers); setLoading(false); }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <div className="space-y-4"><SkeletonCard lines={2} /><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map((i) => <SkeletonRow key={i} />)}</div></div>;

  const gainers = movers.filter((m) => m.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent);
  const losers = movers.filter((m) => m.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground font-medium">Top Gainer</p><p className="text-xl font-bold text-emerald-500 mt-1">{gainers[0]?.symbol}<span className="text-sm font-normal ml-1">+{gainers[0]?.changePercent.toFixed(1)}%</span></p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground font-medium">Top Loser</p><p className="text-xl font-bold text-red-500 mt-1">{losers[0]?.symbol}<span className="text-sm font-normal ml-1">{losers[0]?.changePercent.toFixed(1)}%</span></p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground font-medium">Movers Tracked</p><p className="text-xl font-bold text-foreground mt-1">{movers.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground font-medium">Volume Alerts</p><p className="text-xl font-bold text-red-500 mt-1">{movers.filter((m) => m.volume > m.avgVolume * 1.5).length}</p></CardContent></Card>
      </div>
      <div>
        <CardHeader className="px-0 pt-0"><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Significant Movers</CardTitle></CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {movers.map((mover) => <MoverCard key={mover.symbol} mover={mover} />)}
        </div>
      </div>
    </div>
  );
}
