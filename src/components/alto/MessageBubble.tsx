'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatTimestamp } from '@/lib/alto-utils';
import type { Message } from '@/types/alto';
import { Bot, User } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Don't render system messages
  if (message.role === 'system') {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar - only for assistant */}
      {isAssistant && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Message content */}
      <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-card border border-border text-foreground'
          }`}
        >
          {/* Message text with markdown rendering */}
          <div className={`text-sm break-words prose prose-sm max-w-none ${
            isUser ? 'prose-invert' : 'dark:prose-invert'
          }`}>
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {/* Context sources used */}
          {isAssistant && message.contextUsed && message.contextUsed.length > 0 && (
            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
              <span className="text-[10px] text-muted-foreground">
                Sources: {message.contextUsed.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground px-2">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>

      {/* Avatar - only for user */}
      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );
}
