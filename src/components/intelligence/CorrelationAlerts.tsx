'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockCorrelationAlerts } from '@/lib/mock-data';
import { CorrelationAlert } from '@/lib/types';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { AlertTriangle, ArrowRight, GitBranch, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function CorrelationCard({ alert }: { alert: CorrelationAlert }) {
  const [expanded, setExpanded] = useState(false);
  const severity = alert.decorrelationPercent > 100 ? 'high' : alert.decorrelationPercent > 50 ? 'medium' : 'low';

  return (
    <Card className={cn('hover:shadow-md transition-all', severity === 'high' && 'border-red-500/20', severity === 'medium' && 'border-blue-500/20')}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', severity === 'high' ? 'bg-red-500/10' : severity === 'medium' ? 'bg-blue-500/10' : 'bg-muted')}>
              <GitBranch className={cn('w-5 h-5', severity === 'high' ? 'text-red-500' : severity === 'medium' ? 'text-blue-500' : 'text-muted-foreground')} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground">{alert.asset1}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="font-semibold text-sm text-foreground">{alert.asset2}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{alert.timeframe} rolling window</p>
            </div>
          </div>
          <Badge className={cn('shrink-0 border-0', severity === 'high' ? 'bg-red-500/20 text-red-500' : severity === 'medium' ? 'bg-blue-500/20 text-blue-500' : 'bg-muted text-muted-foreground')}>
            <AlertTriangle className="w-3 h-3 mr-1" />{severity === 'high' ? 'Critical' : severity === 'medium' ? 'Warning' : 'Watch'}
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Historical</p><p className="text-lg font-bold text-foreground mt-1">{alert.historicalCorrelation.toFixed(2)}</p></div>
          <div className="text-center"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current</p><p className={cn('text-lg font-bold mt-1', severity === 'high' ? 'text-red-500' : severity === 'medium' ? 'text-blue-500' : 'text-foreground')}>{alert.currentCorrelation.toFixed(2)}</p></div>
          <div className="text-center"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Deviation</p><p className={cn('text-lg font-bold mt-1', severity === 'high' ? 'text-red-500' : severity === 'medium' ? 'text-blue-500' : 'text-foreground')}>{alert.decorrelationPercent.toFixed(0)}%</p></div>
        </div>
        <Button variant="ghost" size="sm" className="w-full mt-3 text-xs gap-1.5 h-7 text-muted-foreground" onClick={() => setExpanded(!expanded)}>
          <Sparkles className="w-3 h-3 text-primary" />{expanded ? 'Hide Analysis' : 'AI Analysis'}{expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
        {expanded && alert.explanation && <div className="mt-2 p-3 bg-primary/5 rounded-lg border border-primary/10"><p className="text-xs leading-relaxed text-foreground/80">{alert.explanation}</p></div>}
      </CardContent>
    </Card>
  );
}

export function CorrelationAlerts() {
  const [alerts, setAlerts] = useState<CorrelationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => { setAlerts(mockCorrelationAlerts); setLoading(false); }, 700); return () => clearTimeout(t); }, []);

  if (loading) return <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[1,2,3].map((i) => <SkeletonCard key={i} lines={4} />)}</div>;

  return (
    <div className="space-y-6">
      <Card className="bg-purple-500/5 border-purple-500/20 dark:border-purple-500/10">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5"><GitBranch className="w-4 h-4 text-purple-500" /></div>
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Correlation Breakdown Detection</p>
              <p className="text-xs text-purple-600/70 dark:text-purple-300/60 mt-0.5 leading-relaxed">Alerts when historically correlated assets suddenly diverge — signals regime changes or hedging opportunities.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{alerts.map((alert, idx) => <CorrelationCard key={idx} alert={alert} />)}</div>
    </div>
  );
}
