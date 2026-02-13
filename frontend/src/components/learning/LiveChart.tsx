'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface LiveChartProps {
  data: any[];
  symbol?: string;
  exchange?: string;
  onTimeframeChange?: (timeframe: string) => void;
  initialTimeframe?: string;
}

type Timeframe = '5m' | '15m' | '1h' | '1d';

const timeframeLabels: Record<Timeframe, string> = {
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '1d': '1D',
};

function LiveChart({ data: initialData, symbol, exchange = 'US', onTimeframeChange, initialTimeframe = '1d' }: LiveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(initialTimeframe as Timeframe);
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState(initialData);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!seriesRef.current || !chartData || chartData.length === 0) return;

    try {
      const formattedData = chartData.map((item) => ({
        time: item.datetime,
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
      }));

      seriesRef.current.setData(formattedData);

      // Fit content to viewport
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (error) {
      console.error('Error setting chart data:', error);
    }
  }, [chartData]);

  const handleTimeframeChange = async (timeframe: Timeframe) => {
    if (!symbol) {
      console.warn('Cannot change timeframe: symbol not provided');
      return;
    }

    setSelectedTimeframe(timeframe);
    setIsLoading(true);

    try {
      // Map timeframe to period and interval
      let period = 'month';
      let interval = '5m';

      switch (timeframe) {
        case '5m':
          period = 'intraday';
          interval = '5m';
          break;
        case '15m':
          period = 'intraday';
          interval = '15m';
          break;
        case '1h':
          period = 'intraday';
          interval = '1h';
          break;
        case '1d':
          period = 'month';
          interval = '1d';
          break;
      }

      // Fetch new data
      const { apiClient } = await import('@/lib/api-client');
      const newData = await apiClient.fetchChartData(symbol, exchange, period, interval);

      // Handle both array response and object response
      const dataArray = Array.isArray(newData) ? newData : newData?.data || [];
      setChartData(dataArray);

      if (onTimeframeChange) {
        onTimeframeChange(timeframe);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Timeframe selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {(Object.keys(timeframeLabels) as Timeframe[]).map((tf) => (
            <Button
              key={tf}
              size="sm"
              variant={selectedTimeframe === tf ? 'default' : 'ghost'}
              className={`h-7 px-3 text-xs font-medium transition-all ${
                selectedTimeframe === tf
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              onClick={() => handleTimeframeChange(tf)}
            >
              {timeframeLabels[tf]}
            </Button>
          ))}
        </div>
        {symbol && (
          <div className="text-xs font-semibold text-muted-foreground">
            {symbol}
          </div>
        )}
      </div>

      {/* Chart container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0.5 : 1 }}
        transition={{ duration: 0.2 }}
        className="relative"
      >
        <div
          ref={chartContainerRef}
          className="w-full rounded-lg border border-border bg-card/50 overflow-hidden"
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        )}
      </motion.div>

      {/* Chart stats */}
      {chartData && chartData.length > 0 && (
        <div className="grid grid-cols-5 gap-2 text-xs">
          <div className="text-center p-2 bg-muted/30 rounded">
            <div className="text-muted-foreground mb-1">Open</div>
            <div className="font-semibold text-foreground">${chartData[chartData.length - 1]?.open?.toFixed(2)}</div>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded">
            <div className="text-muted-foreground mb-1">High</div>
            <div className="font-semibold text-emerald-500">${chartData[chartData.length - 1]?.high?.toFixed(2)}</div>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded">
            <div className="text-muted-foreground mb-1">Low</div>
            <div className="font-semibold text-red-500">${chartData[chartData.length - 1]?.low?.toFixed(2)}</div>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded">
            <div className="text-muted-foreground mb-1">Close</div>
            <div className="font-semibold text-foreground">${chartData[chartData.length - 1]?.close?.toFixed(2)}</div>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded">
            <div className="text-muted-foreground mb-1">Volume</div>
            <div className="font-semibold text-blue-500">{((chartData[chartData.length - 1]?.volume || 0) / 1e6).toFixed(2)}M</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveChart;
export { LiveChart };
