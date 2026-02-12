'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MorningBrief } from './MorningBrief';
import { UnnoticedLeaders } from './UnnoticedLeaders';
import { CorrelationAlerts } from './CorrelationAlerts';
import { CustomScreener } from './CustomScreener';
import { Newspaper, Eye, GitBranch, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function IntelligenceHub() {
  const [refreshKey, setRefreshKey] = useState(0);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">Daily Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">{today} &middot; Your AI-powered morning market brief</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="brief" className="space-y-6">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="brief" className="gap-2"><Newspaper className="w-4 h-4" /> Morning Brief</TabsTrigger>
          <TabsTrigger value="leaders" className="gap-2"><Eye className="w-4 h-4" /> Unnoticed Leaders</TabsTrigger>
          <TabsTrigger value="correlation" className="gap-2"><GitBranch className="w-4 h-4" /> Correlations</TabsTrigger>
          <TabsTrigger value="screener" className="gap-2"><SlidersHorizontal className="w-4 h-4" /> Screener</TabsTrigger>
        </TabsList>
        <TabsContent value="brief"><MorningBrief key={`brief-${refreshKey}`} /></TabsContent>
        <TabsContent value="leaders"><UnnoticedLeaders key={`leaders-${refreshKey}`} /></TabsContent>
        <TabsContent value="correlation"><CorrelationAlerts key={`corr-${refreshKey}`} /></TabsContent>
        <TabsContent value="screener"><CustomScreener key={`screen-${refreshKey}`} /></TabsContent>
      </Tabs>
    </div>
  );
}
