'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  BarChart3, TrendingUp, DollarSign, Newspaper, Activity,
  PieChart, Hash, Sparkles, Smile,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  // Input
  'symbol-input': Hash,
  'stock-selection': PieChart,
  // Analysis
  'news-search': Newspaper,
  'technical-analysis': Activity,
  'fundamental-analysis': DollarSign,
  'sentiment-analysis': Smile,
  'live-chart': TrendingUp,
  'alto-analysis': Sparkles,
};

function AnalysisNodeComponent({ data }: NodeProps) {
  const Icon = iconMap[data.nodeType] || BarChart3;
  const color = data.color || '#3b82f6';
  const status = data.status || 'idle';

  // Status-based styling
  const getStatusStyles = () => {
    switch (status) {
      case 'loading':
        return {
          border: 'border-2 border-blue-500 shadow-lg shadow-blue-500/50',
          animation: 'animate-pulse',
        };
      case 'success':
        return {
          border: 'border-2 border-emerald-500 shadow-md shadow-emerald-500/30',
          animation: '',
        };
      case 'error':
        return {
          border: 'border-2 border-red-500 shadow-md shadow-red-500/30',
          animation: '',
        };
      default:
        return {
          border: 'border',
          animation: '',
        };
    }
  };

  const statusStyles = getStatusStyles();

  return (
    <div
      className={`px-2.5 py-1.5 rounded-md bg-card hover:shadow-lg transition-all min-w-[100px] ${statusStyles.border} ${statusStyles.animation}`}
      style={{ borderColor: status === 'idle' ? `${color}40` : undefined }}
    >
      <Handle type="target" position={Position.Left} className="!w-1.5 !h-1.5 !border !border-card" style={{ backgroundColor: color }} />
      <div className="flex items-center gap-1.5">
        <div
          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${status === 'loading' ? 'animate-spin' : ''}`}
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon className="w-3 h-3" />
        </div>
        <div>
          <p className="text-[10px] font-semibold leading-tight text-foreground">
            {data.label}
          </p>
          <p className="text-[8px] text-muted-foreground mt-0.5">
            {status === 'loading' ? 'Processing...' : ['symbol-input', 'stock-selection'].includes(data.nodeType) ? 'Input' : 'Analysis'}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-1.5 !h-1.5 !border !border-card" style={{ backgroundColor: color }} />
    </div>
  );
}

export const AnalysisNode = memo(AnalysisNodeComponent);
