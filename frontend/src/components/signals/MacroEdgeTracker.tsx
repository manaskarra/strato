'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SkeletonCard, SkeletonDashboard } from '@/components/shared/SkeletonCard';
import { apiClient } from '@/lib/api-client';
import {
  Flame, Scissors, TrendingDown, Activity,
  RefreshCw, AlertTriangle, CheckCircle2, AlertCircle, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignalBreakdown {
  signal: string;
  value: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

interface ScoreData {
  score: number;
  breakdown: SignalBreakdown[];
}

interface PolymarketOdds {
  question: string;
  odds: number;
  source: string;
  slug?: string;
  market_id?: string;
  event_id?: string;
}

interface MacroEdgeData {
  scores: {
    inflation: ScoreData;
    fed_rate_cut: ScoreData;
    recession: ScoreData;
  };
  polymarket: {
    inflation: PolymarketOdds | null;
    fed_rate_cut: PolymarketOdds | null;
    recession: PolymarketOdds | null;
  };
  alto_analysis: string;
  timestamp: string;
  signal_metadata: {
    vix: number | null;
    bond_10y_yield: number | null;
    bond_2y_yield: number | null;
  };
}

const SCORE_LABELS: Record<string, { title: string; fallbackQuestion: string }> = {
  inflation: { title: 'Inflation', fallbackQuestion: 'Inflation above expectations?' },
  fed_rate_cut: { title: 'Fed Rate Cut', fallbackQuestion: 'Fed cuts rates at next meeting?' },
  recession: { title: 'Recession', fallbackQuestion: 'US recession by end of 2026?' },
};

function getScoreColor(score: number): string {
  if (score < 35) return 'text-emerald-500';
  if (score < 65) return 'text-amber-500';
  return 'text-red-500';
}

function getScoreLabel(score: number): string {
  if (score < 25) return 'Very Low';
  if (score < 40) return 'Low';
  if (score < 60) return 'Moderate';
  if (score < 75) return 'High';
  return 'Very High';
}

function getProgressColor(score: number): string {
  if (score < 35) return '[&>div]:bg-emerald-500';
  if (score < 65) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-red-500';
}

function ScoreGauge({
  title,
  icon: Icon,
  data,
}: {
  title: string;
  icon: React.ElementType;
  data: ScoreData;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Display */}
        <div className="flex items-end gap-2">
          <span className={cn('text-4xl font-bold tabular-nums', getScoreColor(data.score))}>
            {data.score}
          </span>
          <span className="text-sm text-muted-foreground mb-1">/100</span>
          <Badge
            variant="secondary"
            className={cn(
              'ml-auto text-xs',
              data.score < 35
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : data.score < 65
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
            )}
          >
            {getScoreLabel(data.score)}
          </Badge>
        </div>

        {/* Progress Bar */}
        <Progress value={data.score} className={cn('h-2', getProgressColor(data.score))} />

        {/* Signal Breakdown */}
        <div className="space-y-2 pt-1">
          {data.breakdown.map((item) => (
            <div key={item.signal} className="flex items-start gap-2 text-xs">
              {item.impact === 'positive' ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              ) : item.impact === 'negative' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{item.signal}</span>
                  <span className="font-mono font-medium text-foreground shrink-0">{item.value}</span>
                </div>
                <p className="text-muted-foreground/70 leading-snug">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PolymarketCard({
  scoreKey,
  polymarket,
  modelScore,
}: {
  scoreKey: string;
  polymarket: PolymarketOdds | null;
  modelScore: number;
}) {
  const label = SCORE_LABELS[scoreKey];
  const polymarketOdds = polymarket?.odds ?? null;
  const question = polymarket?.question ?? label.fallbackQuestion;
  const isLive = polymarket !== null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-foreground">{label.title}</h4>
            {isLive ? (
              <Badge variant="secondary" className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                LIVE
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px] bg-muted text-muted-foreground">
                N/A
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{question}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Polymarket</p>
            {polymarketOdds !== null ? (
              <p className="text-lg font-bold text-foreground">{polymarketOdds}%</p>
            ) : (
              <p className="text-lg font-bold text-muted-foreground/40">--</p>
            )}
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Our Model</p>
            <p className={cn('text-lg font-bold', getScoreColor(modelScore))}>{modelScore}%</p>
          </div>
        </div>

        {polymarketOdds !== null && (
          <div className="flex items-center justify-center">
            {(() => {
              const edge = modelScore - polymarketOdds;
              const edgeAbs = Math.abs(edge);
              return (
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs font-medium',
                    edgeAbs < 5
                      ? 'bg-muted text-muted-foreground'
                      : edge > 0
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {edgeAbs < 5
                    ? 'Aligned'
                    : edge > 0
                      ? `Model +${edgeAbs.toFixed(1)}pts higher`
                      : `Model ${edgeAbs.toFixed(1)}pts lower`}
                </Badge>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MacroEdgeTracker() {
  const [data, setData] = useState<MacroEdgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await apiClient.fetchMacroEdgeScores();
      setData(result);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch macro edge scores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  if (loading && !data) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-8 w-64 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse mt-2" />
          </div>
        </div>
        <SkeletonDashboard />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <Card className="border-destructive/50">
          <CardContent className="pt-6 flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
            <div>
              <h3 className="font-semibold text-foreground">Failed to load Macro Edge data</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">
            Macro Edge Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Institutional flow signals for Polymarket macro outcomes
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastUpdated}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-2">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Score Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ScoreGauge
          title="Inflation Pressure"
          icon={Flame}
          data={data.scores.inflation}
        />
        <ScoreGauge
          title="Fed Rate Cut Probability"
          icon={Scissors}
          data={data.scores.fed_rate_cut}
        />
        <ScoreGauge
          title="Recession Risk"
          icon={TrendingDown}
          data={data.scores.recession}
        />
      </div>

      {/* Polymarket Comparison */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Polymarket Edge Comparison
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(['inflation', 'fed_rate_cut', 'recession'] as const).map((key) => (
            <PolymarketCard
              key={key}
              scoreKey={key}
              polymarket={data.polymarket?.[key] ?? null}
              modelScore={data.scores[key].score}
            />
          ))}
        </div>
      </div>

      {/* Alto Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Activity className="w-4 h-4 text-primary" />
            Alto Macro Brief
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
            {data.alto_analysis}
          </p>
          {data.signal_metadata.vix !== null && (
            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
              <Badge variant="outline" className="text-xs">
                VIX: {data.signal_metadata.vix?.toFixed(1)}
              </Badge>
              {data.signal_metadata.bond_10y_yield !== null && (
                <Badge variant="outline" className="text-xs">
                  10Y: {data.signal_metadata.bond_10y_yield?.toFixed(2)}%
                </Badge>
              )}
              {data.signal_metadata.bond_2y_yield !== null && (
                <Badge variant="outline" className="text-xs">
                  2Y: {data.signal_metadata.bond_2y_yield?.toFixed(2)}%
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
