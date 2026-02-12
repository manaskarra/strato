'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  BarChart3, TrendingUp, DollarSign, Newspaper, Activity,
  PieChart, Hash, Sparkles,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  // Input
  'symbol-input': Hash,
  'stock-selection': PieChart,
  // Analysis
  'news-search': Newspaper,
  'technical-analysis': Activity,
  'fundamental-analysis': DollarSign,
  'live-chart': TrendingUp,
  'alto-analysis': Sparkles,
};

function AnalysisNodeComponent({ data }: NodeProps) {
  const Icon = iconMap[data.nodeType] || BarChart3;
  const color = data.color || '#3b82f6';

  return (
    <div
      className="px-4 py-3 rounded-xl bg-card border-2 hover:shadow-lg transition-all min-w-[140px]"
      style={{ borderColor: `${color}40` }}
    >
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !border-2 !border-card" style={{ backgroundColor: color }} />
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-semibold leading-tight text-foreground">
            {data.label}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {['symbol-input', 'stock-selection'].includes(data.nodeType) ? 'Input' : 'Analysis'}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !border-2 !border-card" style={{ backgroundColor: color }} />
    </div>
  );
}

export const AnalysisNode = memo(AnalysisNodeComponent);
