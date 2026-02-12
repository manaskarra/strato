// Alto AI Assistant Utility Functions

import type { Conversation, Message, ConversationStorage, AltoSettings } from '@/types/alto';

// LocalStorage keys
const STORAGE_KEY = 'alto-conversations';
const SETTINGS_KEY = 'alto-settings';

// Default settings
const DEFAULT_SETTINGS: AltoSettings = {
  model: 'gpt-4.1-mini',
  streamingEnabled: false,
  contextCacheEnabled: true,
  contextCacheTTL: 5, // 5 minutes
};

// Generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format timestamp for display
export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() !== new Date(date).getFullYear() ? 'numeric' : undefined
  });
}

// Generate conversation title from first message
export function generateConversationTitle(firstMessage: string): string {
  const maxLength = 40;
  const cleaned = firstMessage.trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return cleaned.substring(0, maxLength).trim() + '...';
}

// LocalStorage operations with error handling
export function loadConversations(): ConversationStorage {
  if (typeof window === 'undefined') {
    return { conversations: [], messages: {} };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { conversations: [], messages: {} };
    }

    const parsed = JSON.parse(stored) as ConversationStorage;
    // Convert date strings back to Date objects
    parsed.conversations = parsed.conversations.map((conv) => ({
      ...conv,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
    }));

    // Convert message timestamps back to Date objects
    Object.keys(parsed.messages).forEach((convId) => {
      parsed.messages[convId] = parsed.messages[convId].map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    });

    return parsed;
  } catch (error) {
    console.error('Failed to load conversations:', error);
    return { conversations: [], messages: {} };
  }
}

export function saveConversations(storage: ConversationStorage): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.error('Failed to save conversations:', error);
  }
}

export function loadSettings(): AltoSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) {
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AltoSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// Create a new conversation
export function createConversation(
  firstMessage: string,
  context?: Conversation['context']
): Conversation {
  return {
    id: generateId(),
    title: generateConversationTitle(firstMessage),
    createdAt: new Date(),
    updatedAt: new Date(),
    messageCount: 0,
    context,
  };
}

// Create a new message
export function createMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
  contextUsed?: string[]
): Message {
  return {
    id: generateId(),
    role,
    content,
    timestamp: new Date(),
    contextUsed,
  };
}

// Debounce function for localStorage writes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Extract potential stock symbols from text
export function extractSymbols(text: string): string[] {
  // Match common stock symbol patterns: $AAPL, TSLA, etc.
  const symbolRegex = /\$?([A-Z]{1,5})\b/g;
  const matches = text.match(symbolRegex);

  if (!matches) return [];

  // Remove $ prefix and deduplicate
  const symbols = matches.map(m => m.replace('$', ''));
  return Array.from(new Set(symbols));
}

// Check if text contains portfolio-related keywords
export function hasPortfolioIntent(text: string): boolean {
  const portfolioKeywords = [
    'portfolio',
    'holdings',
    'positions',
    'my stocks',
    'my investments',
    'what i own',
  ];

  const lowerText = text.toLowerCase();
  return portfolioKeywords.some(keyword => lowerText.includes(keyword));
}

// Check if text contains market-related keywords
export function hasMarketIntent(text: string): boolean {
  const marketKeywords = [
    'market',
    's&p',
    'sp500',
    'nasdaq',
    'dow',
    'indices',
    'market today',
    'markets',
  ];

  const lowerText = text.toLowerCase();
  return marketKeywords.some(keyword => lowerText.includes(keyword));
}

// Truncate context to fit token limit (rough estimation)
export function truncateContext(text: string, maxTokens: number = 2000): string {
  // Rough estimate: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4;

  if (text.length <= maxChars) {
    return text;
  }

  return text.substring(0, maxChars) + '\n\n[Context truncated due to length...]';
}
