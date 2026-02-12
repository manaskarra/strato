'use client';

import { motion } from 'framer-motion';
import { Bot, Sparkles, PieChart, TrendingUp, BarChart3, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface WelcomeScreenProps {
  onSuggestedQuestion: (question: string) => void;
}

const SUGGESTED_QUESTIONS = [
  {
    icon: PieChart,
    title: 'Analyze My Portfolio',
    question: 'How does my portfolio look? Any concentration risks?',
    color: 'from-purple-600 to-purple-400',
  },
  {
    icon: TrendingUp,
    title: 'Stock Analysis',
    question: 'What do the technicals say about AAPL?',
    color: 'from-green-600 to-green-400',
  },
  {
    icon: BarChart3,
    title: 'Market Summary',
    question: 'What happened in the markets today?',
    color: 'from-blue-600 to-blue-400',
  },
  {
    icon: GraduationCap,
    title: 'Learn Concepts',
    question: 'Explain what RSI means and how to use it',
    color: 'from-orange-600 to-orange-400',
  },
];

export function WelcomeScreen({ onSuggestedQuestion }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <Sparkles className="w-6 h-6 text-blue-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Ask Alto
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your AI financial co-pilot. Get intelligent insights about stocks, portfolios, and
              markets backed by real-time EODHD data.
            </p>
          </div>
        </div>

        {/* Suggested Questions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SUGGESTED_QUESTIONS.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * (index + 1) }}
            >
              <Card
                className="group cursor-pointer hover:shadow-lg hover:border-blue-500/50 transition-all"
                onClick={() => onSuggestedQuestion(item.question)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
                    >
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h3 className="text-sm font-semibold text-foreground">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.question}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Knowledge Base */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-center text-muted-foreground uppercase tracking-wider">
            What Alto Knows
          </h3>
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Market Data</h4>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• Technical Indicators (RSI, MACD, Bollinger Bands, Stochastic, ATR, Moving Averages)</li>
                    <li>• Real-time & Intraday Price Data</li>
                    <li>• Stock Splits & Dividends</li>
                    <li>• Peer Comparison & Stock Screening</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Fundamentals</h4>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• Financial Statements (Income, Balance Sheet, Cash Flow)</li>
                    <li>• Earnings Calendar & EPS Estimates</li>
                    <li>• Insider Transactions (SEC Form 4)</li>
                    <li>• Institutional Ownership</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Multi-Asset Coverage</h4>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• Stocks & ETFs (60+ exchanges)</li>
                    <li>• Cryptocurrencies (2,600+ pairs)</li>
                    <li>• Forex (1,100+ currency pairs)</li>
                    <li>• Government Bonds (US, UK, Germany, Japan, France)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Economic Data</h4>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• Economic Calendar (GDP, CPI, Employment, Fed Meetings)</li>
                    <li>• News & Sentiment Analysis</li>
                    <li>• Exchange Trading Hours & Holidays</li>
                    <li>• Global Market Coverage</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
