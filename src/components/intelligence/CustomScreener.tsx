'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScreenerResult } from '@/lib/types';
import { SlidersHorizontal, Plus, X, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Filter {
  id: string;
  metric: string;
  operator: string;
  value: string;
}

const metricOptions = [
  { value: 'market_capitalization', label: 'Market Cap ($B)' },
  { value: 'pe_ratio', label: 'P/E Ratio' },
  { value: 'volume', label: 'Volume' },
  { value: 'change_percent', label: 'Change %' },
  { value: 'dividend_yield', label: 'Dividend Yield %' },
  { value: 'beta', label: 'Beta' },
];

const operatorOptions = [
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'gte', label: '>=' },
  { value: 'lte', label: '<=' },
];

const mockScreenerResults: ScreenerResult[] = [
  { symbol: 'AAPL', name: 'Apple Inc', price: 182.52, changePercent: 1.2, marketCap: 2850, pe: 28.5, volume: 54_000_000, sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corp', price: 404.87, changePercent: 0.8, marketCap: 3010, pe: 35.2, volume: 22_000_000, sector: 'Technology' },
  { symbol: 'GOOG', name: 'Alphabet Inc', price: 141.80, changePercent: -0.3, marketCap: 1780, pe: 24.1, volume: 18_000_000, sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com', price: 178.25, changePercent: 2.1, marketCap: 1850, pe: 62.4, volume: 42_000_000, sector: 'Consumer Cyclical' },
  { symbol: 'META', name: 'Meta Platforms', price: 474.32, changePercent: 4.8, marketCap: 1215, pe: 24.8, volume: 24_000_000, sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla Inc', price: 191.97, changePercent: -2.4, marketCap: 610, pe: 48.2, volume: 98_000_000, sector: 'Consumer Cyclical' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', price: 408.23, changePercent: 0.5, marketCap: 880, pe: 10.2, volume: 3_200_000, sector: 'Financial Services' },
  { symbol: 'UNH', name: 'UnitedHealth Group', price: 527.84, changePercent: -1.1, marketCap: 488, pe: 21.6, volume: 3_800_000, sector: 'Healthcare' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', price: 156.74, changePercent: 0.3, marketCap: 378, pe: 10.8, volume: 7_200_000, sector: 'Healthcare' },
  { symbol: 'V', name: 'Visa Inc', price: 278.92, changePercent: 1.5, marketCap: 572, pe: 30.1, volume: 6_100_000, sector: 'Financial Services' },
];

export function CustomScreener() {
  const [filters, setFilters] = useState<Filter[]>([
    { id: '1', metric: 'market_capitalization', operator: 'gt', value: '100' },
  ]);
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const addFilter = () => {
    setFilters([...filters, { id: Date.now().toString(), metric: 'pe_ratio', operator: 'lt', value: '' }]);
  };
  const removeFilter = (id: string) => setFilters(filters.filter((f) => f.id !== id));
  const updateFilter = (id: string, field: keyof Filter, value: string) => {
    setFilters(filters.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const runScreener = () => {
    setLoading(true);
    setHasSearched(true);
    setTimeout(() => { setResults(mockScreenerResults); setLoading(false); }, 1000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <SlidersHorizontal className="w-4 h-4 text-blue-500" />
            Build Your Screen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filters.map((filter) => (
            <div key={filter.id} className="flex items-center gap-2">
              <Select value={filter.metric} onValueChange={(v) => updateFilter(filter.id, 'metric', v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {metricOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filter.operator} onValueChange={(v) => updateFilter(filter.id, 'operator', v)}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operatorOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number" placeholder="Value" value={filter.value}
                onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                className="w-[120px]"
              />

              {filters.length > 1 && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => removeFilter(filter.id)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={addFilter} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Filter
            </Button>
            <Button size="sm" onClick={runScreener} disabled={loading} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
              <Search className="w-3.5 h-3.5" /> {loading ? 'Screening...' : 'Run Screener'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasSearched && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">
              Results {!loading && <span className="text-muted-foreground font-normal">({results.length} matches)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-muted rounded-lg animate-shimmer" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Symbol</th>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Name</th>
                      <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Price</th>
                      <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Change</th>
                      <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Mkt Cap ($B)</th>
                      <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">P/E</th>
                      <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Volume</th>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Sector</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.symbol} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-foreground">{r.symbol}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{r.name}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-foreground">${r.price.toFixed(2)}</td>
                        <td className={cn('py-2.5 px-3 text-right font-medium', r.changePercent > 0 ? 'text-emerald-500' : r.changePercent < 0 ? 'text-red-500' : 'text-muted-foreground')}>
                          <span className="inline-flex items-center gap-0.5">
                            {r.changePercent > 0 ? <TrendingUp className="w-3 h-3" /> : r.changePercent < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                            {r.changePercent > 0 ? '+' : ''}{r.changePercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{r.marketCap.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{r.pe.toFixed(1)}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{(r.volume / 1_000_000).toFixed(1)}M</td>
                        <td className="py-2.5 px-3">
                          <Badge variant="secondary" className="text-[10px]">{r.sector}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
