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
import { Switch } from '@/components/ui/switch';
import { AnalysisNode } from './AnalysisNode';
import { TutorialPanel } from './TutorialPanel';
import { ResultModal } from './ResultModal';
import { generateTutorial } from '@/lib/api';
import { TutorialContent } from '@/lib/types';
import { executeWorkflow, NodeResult } from '@/lib/workflow-executor';
import { Input } from '@/components/ui/input';
import {
  GraduationCap, Save, Trash2, Sparkles,
  BarChart3, TrendingUp, DollarSign, Newspaper, Activity,
  GitCompare, Hash, CandlestickChart, Play, Smile, Link,
} from 'lucide-react';

const nodeCategories = [
  {
    label: 'Analysis', color: '#ec4899',
    nodes: [
      { type: 'news-search', label: 'News Search', icon: Newspaper, description: 'Fetch market & company news' },
      { type: 'technical-analysis', label: 'Technical Analysis', icon: Activity, description: 'RSI, MACD, EMA, Bollinger, ATR' },
      { type: 'fundamental-analysis', label: 'Fundamental Analysis', icon: DollarSign, description: 'P/E, revenue, margins' },
      { type: 'sentiment-analysis', label: 'Sentiment Analysis', icon: Smile, description: 'News & social sentiment' },
      { type: 'live-chart', label: 'Live Chart', icon: TrendingUp, description: 'Real-time price charts' },
    ],
  },
];

// Default nodes that appear on canvas
const defaultNodes: Node[] = [
  {
    id: 'symbol-input-default',
    type: 'custom',
    position: { x: 100, y: 250 },
    data: { label: 'Stock Symbol', nodeType: 'symbol-input', color: '#3b82f6' },
  },
  {
    id: 'alto-analysis-default',
    type: 'custom',
    position: { x: 700, y: 250 },
    data: { label: 'Ask Alto', nodeType: 'alto-analysis', color: '#ec4899' },
  },
];

const nodeTypes = { custom: AnalysisNode };

function LearningLabInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorial, setTutorial] = useState<TutorialContent | null>(null);
  const [tutorialLoading, setTutorialLoading] = useState(false);
  const [savedWorkflows, setSavedWorkflows] = useState<{ name: string; nodes: Node[]; edges: Edge[] }[]>([]);
  const [workflowResults, setWorkflowResults] = useState<NodeResult[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [executionSymbol, setExecutionSymbol] = useState('AAPL');
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [autoJoinEnabled, setAutoJoinEnabled] = useState(true);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        // Remove any existing outgoing edge from source node
        const filteredEdges = eds.filter(
          (e) => e.source !== params.source && e.target !== params.target
        );

        // Add the new edge with larger interaction width
        return addEdge({
          ...params,
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          interactionWidth: 30,
        }, filteredEdges);
      });
    },
    [setEdges]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();

      // Prevent deletion of default nodes (Stock Symbol and Ask Alto)
      const defaultNodeIds = ['symbol-input-default', 'alto-analysis-default'];
      if (defaultNodeIds.includes(node.id)) {
        return;
      }

      // Delete the node and its connected edges
      setNodes((nds) => nds.filter((n) => n.id !== node.id));
      setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
    },
    [setNodes, setEdges]
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      // Delete the edge
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    },
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

      // Position nodes more to the left (offset by 50px from drop point)
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left - 50,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: `${type}-${Date.now()}`,
        type: 'custom',
        position,
        data: { label, nodeType: type, color },
      };

      setNodes((nds) => nds.concat(newNode));

      // Auto-join: connect to nearest nodes if enabled
      if (autoJoinEnabled) {
        setTimeout(() => {
          setNodes((currentNodes) => {
            setEdges((currentEdges) => {
              // Find the two closest nodes to the new node
              const otherNodes = currentNodes.filter((n) => n.id !== newNode.id);
              if (otherNodes.length === 0) return currentEdges;

              // Calculate distances
              const distances = otherNodes.map((node) => ({
                node,
                distance: Math.sqrt(
                  Math.pow(node.position.x - position.x, 2) +
                  Math.pow(node.position.y - position.y, 2)
                ),
              }));

              // Sort by distance
              distances.sort((a, b) => a.distance - b.distance);

              // Check if the two closest nodes are connected
              const closest = distances[0].node;
              const secondClosest = distances[1]?.node;

              // Find if there's an edge between the two closest nodes
              const existingEdge = currentEdges.find(
                (e) =>
                  (e.source === closest.id && e.target === secondClosest?.id) ||
                  (e.source === secondClosest?.id && e.target === closest.id)
              );

              if (existingEdge && secondClosest) {
                // Insert the new node between the two connected nodes
                const sourceNode = closest.position.x < secondClosest.position.x ? closest : secondClosest;
                const targetNode = closest.position.x < secondClosest.position.x ? secondClosest : closest;

                // Remove the existing edge between the two nodes
                const filteredEdges = currentEdges.filter((e) => e.id !== existingEdge.id);

                // Remove any other outgoing edge from source and incoming edge to target
                const cleanedEdges = filteredEdges.filter(
                  (e) => e.source !== sourceNode.id && e.target !== targetNode.id
                );

                // Add two new edges: source -> new -> target
                return [
                  ...cleanedEdges,
                  {
                    id: `${sourceNode.id}-${newNode.id}`,
                    source: sourceNode.id,
                    target: newNode.id,
                    animated: true,
                    style: { stroke: '#3b82f6', strokeWidth: 2 },
                    interactionWidth: 30,
                  },
                  {
                    id: `${newNode.id}-${targetNode.id}`,
                    source: newNode.id,
                    target: targetNode.id,
                    animated: true,
                    style: { stroke: '#3b82f6', strokeWidth: 2 },
                    interactionWidth: 30,
                  },
                ];
              } else {
                // Just connect to the nearest node
                // Determine direction based on position
                const isNewNodeToRight = position.x > closest.position.x;
                const sourceId = isNewNodeToRight ? closest.id : newNode.id;
                const targetId = isNewNodeToRight ? newNode.id : closest.id;

                // Remove any existing outgoing edge from source and incoming edge to target
                const cleanedEdges = currentEdges.filter(
                  (e) => e.source !== sourceId && e.target !== targetId
                );

                return [
                  ...cleanedEdges,
                  {
                    id: `${sourceId}-${targetId}`,
                    source: sourceId,
                    target: targetId,
                    animated: true,
                    style: { stroke: '#3b82f6', strokeWidth: 2 },
                    interactionWidth: 30,
                  },
                ];
              }
            });
            return currentNodes;
          });
        }, 0);
      }
    },
    [reactFlowInstance, setNodes, setEdges, autoJoinEnabled]
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

  const handleRun = async () => {
    if (nodes.length === 0) return;

    setIsExecuting(true);
    setShowRunDialog(false);

    try {
      const result = await executeWorkflow(
        nodes,
        edges,
        {
          symbol: executionSymbol,
          exchange: 'US',
        },
        (progressResults) => {
          // Update node states in real-time
          setNodes((nds) =>
            nds.map((node) => {
              const status = progressResults.get(node.id)?.status || 'idle';
              return {
                ...node,
                data: {
                  ...node.data,
                  status,
                },
              };
            })
          );

          // Animate edges connected to loading nodes
          setEdges((eds) =>
            eds.map((edge) => {
              const sourceStatus = progressResults.get(edge.source)?.status;
              const targetStatus = progressResults.get(edge.target)?.status;
              const isActive = sourceStatus === 'loading' || targetStatus === 'loading';

              return {
                ...edge,
                animated: isActive,
                style: {
                  ...edge.style,
                  stroke: isActive ? '#3b82f6' : sourceStatus === 'success' ? '#10b981' : '#3b82f6',
                  strokeWidth: isActive ? 3 : 2,
                },
              };
            })
          );
        }
      );

      // Convert results map to array and filter out input nodes
      const resultsArray = Array.from(result.results.values()).filter(
        (r) => r.status === 'success' && !['symbol-input', 'stock-selection'].includes(r.nodeType)
      );

      setWorkflowResults(resultsArray);
      setShowResultModal(true);
    } catch (error) {
      console.error('Workflow execution error:', error);
    } finally {
      setIsExecuting(false);
      // Reset edge animations
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          animated: false,
          style: { stroke: '#10b981', strokeWidth: 2 },
        }))
      );
    }
  };

  const handleCloseResults = () => {
    setShowResultModal(false);
  };

  const handleConnectAll = () => {
    // Find Stock Symbol and Ask Alto nodes
    const stockSymbolNode = nodes.find((n) => n.id === 'symbol-input-default');
    const askAltoNode = nodes.find((n) => n.id === 'alto-analysis-default');

    if (!stockSymbolNode || !askAltoNode) return;

    // All analysis node types that should be in the chain
    const allAnalysisTypes = [
      { type: 'news-search', label: 'News Search', color: '#ec4899' },
      { type: 'technical-analysis', label: 'Technical Analysis', color: '#ec4899' },
      { type: 'fundamental-analysis', label: 'Fundamental Analysis', color: '#ec4899' },
      { type: 'sentiment-analysis', label: 'Sentiment Analysis', color: '#ec4899' },
      { type: 'live-chart', label: 'Live Chart', color: '#ec4899' },
    ];

    // Check which analysis nodes already exist on canvas
    const existingAnalysisNodes = nodes.filter(
      (n) => n.id !== 'symbol-input-default' && n.id !== 'alto-analysis-default'
    );

    // Find which analysis types are missing
    const existingTypes = new Set(existingAnalysisNodes.map((n) => n.data.nodeType));
    const missingTypes = allAnalysisTypes.filter((t) => !existingTypes.has(t.type));

    // Create missing nodes in a scattered two-row layout
    // Top row (y=100): News, Fundamental, Live Chart
    // Bottom row (y=400): Technical, Sentiment
    const positions: Record<string, { x: number; y: number }> = {
      'news-search': { x: 280, y: 100 },
      'fundamental-analysis': { x: 450, y: 100 },
      'live-chart': { x: 650, y: 100 },
      'technical-analysis': { x: 280, y: 400 },
      'sentiment-analysis': { x: 450, y: 400 },
    };

    const newNodes: Node[] = [];
    missingTypes.forEach((nodeType, index) => {
      const position = positions[nodeType.type] || { x: 400, y: 250 };

      newNodes.push({
        id: `${nodeType.type}-${Date.now()}-${index}`,
        type: 'custom',
        position,
        data: {
          label: nodeType.label,
          nodeType: nodeType.type,
          color: nodeType.color,
        },
      });
    });

    // Update nodes state with new nodes
    const allNodes = [...nodes, ...newNodes];
    setNodes(allNodes);

    // Get all analysis nodes (existing + new)
    const allAnalysisNodes = allNodes.filter(
      (n) => n.id !== 'symbol-input-default' && n.id !== 'alto-analysis-default'
    );

    // Sort analysis nodes by x position (left to right)
    const sortedAnalysisNodes = allAnalysisNodes.sort((a, b) => a.position.x - b.position.x);

    // Build the chain: Stock Symbol → [all analysis nodes] → Ask Alto
    const nodeChain = [stockSymbolNode, ...sortedAnalysisNodes, askAltoNode];

    // Create fresh edges connecting each node to the next
    const newEdges: Edge[] = [];
    for (let i = 0; i < nodeChain.length - 1; i++) {
      const source = nodeChain[i];
      const target = nodeChain[i + 1];

      newEdges.push({
        id: `${source.id}-${target.id}`,
        source: source.id,
        target: target.id,
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        interactionWidth: 30,
      });
    }

    // Replace all edges with the new linear chain
    setEdges(newEdges);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar — Node Palette */}
      <div className="w-[240px] border-r border-border bg-card/50 flex flex-col shrink-0 overflow-hidden">
        <div className="p-3 border-b border-border bg-card/80 backdrop-blur">
          <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
            <GraduationCap className="w-4 h-4 text-blue-500" />
            Learning Lab
          </h2>
          <p className="text-[10px] text-muted-foreground mt-1">Add analysis nodes between Stock Symbol → Ask Alto</p>
        </div>

        <div className="px-3 py-1.5 bg-muted/30 border-b border-border">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Tools</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2.5 space-y-2.5">
            {nodeCategories.map((cat) => (
              <div key={cat.label}>
                <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5 px-1" style={{ color: cat.color }}>
                  {cat.label}
                </p>
                <div className="space-y-1.5">
                  {cat.nodes.map((node) => {
                    const Icon = node.icon;
                    return (
                      <div
                        key={node.type}
                        className="flex items-center gap-2 p-2 rounded-md border border-border/50 cursor-grab hover:border-opacity-100 hover:shadow-md hover:scale-[1.02] transition-all bg-card active:cursor-grabbing active:scale-95"
                        draggable
                        onDragStart={(e) => onDragStart(e, node.type, node.label, cat.color)}
                        style={{ borderColor: `${cat.color}30` }}
                      >
                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-foreground truncate">{node.label}</p>
                          <p className="text-[9px] text-muted-foreground/80 truncate leading-tight mt-0.5">{node.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-2.5 border-t border-border space-y-1.5">
          {/* Auto-join toggle */}
          <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
            <label htmlFor="auto-join" className="text-[10px] font-medium text-foreground cursor-pointer">
              Auto-connect nodes
            </label>
            <Switch
              id="auto-join"
              checked={autoJoinEnabled}
              onCheckedChange={setAutoJoinEnabled}
            />
          </div>

          {/* Connect All button */}
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5 text-[10px]"
            onClick={handleConnectAll}
            disabled={nodes.length < 2}
          >
            <Link className="w-3 h-3" /> Connect All
          </Button>

          <Button
            size="sm"
            className="w-full gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setShowRunDialog(true)}
            disabled={nodes.length === 0 || isExecuting}
          >
            <Play className="w-3.5 h-3.5" /> {isExecuting ? 'Running...' : 'Run Workflow'}
          </Button>
          <Button
            size="sm"
            className="w-full gap-1.5 text-xs bg-blue-600 hover:bg-blue-700"
            onClick={handleLearn}
            disabled={nodes.length < 2 || tutorialLoading}
          >
            <Sparkles className="w-3.5 h-3.5" /> {tutorialLoading ? 'Generating...' : 'Learn'}
          </Button>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="flex-1 gap-1 text-[10px] px-2" onClick={() => setSavedWorkflows([...savedWorkflows, { name: `Workflow ${savedWorkflows.length + 1}`, nodes, edges }])} disabled={nodes.length === 0}>
              <Save className="w-3 h-3" /> Save
            </Button>
            <Button variant="outline" size="sm" className="gap-1 text-[10px] px-2" onClick={() => { setNodes(defaultNodes); setEdges([]); }}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-w-0 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect} onInit={setReactFlowInstance} onDrop={onDrop} onDragOver={onDragOver}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          nodeTypes={nodeTypes}
          fitView
          defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
          minZoom={0.5}
          maxZoom={2}
          className="bg-background"
        >
          <Controls className="bg-card border border-border rounded-lg shadow-sm [&>button]:bg-transparent [&>button]:text-muted-foreground [&>button]:border-border [&>button:hover]:bg-muted" />
          <Background gap={20} size={1} className="!stroke-border/30" />
        </ReactFlow>

      </div>

      {showTutorial && <TutorialPanel tutorial={tutorial} loading={tutorialLoading} onClose={() => { setShowTutorial(false); setTutorial(null); }} />}

      {showResultModal && workflowResults.length > 0 && (
        <ResultModal
          results={workflowResults}
          onClose={handleCloseResults}
        />
      )}

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
