'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { SkeletonCard, SkeletonRow } from '@/components/shared/SkeletonCard';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import {
  LayoutDashboard, Store, Fish, Signal,
  Search, ArrowUpRight, ArrowDownRight, Trophy,
  AlertTriangle, Users,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Mock Data ──────────────────────────────────────────────

const mockDashboardStats = {
  activeMarkets: 847,
  activeSignals: 23,
  trackedWhales: 156,
  winRate: 68.4,
};

const mockVolumeData = [
  { hour: '00:00', volume: 1200000 },
  { hour: '04:00', volume: 850000 },
  { hour: '08:00', volume: 2100000 },
  { hour: '12:00', volume: 3400000 },
  { hour: '16:00', volume: 2800000 },
  { hour: '20:00', volume: 1900000 },
  { hour: '24:00', volume: 1500000 },
];

const mockScoreData = [
  { date: 'Mon', score: 72 },
  { date: 'Tue', score: 68 },
  { date: 'Wed', score: 81 },
  { date: 'Thu', score: 75 },
  { date: 'Fri', score: 89 },
  { date: 'Sat', score: 84 },
  { date: 'Sun', score: 77 },
];

const mockSignals = [
  { id: 1, market: 'Will Bitcoin reach $100K by March 2026?', direction: 'BUY' as const, entry: 0.42, current: 0.51, tp: 0.65, sl: 0.30, pnl: 21.4, confidence: 82, status: 'active' as const },
  { id: 2, market: 'US Fed rate cut in Q1 2026?', direction: 'SELL' as const, entry: 0.68, current: 0.55, tp: 0.40, sl: 0.80, pnl: 19.1, confidence: 74, status: 'active' as const },
  { id: 3, market: 'Tesla deliveries exceed 600K in Q1?', direction: 'BUY' as const, entry: 0.35, current: 0.48, tp: 0.60, sl: 0.25, pnl: 37.1, confidence: 71, status: 'tp_hit' as const },
  { id: 4, market: 'SpaceX Starship launch before April?', direction: 'BUY' as const, entry: 0.72, current: 0.65, tp: 0.85, sl: 0.55, pnl: -9.7, confidence: 65, status: 'active' as const },
  { id: 5, market: 'Apple AR glasses announcement Q1?', direction: 'SELL' as const, entry: 0.45, current: 0.52, tp: 0.30, sl: 0.60, pnl: -15.6, confidence: 58, status: 'sl_hit' as const },
];

const mockMarkets = [
  { id: 1, question: 'Will Bitcoin reach $100K by March 2026?', yesPrice: 0.51, noPrice: 0.49, volume24h: 4200000, liquidity: 12500000, score: 89, category: 'Crypto' },
  { id: 2, question: 'US Fed rate cut in Q1 2026?', yesPrice: 0.55, noPrice: 0.45, volume24h: 3100000, liquidity: 9800000, score: 84, category: 'Economics' },
  { id: 3, question: 'Tesla deliveries exceed 600K in Q1?', yesPrice: 0.48, noPrice: 0.52, volume24h: 2800000, liquidity: 7200000, score: 78, category: 'Business' },
  { id: 4, question: 'SpaceX Starship launch before April?', yesPrice: 0.65, noPrice: 0.35, volume24h: 1900000, liquidity: 5400000, score: 75, category: 'Science' },
  { id: 5, question: 'Apple AR glasses announcement Q1?', yesPrice: 0.22, noPrice: 0.78, volume24h: 1500000, liquidity: 4100000, score: 71, category: 'Tech' },
  { id: 6, question: 'NBA: Lakers win championship?', yesPrice: 0.12, noPrice: 0.88, volume24h: 980000, liquidity: 3200000, score: 65, category: 'Sports' },
  { id: 7, question: 'Ethereum surpasses $5K by June?', yesPrice: 0.38, noPrice: 0.62, volume24h: 2100000, liquidity: 6800000, score: 82, category: 'Crypto' },
  { id: 8, question: 'Will OpenAI IPO in 2026?', yesPrice: 0.31, noPrice: 0.69, volume24h: 1200000, liquidity: 3900000, score: 68, category: 'Tech' },
];

const mockWhales = [
  { wallet: '0x1a2b...3c4d', volume: 2400000, positions: 18, winRate: 72.4, pnl: 145000, alerts: [{ type: 'New Position' as const, market: 'Bitcoin $100K', amount: 50000, time: '2h ago' }] },
  { wallet: '0x5e6f...7g8h', volume: 1800000, positions: 12, winRate: 81.2, pnl: 210000, alerts: [{ type: 'Size Increase' as const, market: 'Fed rate cut', amount: 75000, time: '4h ago' }] },
  { wallet: '0x9i0j...1k2l', volume: 3100000, positions: 24, winRate: 65.8, pnl: -42000, alerts: [{ type: 'Exit' as const, market: 'Tesla deliveries', amount: 30000, time: '6h ago' }] },
  { wallet: '0x3m4n...5o6p', volume: 1200000, positions: 8, winRate: 87.5, pnl: 98000, alerts: [{ type: 'New Position' as const, market: 'Ethereum $5K', amount: 120000, time: '1h ago' }] },
  { wallet: '0x7q8r...9s0t', volume: 950000, positions: 15, winRate: 53.3, pnl: -18000, alerts: [{ type: 'Size Decrease' as const, market: 'OpenAI IPO', amount: 25000, time: '8h ago' }] },
];

// ── Dashboard Tab ──────────────────────────────────────────

function DashboardTab() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  if (loading) return <div className="space-y-4"><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <SkeletonCard key={i} lines={1} />)}</div><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><SkeletonCard lines={5} /><SkeletonCard lines={5} /></div></div>;

  const stats = [
    { label: 'Active Markets', value: mockDashboardStats.activeMarkets.toLocaleString(), icon: Store, color: 'text-blue-500' },
    { label: 'Active Signals', value: mockDashboardStats.activeSignals, icon: Signal, color: 'text-emerald-500' },
    { label: 'Tracked Whales', value: mockDashboardStats.trackedWhales, icon: Fish, color: 'text-purple-500' },
    { label: 'Win Rate', value: `${mockDashboardStats.winRate}%`, icon: Trophy, color: 'text-yellow-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                <stat.icon className={cn('w-4 h-4', stat.color)} />
              </div>
              <p className="text-xl font-bold text-foreground mt-2">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">Market Volume (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={mockVolumeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
                <RechartsTooltip
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Volume']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">Composite Scores (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={mockScoreData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }}
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="score" stroke="#8b5cf6" fill="url(#scoreGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Signal className="w-4 h-4 text-emerald-500" /> Recent Active Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockSignals.filter(s => s.status === 'active').slice(0, 3).map((signal) => (
              <div key={signal.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge className={cn('shrink-0 border-0', signal.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500')}>
                    {signal.direction}
                  </Badge>
                  <p className="text-sm text-foreground truncate">{signal.market}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Entry / Current</p>
                    <p className="text-xs font-medium text-foreground">${signal.entry.toFixed(2)} / ${signal.current.toFixed(2)}</p>
                  </div>
                  <p className={cn('text-sm font-bold', signal.pnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                    {signal.pnl >= 0 ? '+' : ''}{signal.pnl.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Markets Tab ────────────────────────────────────────────

function MarketsTab() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('score');
  useEffect(() => { const t = setTimeout(() => setLoading(false), 500); return () => clearTimeout(t); }, []);

  if (loading) return <div className="space-y-4">{[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}</div>;

  const filtered = mockMarkets
    .filter(m => m.question.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'volume') return b.volume24h - a.volume24h;
      if (sortBy === 'liquidity') return b.liquidity - a.liquidity;
      return b.yesPrice - a.yesPrice;
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search markets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {['score', 'volume', 'liquidity', 'price'].map((s) => (
            <Button key={s} variant={sortBy === s ? 'default' : 'outline'} size="sm" className="text-xs capitalize" onClick={() => setSortBy(s)}>
              {s === 'price' ? 'Yes Price' : s}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Market</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Yes</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">No</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">24h Vol</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Liquidity</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Score</th>
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Category</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((market) => (
                  <tr key={market.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 max-w-[300px]"><p className="text-sm text-foreground truncate">{market.question}</p></td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-500">${market.yesPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-medium text-red-500">${market.noPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">${(market.volume24h / 1_000_000).toFixed(1)}M</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">${(market.liquidity / 1_000_000).toFixed(1)}M</td>
                    <td className="py-3 px-4 text-right">
                      <Badge className={cn('border-0', market.score >= 80 ? 'bg-emerald-500/20 text-emerald-500' : market.score >= 60 ? 'bg-blue-500/20 text-blue-500' : 'bg-muted text-muted-foreground')}>
                        {market.score}
                      </Badge>
                    </td>
                    <td className="py-3 px-4"><Badge variant="secondary" className="text-[10px]">{market.category}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Whales Tab ─────────────────────────────────────────────

function WhalesTab() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 550); return () => clearTimeout(t); }, []);

  if (loading) return <div className="space-y-4">{[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}</div>;

  const alertTypeConfig: Record<string, { color: string }> = {
    'New Position': { color: 'bg-emerald-500/20 text-emerald-500' },
    'Size Increase': { color: 'bg-blue-500/20 text-blue-500' },
    'Size Decrease': { color: 'bg-yellow-500/20 text-yellow-500' },
    'Exit': { color: 'bg-red-500/20 text-red-500' },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" /> Recent Whale Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockWhales.flatMap(w => w.alerts.map((a, i) => ({ ...a, wallet: w.wallet, key: `${w.wallet}-${i}` }))).map((alert) => (
              <div key={alert.key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <Badge className={cn('border-0 shrink-0', alertTypeConfig[alert.type]?.color)}>{alert.type}</Badge>
                  <div>
                    <p className="text-sm text-foreground">{alert.market}</p>
                    <p className="text-xs text-muted-foreground">{alert.wallet}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">${(alert.amount / 1000).toFixed(0)}K</p>
                  <p className="text-[10px] text-muted-foreground">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" /> Tracked Wallets
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Wallet</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Volume</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Positions</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Win Rate</th>
                  <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">PnL</th>
                </tr>
              </thead>
              <tbody>
                {mockWhales.map((whale) => (
                  <tr key={whale.wallet} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-foreground">{whale.wallet}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">${(whale.volume / 1_000_000).toFixed(1)}M</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{whale.positions}</td>
                    <td className={cn('py-3 px-4 text-right font-medium', whale.winRate >= 65 ? 'text-emerald-500' : whale.winRate >= 50 ? 'text-blue-500' : 'text-red-500')}>
                      {whale.winRate.toFixed(1)}%
                    </td>
                    <td className={cn('py-3 px-4 text-right font-bold', whale.pnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                      {whale.pnl >= 0 ? '+' : ''}${(whale.pnl / 1000).toFixed(0)}K
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Signals Tab ────────────────────────────────────────────

function SignalsTab() {
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  useEffect(() => { const t = setTimeout(() => setLoading(false), 500); return () => clearTimeout(t); }, []);

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <SkeletonCard key={i} lines={4} />)}</div>;

  const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: 'Active', color: 'bg-blue-500/20 text-blue-500' },
    tp_hit: { label: 'TP Hit', color: 'bg-emerald-500/20 text-emerald-500' },
    sl_hit: { label: 'SL Hit', color: 'bg-red-500/20 text-red-500' },
    expired: { label: 'Expired', color: 'bg-muted text-muted-foreground' },
  };

  const filtered = statusFilter === 'all' ? mockSignals : mockSignals.filter(s => s.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {['all', 'active', 'tp_hit', 'sl_hit'].map((s) => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" className="text-xs capitalize" onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All' : s === 'tp_hit' ? 'TP Hit' : s === 'sl_hit' ? 'SL Hit' : s}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((signal) => (
          <Card key={signal.id} className="hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className={cn('border-0', signal.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500')}>
                    {signal.direction === 'BUY' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {signal.direction}
                  </Badge>
                  <Badge className={cn('border-0', statusConfig[signal.status]?.color)}>
                    {statusConfig[signal.status]?.label}
                  </Badge>
                </div>
                <p className={cn('text-lg font-bold', signal.pnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                  {signal.pnl >= 0 ? '+' : ''}{signal.pnl.toFixed(1)}%
                </p>
              </div>

              <p className="text-sm font-medium text-foreground mb-4">{signal.market}</p>

              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Entry</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">${signal.entry.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Current</p>
                  <p className={cn('text-sm font-semibold mt-0.5', signal.current >= signal.entry ? 'text-emerald-500' : 'text-red-500')}>${signal.current.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-emerald-500/60 uppercase">TP</p>
                  <p className="text-sm font-semibold text-emerald-500 mt-0.5">${signal.tp.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-red-500/60 uppercase">SL</p>
                  <p className="text-sm font-semibold text-red-500 mt-0.5">${signal.sl.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">Confidence</span>
                  <span className="text-xs font-medium text-foreground">{signal.confidence}%</span>
                </div>
                <Progress value={signal.confidence} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────

export function Polymarket() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="p-6 lg:p-8 lg:px-12 xl:px-16 space-y-6 w-full">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">Polymarket Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">Prediction market signals, whale tracking & market analysis</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="dashboard" className="gap-2"><LayoutDashboard className="w-4 h-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="markets" className="gap-2"><Store className="w-4 h-4" /> Markets</TabsTrigger>
          <TabsTrigger value="whales" className="gap-2"><Fish className="w-4 h-4" /> Whales</TabsTrigger>
          <TabsTrigger value="signals" className="gap-2"><Signal className="w-4 h-4" /> Signals</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><DashboardTab key={`dash-${refreshKey}`} /></TabsContent>
        <TabsContent value="markets"><MarketsTab key={`markets-${refreshKey}`} /></TabsContent>
        <TabsContent value="whales"><WhalesTab key={`whales-${refreshKey}`} /></TabsContent>
        <TabsContent value="signals"><SignalsTab key={`signals-${refreshKey}`} /></TabsContent>
      </Tabs>
    </div>
  );
}
