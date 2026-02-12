'use client';

import { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Node, Edge, Controls, Background,
  useNodesState, useEdgesState, addEdge, Connection,
  ReactFlowProvider, ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AnalysisNode } from './AnalysisNode';
import { TemplateGallery } from './TemplateGallery';
import { TutorialPanel } from './TutorialPanel';
import { WorkflowResults } from './WorkflowResults';
import { workflowTemplates } from '@/lib/mock-data';
import { generateTutorial } from '@/lib/api';
import { TutorialContent } from '@/lib/types';
import { executeWorkflow, NodeResult } from '@/lib/workflow-executor';
import { Input } from '@/components/ui/input';
import {
  GraduationCap, Save, FolderOpen, Trash2, Sparkles,
  BarChart3, TrendingUp, DollarSign, Newspaper, Activity,
  PieChart, GitCompare, Hash, CandlestickChart, Play,
} from 'lucide-react';

const nodeCategories = [
  {
    label: 'Input', color: '#3b82f6',
    nodes: [
      { type: 'symbol-input', label: 'Stock Symbol', icon: Hash, description: 'Enter a stock ticker' },
      { type: 'stock-selection', label: 'Stock Selection', icon: PieChart, description: 'Select from your watchlist' },
    ],
  },
  {
    label: 'Analysis', color: '#ec4899',
    nodes: [
      { type: 'news-search', label: 'News Search', icon: Newspaper, description: 'Fetch market & company news' },
      { type: 'technical-analysis', label: 'Technical Analysis', icon: Activity, description: 'RSI, MACD, moving averages' },
      { type: 'fundamental-analysis', label: 'Fundamental Analysis', icon: DollarSign, description: 'P/E, revenue, margins' },
      { type: 'live-chart', label: 'Live Chart', icon: TrendingUp, description: 'Real-time price charts' },
      { type: 'alto-analysis', label: 'Ask Alto', icon: Sparkles, description: 'AI-powered analysis' },
    ],
  },
];

const nodeTypes = { custom: AnalysisNode };

function LearningLabInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorial, setTutorial] = useState<TutorialContent | null>(null);
  const [tutorialLoading, setTutorialLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [savedWorkflows, setSavedWorkflows] = useState<{ name: string; nodes: Node[]; edges: Edge[] }[]>([]);
  const [workflowResults, setWorkflowResults] = useState<Map<string, NodeResult> | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [executionSymbol, setExecutionSymbol] = useState('AAPL');
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow/type');
      const label = event.dataTransfer.getData('application/reactflow/label');
      const color = event.dataTransfer.getData('application/reactflow/color');

      if (!type || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: `${type}-${Date.now()}`,
        type: 'custom',
        position,
        data: { label, nodeType: type, color },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string, color: string) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.setData('application/reactflow/color', color);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleLearn = async () => {
    if (nodes.length < 2) return;
    setTutorialLoading(true);
    setShowTutorial(true);
    const nodeLabels = nodes.map((n) => n.data.label);
    const connections = edges.map((e) => {
      const s = nodes.find((n) => n.id === e.source);
      const t = nodes.find((n) => n.id === e.target);
      return `${s?.data.label} → ${t?.data.label}`;
    });
    try {
      const result = await generateTutorial(nodeLabels, connections);
      setTutorial(JSON.parse(result));
    } catch {
      setTutorial({
        title: `Understanding Your ${nodeLabels[0]} Analysis Workflow`,
        sections: [
          { heading: 'What You Built', content: `You've created an analysis workflow connecting ${nodeLabels.join(', ')}. This combination lets you analyze a stock from multiple angles.` },
          { heading: 'Why These Connections Matter', content: `Each node represents a different lens. By connecting ${nodeLabels[0]} to ${nodeLabels[1] || 'other indicators'}, you build a multi-factor analysis that reduces single-signal risk.` },
          { heading: 'Real-World Example', content: `Imagine analyzing NVDA: Start with the symbol, check RSI for overbought conditions. If RSI > 70 but MACD shows bearish crossover, that's a warning. But if volume supports the trend, it may be strong momentum.` },
        ],
        quiz: [
          { id: '1', question: 'What does RSI above 70 indicate?', options: ['Stock is cheap', 'May be overbought', 'High volume', 'Growing revenue'], correctAnswer: 1, explanation: 'RSI above 70 traditionally suggests overbought conditions.' },
          { id: '2', question: 'Why connect multiple analysis nodes?', options: ['Looks professional', 'Confirmation improves accuracy', 'Better charts', 'Required by regulation'], correctAnswer: 1, explanation: 'No single indicator is 100% reliable. Multiple signals provide confirmation.' },
          { id: '3', question: 'What is a "golden cross"?', options: ['New all-time high', '50-day MA crosses above 200-day MA', 'Volume doubles', 'P/E equals 1'], correctAnswer: 1, explanation: 'A golden cross is when the 50-day MA crosses above the 200-day MA — a bullish signal.' },
        ],
      });
    } finally { setTutorialLoading(false); }
  };

  const loadTemplate = (templateId: string) => {
    const template = workflowTemplates.find((t) => t.id === templateId);
    if (!template) return;
    setNodes(template.nodes.map((n) => ({ ...n, type: 'custom' })));
    setEdges(template.edges.map((e) => ({ ...e, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } })));
    setShowTemplates(false);
  };

  const handleRun = async () => {
    if (nodes.length === 0) return;

    setIsExecuting(true);
    setShowRunDialog(false);

    try {
      const result = await executeWorkflow(nodes, edges, {
        symbol: executionSymbol,
        exchange: 'US',
      });

      setWorkflowResults(result.results);
      setShowResults(true);
    } catch (error) {
      console.error('Workflow execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* Left Sidebar — Node Palette */}
      <div className="w-[280px] border-r border-border bg-card/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-border bg-card/80 backdrop-blur">
          <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
            <GraduationCap className="w-5 h-5 text-blue-500" />
            Learning Lab
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1.5">Drag nodes to the canvas and connect them</p>
        </div>

        <div className="px-3 py-2 bg-muted/30 border-b border-border">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tools</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {nodeCategories.map((cat) => (
              <div key={cat.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: cat.color }}>
                  {cat.label}
                </p>
                <div className="space-y-1.5">
                  {cat.nodes.map((node) => {
                    const Icon = node.icon;
                    return (
                      <div
                        key={node.type}
                        className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/50 cursor-grab hover:border-opacity-100 hover:shadow-md hover:scale-[1.02] transition-all bg-card active:cursor-grabbing active:scale-95"
                        draggable
                        onDragStart={(e) => onDragStart(e, node.type, node.label, cat.color)}
                        style={{ borderColor: `${cat.color}30` }}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{node.label}</p>
                          <p className="text-[10px] text-muted-foreground/80 truncate leading-tight mt-0.5">{node.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border space-y-2">
          <Button
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setShowRunDialog(true)}
            disabled={nodes.length === 0 || isExecuting}
          >
            <Play className="w-4 h-4" /> {isExecuting ? 'Running...' : 'Run Workflow'}
          </Button>
          <Button
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={handleLearn}
            disabled={nodes.length < 2 || tutorialLoading}
          >
            <Sparkles className="w-4 h-4" /> {tutorialLoading ? 'Generating...' : 'Learn'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => setShowTemplates(true)}>
              <FolderOpen className="w-3 h-3" /> Templates
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => setSavedWorkflows([...savedWorkflows, { name: `Workflow ${savedWorkflows.length + 1}`, nodes, edges }])} disabled={nodes.length === 0}>
              <Save className="w-3 h-3" /> Save
            </Button>
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setNodes([]); setEdges([]); }}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect} onInit={setReactFlowInstance} onDrop={onDrop} onDragOver={onDragOver}
          nodeTypes={nodeTypes} fitView
          className="bg-background"
        >
          <Controls className="bg-card border border-border rounded-lg shadow-sm [&>button]:bg-transparent [&>button]:text-muted-foreground [&>button]:border-border [&>button:hover]:bg-muted" />
          <Background gap={20} size={1} className="!stroke-border/30" />
        </ReactFlow>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center p-8 bg-card/90 backdrop-blur rounded-xl border border-dashed border-border max-w-md pointer-events-auto">
              <GraduationCap className="w-10 h-10 text-blue-500/50 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground">Build Your Analysis Workflow</h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Drag nodes from the left sidebar onto this canvas. Connect them to build your analysis pipeline, then click <strong className="text-blue-500">Learn</strong> to get a personalized tutorial.
              </p>
              <Button variant="outline" className="mt-4 gap-2" onClick={() => setShowTemplates(true)}>
                <FolderOpen className="w-4 h-4" /> Start with a Template
              </Button>
            </div>
          </div>
        )}
      </div>

      {showTutorial && <TutorialPanel tutorial={tutorial} loading={tutorialLoading} onClose={() => { setShowTutorial(false); setTutorial(null); }} />}

      {showResults && workflowResults && (
        <WorkflowResults results={workflowResults} onClose={() => setShowResults(false)} />
      )}

      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Starter Templates</DialogTitle>
            <DialogDescription>Choose a pre-built workflow to get started quickly</DialogDescription>
          </DialogHeader>
          <TemplateGallery templates={workflowTemplates} onSelect={loadTemplate} />
        </DialogContent>
      </Dialog>

      <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Run Workflow</DialogTitle>
            <DialogDescription>Enter a stock symbol to analyze</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Stock Symbol</label>
              <Input
                placeholder="e.g., AAPL, TSLA, NVDA"
                value={executionSymbol}
                onChange={(e) => setExecutionSymbol(e.target.value.toUpperCase())}
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Enter a US stock ticker symbol
              </p>
            </div>
            <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={handleRun}>
              <Play className="w-4 h-4" /> Execute Workflow
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function LearningLab() {
  return <ReactFlowProvider><LearningLabInner /></ReactFlowProvider>;
}
