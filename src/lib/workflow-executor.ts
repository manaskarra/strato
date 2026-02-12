// Workflow execution engine for Learning Lab

import { Node, Edge } from 'reactflow';

export interface NodeResult {
  nodeId: string;
  nodeType: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: any;
  error?: string;
}

export interface WorkflowExecutionResult {
  results: Map<string, NodeResult>;
  finalOutput: any;
}

// Execute a workflow by processing nodes in topological order
export async function executeWorkflow(
  nodes: Node[],
  edges: Edge[],
  inputData: { symbol?: string; symbols?: string[]; exchange?: string }
): Promise<WorkflowExecutionResult> {
  const results = new Map<string, NodeResult>();

  // Initialize all nodes as idle
  nodes.forEach((node) => {
    results.set(node.id, {
      nodeId: node.id,
      nodeType: node.data.nodeType,
      status: 'idle',
    });
  });

  // Get execution order (topological sort)
  const executionOrder = getExecutionOrder(nodes, edges);

  // Execute nodes in order
  for (const nodeId of executionOrder) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    // Get input data from connected nodes
    const inputs = getNodeInputs(node.id, edges, results);

    // Execute the node
    try {
      results.set(nodeId, {
        nodeId,
        nodeType: node.data.nodeType,
        status: 'loading',
      });

      const result = await executeNode(node, inputs, inputData);

      results.set(nodeId, {
        nodeId,
        nodeType: node.data.nodeType,
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      results.set(nodeId, {
        nodeId,
        nodeType: node.data.nodeType,
        status: 'error',
        error: error.message || 'Unknown error',
      });
    }
  }

  // Get final output (from leaf nodes)
  const leafNodes = nodes.filter(
    (node) => !edges.some((edge) => edge.source === node.id)
  );
  const finalOutput = leafNodes.map((node) => results.get(node.id)?.data);

  return { results, finalOutput };
}

// Execute a single node based on its type
async function executeNode(
  node: Node,
  inputs: any[],
  workflowInput: { symbol?: string; symbols?: string[]; exchange?: string }
): Promise<any> {
  const nodeType = node.data.nodeType;
  const symbol = workflowInput.symbol || workflowInput.symbols?.[0] || 'AAPL';
  const exchange = workflowInput.exchange || 'US';

  switch (nodeType) {
    case 'symbol-input':
      return { symbol, exchange };

    case 'stock-selection':
      return { symbols: workflowInput.symbols || [symbol], exchange };

    case 'news-search':
      const { apiClient: newsClient } = await import('@/lib/api-client');
      return await newsClient.fetchNews(symbol, exchange);

    case 'technical-analysis':
      const { apiClient: techClient } = await import('@/lib/api-client');
      return await techClient.fetchTechnicalAnalysis(symbol, exchange);

    case 'fundamental-analysis':
      const { apiClient: fundClient } = await import('@/lib/api-client');
      return await fundClient.fetchFundamentalAnalysis(symbol, exchange);

    case 'live-chart':
      const { apiClient: chartClient } = await import('@/lib/api-client');
      return await chartClient.fetchChartData(symbol, exchange, 'month');

    case 'alto-analysis':
      const { apiClient: altoClient } = await import('@/lib/api-client');
      return await altoClient.analyzeWithAlto({
        symbol,
        exchange,
        inputs: inputs.filter(Boolean),
      });

    default:
      return { message: `Node type ${nodeType} not implemented` };
  }
}

// Get topological execution order
function getExecutionOrder(nodes: Node[], edges: Edge[]): string[] {
  const order: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    if (visiting.has(nodeId)) {
      throw new Error('Circular dependency detected');
    }

    visiting.add(nodeId);

    // Visit dependencies first
    const dependencies = edges
      .filter((edge) => edge.target === nodeId)
      .map((edge) => edge.source);

    dependencies.forEach(visit);

    visiting.delete(nodeId);
    visited.add(nodeId);
    order.push(nodeId);
  }

  nodes.forEach((node) => visit(node.id));
  return order;
}

// Get input data from connected source nodes
function getNodeInputs(
  nodeId: string,
  edges: Edge[],
  results: Map<string, NodeResult>
): any[] {
  const sourceNodes = edges
    .filter((edge) => edge.target === nodeId)
    .map((edge) => edge.source);

  return sourceNodes
    .map((sourceId) => results.get(sourceId)?.data)
    .filter(Boolean);
}
