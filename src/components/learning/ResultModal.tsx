'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { NodeResult } from '@/lib/workflow-executor';
import { X, Sparkles } from 'lucide-react';

interface ResultModalProps {
  results: NodeResult[];
  onClose: () => void;
}

export function ResultModal({ results, onClose }: ResultModalProps) {
  const formatNodeType = (nodeType: string): string => {
    return nodeType
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Separate Alto from other results
  const altoResult = results.find(r => r.nodeType === 'alto-analysis');
  const otherResults = results.filter(r => r.nodeType !== 'alto-analysis');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
    >
      {/* Close button */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed top-6 right-6 z-10"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground bg-card/50 backdrop-blur"
        >
          <X className="w-5 h-5" />
        </Button>
      </motion.div>

      <div className="container mx-auto p-4 max-w-7xl min-h-screen flex flex-col justify-center">
        {/* Other results grid - BAM BAM BAM (SLOW & DRAMATIC) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
          {otherResults.map((result, index) => (
            <motion.div
              key={result.nodeId}
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{
                scale: 1,
                opacity: 1,
                rotate: 0,
                transition: {
                  delay: index * 0.8,
                  type: "spring",
                  damping: 15,
                  stiffness: 200,
                }
              }}
              className="bg-card border border-border rounded-lg p-3 shadow-lg max-h-[350px] overflow-y-auto"
            >
              <div className="mb-2">
                <h3 className="text-sm font-bold text-foreground">
                  {formatNodeType(result.nodeType)}
                </h3>
                <div className="h-0.5 w-8 bg-blue-500 rounded mt-1" />
              </div>
              <ResultContent nodeType={result.nodeType} data={result.data} isAlto={false} />
            </motion.div>
          ))}
        </div>

        {/* Alto MEGA reveal - Always last (EXTRA DRAMATIC) */}
        {altoResult && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotate: -20, y: 50 }}
            animate={{
              scale: 1,
              opacity: 1,
              rotate: 0,
              y: 0,
              transition: {
                delay: otherResults.length * 0.8 + 1.2,
                type: "spring",
                damping: 12,
                stiffness: 150,
                duration: 1.5,
              }
            }}
            className="relative"
          >
            {/* Glow effect */}
            <motion.div
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-blue-500/20 rounded-xl blur-xl"
            />

            <div className="relative bg-card border-2 border-blue-500 rounded-xl p-4 shadow-2xl shadow-blue-500/30 max-h-[400px] overflow-y-auto">
              <div className="flex items-center gap-3 mb-3 sticky top-0 bg-card z-10 pb-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-6 h-6 text-blue-500" />
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {formatNodeType(altoResult.nodeType)}
                  </h2>
                  <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded mt-1" />
                </div>
              </div>
              <ResultContent nodeType={altoResult.nodeType} data={altoResult.data} isAlto={true} />
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// Result content renderer (simplified versions)
function ResultContent({ nodeType, data, isAlto }: { nodeType: string; data: any; isAlto: boolean }) {
  switch (nodeType) {
    case 'news-search':
      return <NewsContent data={data} />;
    case 'technical-analysis':
      return <TechnicalContent data={data} />;
    case 'fundamental-analysis':
      return <FundamentalContent data={data} />;
    case 'sentiment-analysis':
      return <SentimentContent data={data} />;
    case 'alto-analysis':
      return <AltoContent data={data} />;
    default:
      return <pre className="text-sm">{JSON.stringify(data, null, 2)}</pre>;
  }
}

function NewsContent({ data }: { data: any[] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="text-xs text-muted-foreground">No news found</p>;
  }

  return (
    <div className="space-y-2">
      {data.slice(0, 4).map((article, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="border-l-2 border-blue-500 pl-2 py-1"
        >
          <h3 className="text-xs font-semibold text-foreground mb-0.5 line-clamp-2">{article.title}</h3>
          <p className="text-[10px] text-muted-foreground">
            {new Date(article.date).toLocaleDateString()}
          </p>
        </motion.div>
      ))}
      {data.length > 4 && (
        <p className="text-[10px] text-muted-foreground text-center">+ {data.length - 4} more</p>
      )}
    </div>
  );
}

function TechnicalContent({ data }: { data: any }) {
  const metrics = [
    { label: 'RSI (14)', value: data.rsi?.[0]?.rsi?.toFixed(2), color: 'text-blue-500' },
    { label: 'MACD', value: data.macd?.[0]?.macd?.toFixed(2), color: 'text-purple-500' },
    { label: 'SMA (50)', value: `$${data.sma?.[0]?.sma?.toFixed(2)}`, color: 'text-emerald-500' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {metrics.map((metric, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.15 }}
          className="text-center p-2 bg-muted/50 rounded-md"
        >
          <p className="text-[10px] text-muted-foreground mb-1">{metric.label}</p>
          <p className={`text-lg font-bold ${metric.color} break-all leading-tight`}>{metric.value || 'N/A'}</p>
        </motion.div>
      ))}
    </div>
  );
}

function FundamentalContent({ data }: { data: any }) {
  const metrics = [
    { label: 'P/E Ratio', value: data.peRatio?.toFixed(2), color: 'text-blue-500' },
    { label: 'Profit Margin', value: `${((data.profitMargin || 0) * 100).toFixed(2)}%`, color: 'text-emerald-500' },
    { label: 'ROE', value: `${((data.roe || 0) * 100).toFixed(2)}%`, color: 'text-purple-500' },
    { label: 'Market Cap', value: `$${(data.marketCap / 1e9).toFixed(2)}B`, color: 'text-orange-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {metrics.map((metric, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="p-2 bg-muted/50 rounded-md"
        >
          <p className="text-[10px] text-muted-foreground mb-1">{metric.label}</p>
          <p className={`text-xl font-bold ${metric.color} break-all leading-tight`}>{metric.value || 'N/A'}</p>
        </motion.div>
      ))}
    </div>
  );
}

function SentimentContent({ data }: { data: any }) {
  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'text-emerald-500';
    if (score < -0.3) return 'text-red-500';
    return 'text-yellow-500';
  };

  const getSentimentLabel = (score: number) => {
    if (score > 0.5) return 'Very Positive';
    if (score > 0.2) return 'Positive';
    if (score > -0.2) return 'Neutral';
    if (score > -0.5) return 'Negative';
    return 'Very Negative';
  };

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 15 }}
        className="mb-4"
      >
        <p className="text-[10px] text-muted-foreground mb-2">Latest Sentiment</p>
        <p className={`text-4xl font-bold ${getSentimentColor(data.latest?.normalized || 0)} leading-tight`}>
          {(data.latest?.normalized || 0).toFixed(2)}
        </p>
        <p className={`text-sm font-semibold mt-2 ${getSentimentColor(data.latest?.normalized || 0)}`}>
          {getSentimentLabel(data.latest?.normalized || 0)}
        </p>
      </motion.div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="p-2 bg-muted/50 rounded-md">
          <p className="text-[10px] text-muted-foreground">30-Day Avg</p>
          <p className="text-sm font-bold text-foreground">{data.average?.toFixed(2)}</p>
        </div>
        <div className="p-2 bg-muted/50 rounded-md">
          <p className="text-[10px] text-muted-foreground">Articles</p>
          <p className="text-sm font-bold text-foreground">{data.totalArticles}</p>
        </div>
      </div>
    </div>
  );
}

function AltoContent({ data }: { data: any }) {
  if (!data || !data.analysis) {
    return <p className="text-xs text-muted-foreground">No analysis available</p>;
  }

  const formatAnalysis = (text: string) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-blue-400">$1</strong>')
      .replace(/^- (.+)$/gm, '<li class="mb-1">$1</li>')
      .split('\n\n')
      .map(para => {
        if (para.includes('<li>')) {
          return `<ul class="list-disc pl-4 space-y-1 text-sm">${para}</ul>`;
        }
        return `<p class="text-sm leading-relaxed mb-2">${para}</p>`;
      })
      .join('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="prose prose-invert max-w-none"
    >
      <div
        className="text-foreground [&>p]:mb-2 [&>ul]:mb-2 [&>strong]:font-bold [&>strong]:text-blue-400"
        dangerouslySetInnerHTML={{ __html: formatAnalysis(data.analysis) }}
      />
      {data.tokensUsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 pt-2 border-t border-border text-center"
        >
          <p className="text-[10px] text-muted-foreground">
            {data.model} • {data.tokensUsed} tokens
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
