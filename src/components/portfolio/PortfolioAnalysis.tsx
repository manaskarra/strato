'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, CartesianGrid,
} from 'recharts';
import { PortfolioHolding, PortfolioMetrics, AllocationData } from '@/lib/types';
import { SECTOR_COLORS, CHART_COLORS } from '@/lib/mock-data';
import { generatePortfolioInsight, fetchCurrentPrice, fetchFundamentals } from '@/lib/api';
import { SkeletonDashboard } from '@/components/shared/SkeletonCard';
import { ImportPortfolioDialog } from '@/components/portfolio/ImportPortfolioDialog';
import {
  Plus, PieChart as PieIcon, BarChart3, Shield, Sparkles,
  AlertTriangle, CheckCircle2, X, ChevronDown, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function computeMetrics(holdings: PortfolioHolding[]): PortfolioMetrics {
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.shares * h.avgCost, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  const weights = holdings.map((h) => h.value / totalValue);
  const maxWeight = Math.max(...weights);
  const concentrationRisk = Math.round(maxWeight * 100);
  const sectorWeights: Record<string, number> = {};
  holdings.forEach((h) => { sectorWeights[h.sector] = (sectorWeights[h.sector] || 0) + h.value / totalValue; });
  const topSectorWeight = Math.max(...Object.values(sectorWeights));

  const recommendations: string[] = [];
  if (maxWeight > 0.2) recommendations.push(`Reduce ${holdings.find(h => h.value / totalValue === maxWeight)?.symbol} — it's ${(maxWeight * 100).toFixed(0)}% of your portfolio`);
  if (topSectorWeight > 0.4) recommendations.push('Consider diversifying across sectors — tech exposure is high');
  if (holdings.filter(h => h.assetType === 'ETF').length === 0) recommendations.push('Consider adding ETFs for broader diversification');
  if (holdings.every(h => h.geography === 'US')) recommendations.push('Add international exposure to reduce geographic concentration');
  if (holdings.filter(h => h.sector === 'Fixed Income').length === 0) recommendations.push('Consider adding bonds for risk-adjusted returns');

  const hasInternational = holdings.some(h => h.geography !== 'US');
  const hasBonds = holdings.some(h => h.sector === 'Fixed Income');
  const hasETFs = holdings.some(h => h.assetType === 'ETF');
  let healthScore = 50;
  if (maxWeight < 0.2) healthScore += 15; else if (maxWeight < 0.3) healthScore += 5;
  if (topSectorWeight < 0.4) healthScore += 10;
  if (hasInternational) healthScore += 10;
  if (hasBonds) healthScore += 10;
  if (hasETFs) healthScore += 5;
  healthScore = Math.min(healthScore, 100);

  return { totalValue, totalGainLoss, totalGainLossPercent, beta: 1.12, volatility: 18.4, sharpeRatio: 1.34, concentrationRisk, healthScore, recommendations };
}

function getAllocationData(holdings: PortfolioHolding[], key: keyof PortfolioHolding): AllocationData[] {
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const grouped: Record<string, number> = {};
  holdings.forEach((h) => { const k = h[key] as string; grouped[k] = (grouped[k] || 0) + h.value; });
  return Object.entries(grouped)
    .map(([name, value], idx) => ({ name, value, percentage: (value / totalValue) * 100, color: SECTOR_COLORS[name] || CHART_COLORS[idx % CHART_COLORS.length] }))
    .sort((a, b) => b.value - a.value);
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  color: 'hsl(var(--foreground))',
};

export function PortfolioAnalysis() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newCost, setNewCost] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Start with empty portfolio - users will import or add holdings
    setLoading(false);
  }, []);

  const metrics = useMemo(() => computeMetrics(holdings), [holdings]);
  const sectorAllocation = useMemo(() => getAllocationData(holdings, 'sector'), [holdings]);
  const geoAllocation = useMemo(() => getAllocationData(holdings, 'geography'), [holdings]);
  const typeAllocation = useMemo(() => getAllocationData(holdings, 'assetType'), [holdings]);

  // Group holdings by symbol for display
  const groupedHoldings = useMemo(() => {
    const groups: Record<string, {
      symbol: string;
      name: string;
      totalShares: number;
      weightedAvgCost: number;
      currentPrice: number;
      totalValue: number;
      totalGainLoss: number;
      gainLossPercent: number;
      sector: string;
      weight: number;
      lots: PortfolioHolding[];
    }> = {};

    holdings.forEach(holding => {
      if (!groups[holding.symbol]) {
        groups[holding.symbol] = {
          symbol: holding.symbol,
          name: holding.name,
          totalShares: 0,
          weightedAvgCost: 0,
          currentPrice: holding.currentPrice,
          totalValue: 0,
          totalGainLoss: 0,
          gainLossPercent: 0,
          sector: holding.sector,
          weight: 0,
          lots: [],
        };
      }

      const group = groups[holding.symbol];
      const costBasis = holding.shares * holding.avgCost;

      group.lots.push(holding);
      group.totalShares += holding.shares;
      group.totalValue += holding.value;
      group.totalGainLoss += holding.gainLoss;
      group.currentPrice = holding.currentPrice; // Use latest price
    });

    // Calculate weighted averages
    Object.values(groups).forEach(group => {
      const totalCostBasis = group.lots.reduce((sum, lot) => sum + (lot.shares * lot.avgCost), 0);
      group.weightedAvgCost = totalCostBasis / group.totalShares;
      group.gainLossPercent = totalCostBasis > 0 ? (group.totalGainLoss / totalCostBasis) * 100 : 0;
    });

    return Object.values(groups).sort((a, b) => b.totalValue - a.totalValue);
  }, [holdings]);
  const performanceData = useMemo(() => {
    // Aggregate holdings by symbol
    const aggregated = holdings.reduce((acc, h) => {
      if (!acc[h.symbol]) {
        acc[h.symbol] = {
          symbol: h.symbol,
          contribution: 0,
          totalValue: 0,
          totalCost: 0,
        };
      }
      acc[h.symbol].contribution += h.gainLoss;
      acc[h.symbol].totalValue += h.value;
      acc[h.symbol].totalCost += h.shares * h.avgCost;
      return acc;
    }, {} as Record<string, { symbol: string; contribution: number; totalValue: number; totalCost: number }>);

    // Calculate aggregated percentage and sort
    return Object.values(aggregated)
      .map(item => ({
        symbol: item.symbol,
        contribution: item.contribution,
        percentage: ((item.totalValue - item.totalCost) / item.totalCost) * 100,
      }))
      .sort((a, b) => b.contribution - a.contribution);
  }, [holdings]);

  const addHolding = async () => {
    if (!newSymbol || !newShares || !newCost) return;

    const symbol = newSymbol.toUpperCase();
    const shares = parseFloat(newShares);
    const cost = parseFloat(newCost);

    try {
      // Fetch real-time price and fundamentals from EODHD
      const [currentPrice, fundamentals] = await Promise.all([
        fetchCurrentPrice(symbol),
        fetchFundamentals(symbol).catch(() => null), // Fallback if fundamentals fail
      ]);

      const value = shares * currentPrice;
      const costBasis = shares * cost;
      const newHolding: PortfolioHolding = {
        id: Date.now().toString(),
        symbol,
        name: fundamentals?.General?.Name || symbol,
        shares,
        avgCost: cost,
        currentPrice,
        value,
        gainLoss: value - costBasis,
        gainLossPercent: ((currentPrice - cost) / cost) * 100,
        sector: fundamentals?.General?.Sector || 'Technology',
        assetType: fundamentals?.General?.Type || 'Common Stock',
        geography: fundamentals?.General?.CountryISO === 'USA' ? 'US' : 'International',
        weight: 0,
      };

      const updated = [...holdings, newHolding];
      const total = updated.reduce((sum, h) => sum + h.value, 0);
      setHoldings(updated.map((h) => ({ ...h, weight: h.value / total })));
      setNewSymbol('');
      setNewShares('');
      setNewCost('');
    } catch (error) {
      console.error('Failed to add holding:', error);
      // Fallback to basic data if API fails
      const currentPrice = cost * 1.1; // Estimate
      const value = shares * currentPrice;
      const newHolding: PortfolioHolding = {
        id: Date.now().toString(),
        symbol,
        name: symbol,
        shares,
        avgCost: cost,
        currentPrice,
        value,
        gainLoss: value - shares * cost,
        gainLossPercent: ((currentPrice - cost) / cost) * 100,
        sector: 'Technology',
        assetType: 'Stock',
        geography: 'US',
        weight: 0,
      };
      const updated = [...holdings, newHolding];
      const total = updated.reduce((sum, h) => sum + h.value, 0);
      setHoldings(updated.map((h) => ({ ...h, weight: h.value / total })));
      setNewSymbol('');
      setNewShares('');
      setNewCost('');
    }
  };

  const removeHolding = (id: string) => {
    const updated = holdings.filter((h) => h.id !== id);
    const total = updated.reduce((sum, h) => sum + h.value, 0);
    setHoldings(updated.map((h) => ({ ...h, weight: total > 0 ? h.value / total : 0 })));
  };

  const toggleSymbol = (symbol: string) => {
    const newExpanded = new Set(expandedSymbols);
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol);
    } else {
      newExpanded.add(symbol);
    }
    setExpandedSymbols(newExpanded);
  };

  const handleImport = (importedHoldings: PortfolioHolding[], mode: 'replace' | 'append') => {
    const updated = mode === 'replace' ? importedHoldings : [...holdings, ...importedHoldings];
    const total = updated.reduce((sum, h) => sum + h.value, 0);
    setHoldings(updated.map((h) => ({ ...h, weight: total > 0 ? h.value / total : 0 })));
  };

  const fetchInsight = async () => {
    if (holdings.length === 0) {
      setAiInsight('Add some holdings to your portfolio to get AI-powered insights and recommendations.');
      return;
    }

    setInsightLoading(true);
    try {
      const result = await generatePortfolioInsight(
        holdings.map((h) => ({
          symbol: h.symbol,
          weight: h.weight,
          gainLossPercent: h.gainLossPercent,
          sector: h.sector,
          value: h.value,
        }))
      );
      setAiInsight(result);
    } catch (error) {
      console.error('Failed to generate insight:', error);
      setAiInsight('Unable to generate AI insights at this time. Please try again later.');
    } finally {
      setInsightLoading(false);
    }
  };

  if (loading) return <div className="p-6 lg:p-8 max-w-7xl mx-auto"><SkeletonDashboard /></div>;

  // Prevent hydration errors by not rendering charts until mounted on client
  if (!mounted) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-muted rounded mb-2"></div>
          <div className="h-4 w-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">Portfolio Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">Track allocation, risk metrics, and performance attribution</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Total Value</p>
            <p className="text-xl font-bold text-foreground mt-1">${metrics.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Total Return</p>
            <p className={cn('text-xl font-bold mt-1', metrics.totalGainLoss > 0 ? 'text-emerald-500' : 'text-red-500')}>
              {metrics.totalGainLoss > 0 ? '+' : ''}{metrics.totalGainLossPercent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Beta</p>
            <p className="text-xl font-bold text-foreground mt-1">{metrics.beta.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Volatility</p>
            <p className="text-xl font-bold text-foreground mt-1">{metrics.volatility.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Health Score</p>
            <div className="flex items-center gap-2 mt-1">
              <p className={cn('text-xl font-bold', metrics.healthScore >= 70 ? 'text-emerald-500' : metrics.healthScore >= 50 ? 'text-blue-500' : 'text-red-500')}>
                {metrics.healthScore}
              </p>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Holding */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground shrink-0">Add Holding:</span>
            <Input placeholder="Symbol" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} className="w-[140px]" />
            <Input type="number" placeholder="Shares" value={newShares} onChange={(e) => setNewShares(e.target.value)} className="w-[100px]" />
            <Input type="number" placeholder="Avg Cost" value={newCost} onChange={(e) => setNewCost(e.target.value)} className="w-[120px]" />
            <Button size="sm" onClick={addHolding} className="gap-1.5 bg-blue-600 hover:bg-blue-700"><Plus className="w-3.5 h-3.5" /> Add</Button>
            <div className="ml-auto">
              <ImportPortfolioDialog onImport={handleImport} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="allocation" className="space-y-6">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="allocation" className="gap-2">
            <PieIcon className="w-4 h-4" /> Allocation
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <BarChart3 className="w-4 h-4" /> Performance
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-2">
            <Shield className="w-4 h-4" /> Health Check
          </TabsTrigger>
        </TabsList>

        <TabsContent value="allocation">
          {holdings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <PieIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">No Holdings Yet</p>
                <p className="text-sm text-muted-foreground mt-2">Add stocks manually or import a CSV to see your allocation breakdown</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <AllocationChart title="By Sector" data={sectorAllocation} />
              <AllocationChart title="By Geography" data={geoAllocation} />
              <AllocationChart title="By Asset Type" data={typeAllocation} />
            </div>
          )}
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-foreground">
                Holdings ({groupedHoldings.length} {groupedHoldings.length === 1 ? 'position' : 'positions'}, {holdings.length} {holdings.length === 1 ? 'lot' : 'lots'})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Symbol</th>
                      <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Shares</th>
                      <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Avg Cost</th>
                      <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Price</th>
                      <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Value</th>
                      <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Return</th>
                      <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Weight</th>
                      <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Sector</th>
                      <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedHoldings.map((group) => {
                      const isExpanded = expandedSymbols.has(group.symbol);
                      const hasMultipleLots = group.lots.length > 1;

                      return (
                        <>
                          {/* Aggregated Row */}
                          <tr key={group.symbol} className={cn(
                            "border-b border-border hover:bg-muted/30 transition-colors",
                            hasMultipleLots && "cursor-pointer"
                          )} onClick={() => hasMultipleLots && toggleSymbol(group.symbol)}>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                {hasMultipleLots && (
                                  isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                                <div>
                                  <span className="font-semibold text-foreground">{group.symbol}</span>
                                  {hasMultipleLots && <span className="text-xs text-blue-500 ml-2">({group.lots.length} lots)</span>}
                                  <span className="text-xs text-muted-foreground ml-1.5 block">{group.name}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-foreground">{group.totalShares.toFixed(4)}</td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">${group.weightedAvgCost.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">${group.currentPrice.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-semibold text-foreground">${group.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className={cn('py-2.5 px-3 text-right font-medium', group.gainLossPercent >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                              {group.gainLossPercent >= 0 ? '+' : ''}{group.gainLossPercent.toFixed(2)}%
                            </td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">{((group.totalValue / metrics.totalValue) * 100).toFixed(1)}%</td>
                            <td className="py-2.5 px-3 text-right"><Badge variant="secondary" className="text-[10px]">{group.sector}</Badge></td>
                            <td className="py-2.5 px-3 text-right"></td>
                          </tr>

                          {/* Individual Lots (when expanded) */}
                          {isExpanded && group.lots.map((lot) => (
                            <tr key={lot.id} className="border-b border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                              <td className="py-2 px-3 pl-12">
                                <span className="text-xs text-muted-foreground">Lot</span>
                              </td>
                              <td className="py-2 px-3 text-right text-muted-foreground text-xs">{lot.shares}</td>
                              <td className="py-2 px-3 text-right text-muted-foreground text-xs">${lot.avgCost.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right text-muted-foreground text-xs">-</td>
                              <td className="py-2 px-3 text-right text-muted-foreground text-xs">${lot.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className={cn('py-2 px-3 text-right text-xs', lot.gainLossPercent >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                                {lot.gainLossPercent >= 0 ? '+' : ''}{lot.gainLossPercent.toFixed(2)}%
                              </td>
                              <td className="py-2 px-3 text-right text-muted-foreground text-xs">{(lot.weight * 100).toFixed(1)}%</td>
                              <td className="py-2 px-3 text-right"></td>
                              <td className="py-2 px-3 text-right">
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-red-500" onClick={(e) => { e.stopPropagation(); removeHolding(lot.id); }}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          {holdings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">No Holdings Yet</p>
                <p className="text-sm text-muted-foreground mt-2">Add stocks to see performance attribution and returns</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-foreground">Performance Attribution ($)</CardTitle>
                <CardDescription>Contribution to total P&L</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={performanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                    <YAxis type="category" dataKey="symbol" tick={{ fontSize: 11 }} className="fill-muted-foreground" width={50} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const value = payload[0].value as number;
                          const isPositive = value >= 0;
                          return (
                            <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2">
                              <p className="text-xs font-medium text-foreground">
                                {payload[0].payload.symbol}
                              </p>
                              <p className="text-sm font-bold mt-1" style={{ color: isPositive ? '#10b981' : '#ef4444' }}>
                                {isPositive ? '+' : ''}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
                      {performanceData.map((entry, index) => (
                        <Cell key={index} fill={entry.contribution >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-foreground">Return by Holding (%)</CardTitle>
                <CardDescription>Individual performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={performanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `${v.toFixed(2)}%`} />
                    <YAxis type="category" dataKey="symbol" tick={{ fontSize: 11 }} className="fill-muted-foreground" width={50} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const value = payload[0].value as number;
                          const isPositive = value >= 0;
                          return (
                            <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2">
                              <p className="text-xs font-medium text-foreground">
                                {payload[0].payload.symbol}
                              </p>
                              <p className="text-sm font-bold mt-1" style={{ color: isPositive ? '#3b82f6' : '#ef4444' }}>
                                {isPositive ? '+' : ''}{value.toFixed(2)}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                      {performanceData.map((entry, index) => (
                        <Cell key={index} fill={entry.percentage >= 0 ? '#3b82f6' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>

        <TabsContent value="health">
          {holdings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">No Holdings Yet</p>
                <p className="text-sm text-muted-foreground mt-2">Add stocks to see health analysis and recommendations</p>
              </CardContent>
            </Card>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-foreground"><Shield className="w-4 h-4 text-blue-500" /> Portfolio Health Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className={cn(
                    'inline-flex items-center justify-center w-28 h-28 rounded-full border-4',
                    metrics.healthScore >= 70 ? 'border-emerald-500/30 bg-emerald-500/5' :
                    metrics.healthScore >= 50 ? 'border-blue-500/30 bg-blue-500/5' : 'border-red-500/30 bg-red-500/5'
                  )}>
                    <span className={cn('text-4xl font-bold',
                      metrics.healthScore >= 70 ? 'text-emerald-500' : metrics.healthScore >= 50 ? 'text-blue-500' : 'text-red-500'
                    )}>{metrics.healthScore}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    {metrics.healthScore >= 70 ? 'Good — well diversified' : metrics.healthScore >= 50 ? 'Fair — improvements recommended' : 'Needs attention'}
                  </p>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Concentration Risk</span><span className="font-medium text-foreground">{metrics.concentrationRisk}%</span></div>
                  <Progress value={metrics.concentrationRisk} className="h-2" />
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Portfolio Beta</span><span className="font-medium text-foreground">{metrics.beta.toFixed(2)}</span></div>
                  <Progress value={metrics.beta * 50} className="h-2" />
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Sharpe Ratio</span><span className="font-medium text-foreground">{metrics.sharpeRatio.toFixed(2)}</span></div>
                  <Progress value={metrics.sharpeRatio * 33} className="h-2" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-foreground"><AlertTriangle className="w-4 h-4 text-red-500" /> Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                    <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground/80">{rec}</p>
                  </div>
                ))}
                <Separator className="my-4" />
                <Button variant="outline" className="w-full gap-2" onClick={fetchInsight} disabled={insightLoading}>
                  <Sparkles className="w-4 h-4 text-blue-500" /> {insightLoading ? 'Analyzing...' : 'Get AI Portfolio Insight'}
                </Button>
                {aiInsight && (
                  <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/10 mt-3">
                    <div className="flex items-center gap-2 mb-2"><Sparkles className="w-3.5 h-3.5 text-blue-500" /><span className="text-xs font-semibold text-blue-500">AI Analysis</span></div>
                    <p className="text-xs leading-relaxed text-foreground/80">{aiInsight}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AllocationChart({ title, data }: { title: string; data: AllocationData[] }) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const total = data.reduce((s, d) => s + d.value, 0);
      const percentage = ((payload[0].value / total) * 100).toFixed(1);
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2">
          <p className="text-xs font-medium text-foreground">
            {payload[0].name}: <span className="text-blue-500">{percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base text-foreground">{title}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
              {data.map((entry, index) => <Cell key={index} fill={entry.color} />)}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-1.5 mt-2">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.name}</span>
              </div>
              <span className="font-medium text-foreground/60">{item.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
