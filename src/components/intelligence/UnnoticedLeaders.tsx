'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockUnnoticedLeaders } from '@/lib/mock-data';
import { UnnoticedLeader } from '@/lib/types';
import { SkeletonRow } from '@/components/shared/SkeletonCard';
import { Eye, Signal } from 'lucide-react';
import { cn } from '@/lib/utils';

export function UnnoticedLeaders() {
  const [leaders, setLeaders] = useState<UnnoticedLeader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const t = setTimeout(() => { setLeaders(mockUnnoticedLeaders); setLoading(false); }, 600); return () => clearTimeout(t); }, []);

  if (loading) return <div className="space-y-4">{[1,2,3,4,5].map((i) => <SkeletonRow key={i} />)}</div>;

  return (
    <div className="space-y-6">
      <Card className="bg-blue-500/5 border-blue-500/20 dark:border-blue-500/10">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5"><Eye className="w-4 h-4 text-blue-500" /></div>
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">What are Unnoticed Leaders?</p>
              <p className="text-xs text-blue-600/70 dark:text-blue-300/60 mt-0.5 leading-relaxed">
                Stocks outperforming their sector by 10%+ but flying under the radar with low media coverage.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {leaders.map((leader, idx) => (
          <Card key={leader.symbol} className="hover:shadow-md dark:hover:shadow-blue-500/5 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white text-xs font-bold shrink-0">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="font-bold text-foreground">{leader.symbol}</span><Badge variant="secondary" className="text-[10px]">{leader.sector}</Badge></div>
                  <p className="text-xs text-muted-foreground truncate">{leader.name}</p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center"><p className="text-[10px] text-muted-foreground">Performance</p><p className="text-sm font-semibold text-emerald-500">+{leader.changePercent.toFixed(1)}%</p></div>
                  <div className="text-center"><p className="text-[10px] text-muted-foreground">Outperformance</p><p className="text-sm font-semibold text-primary">+{leader.outperformance.toFixed(1)}%</p></div>
                  <div className="text-center"><p className="text-[10px] text-muted-foreground">Media Score</p>
                    <div className="flex items-center gap-1"><Signal className={cn('w-3 h-3', leader.mediaScore < 20 ? 'text-emerald-500' : 'text-red-500')} />
                      <p className={cn('text-sm font-semibold', leader.mediaScore < 20 ? 'text-emerald-500' : 'text-red-500')}>{leader.mediaScore}/100</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground shrink-0 w-16">Sector avg</span>
                <div className="flex-1 relative h-5 bg-muted rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-muted-foreground/20 rounded-full" style={{ width: `${Math.min(leader.sectorPerformance * 3, 100)}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{ width: `${Math.min(leader.changePercent * 3, 100)}%` }} />
                  <div className="absolute inset-0 flex items-center px-2"><span className="text-[10px] text-white font-medium drop-shadow">+{leader.changePercent.toFixed(1)}% vs sector +{leader.sectorPerformance.toFixed(1)}%</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
