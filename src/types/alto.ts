// Alto AI Assistant Type Definitions

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  context?: {
    type: 'portfolio' | 'stock' | 'general';
    symbol?: string;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  contextUsed?: string[]; // Data sources: ['Technical', 'News']
  isStreaming?: boolean;
}

export interface ContextData {
  type: 'stock' | 'portfolio' | 'market' | 'general';
  symbol?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any; // Financial data from EODHD
  sources: string[]; // ['Technical', 'Fundamental', 'News']
}

export interface ConversationStorage {
  conversations: Conversation[];
  messages: Record<string, Message[]>; // conversationId -> messages
}

export interface AltoSettings {
  model: string;
  streamingEnabled: boolean;
  contextCacheEnabled: boolean;
  contextCacheTTL: number; // in minutes
}
