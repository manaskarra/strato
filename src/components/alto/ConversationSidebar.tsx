'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationItem } from './ConversationItem';
import type { Conversation } from '@/types/alto';
import { Plus, PieChart, TrendingUp, BarChart3, GripVertical } from 'lucide-react';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onQuickContext?: (context: string) => void;
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 260;

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onQuickContext,
}: ConversationSidebarProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Load saved width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem('alto-sidebar-width');
    if (savedWidth) {
      setWidth(parseInt(savedWidth, 10));
    }
  }, []);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
        localStorage.setItem('alto-sidebar-width', newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <div
      ref={sidebarRef}
      style={{ width: `${width}px` }}
      className="relative border-r border-border bg-card/50 flex flex-col shrink-0 h-full overflow-hidden"
    >
      {/* Header */}
      <div className="p-3 border-b border-border">
        <Button
          onClick={onNewChat}
          className="w-full bg-gradient-to-br from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-muted-foreground">
                No conversations yet. Start a new chat!
              </p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeConversationId}
                onClick={() => onSelectConversation(conversation.id)}
                onDelete={() => onDeleteConversation(conversation.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Quick Context Shortcuts */}
      {onQuickContext && (
        <div className="p-3 border-t border-border space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase font-semibold px-2">
            Quick Context
          </p>
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => onQuickContext('portfolio')}
            >
              <PieChart className="w-3 h-3 mr-2" />
              Portfolio
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => onQuickContext('market')}
            >
              <TrendingUp className="w-3 h-3 mr-2" />
              Markets
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => onQuickContext('stock')}
            >
              <BarChart3 className="w-3 h-3 mr-2" />
              Stock
            </Button>
          </div>
        </div>
      )}

      {/* Resize Handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 transition-colors group"
        onMouseDown={() => setIsResizing(true)}
      >
        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-4 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
