'use client';

import { useState } from 'react';
import { formatTimestamp } from '@/lib/alto-utils';
import type { Conversation } from '@/types/alto';
import { MessageSquare, Trash2 } from 'lucide-react';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
  onDelete,
}: ConversationItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent conversation selection
    if (confirm('Delete this conversation?')) {
      onDelete();
    }
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors relative group ${
        isActive
          ? 'bg-blue-600/10 border border-blue-600/20'
          : 'hover:bg-card/80 border border-transparent'
      }`}
    >
      <div className="flex items-start gap-2">
        <MessageSquare
          className={`w-4 h-4 shrink-0 mt-0.5 ${
            isActive ? 'text-blue-600' : 'text-muted-foreground'
          }`}
        />
        <div className="flex-1 min-w-0 overflow-hidden">
          <p
            className={`text-sm font-medium truncate whitespace-nowrap overflow-hidden text-ellipsis ${
              isActive ? 'text-blue-600' : 'text-foreground'
            }`}
          >
            {conversation.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground">
              {formatTimestamp(conversation.updatedAt)}
            </span>
            {conversation.messageCount > 0 && (
              <>
                <span className="text-[10px] text-muted-foreground">•</span>
                <span className="text-[10px] text-muted-foreground">
                  {conversation.messageCount} {conversation.messageCount === 1 ? 'message' : 'messages'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Delete Button - Shows on hover */}
        {isHovered && (
          <button
            onClick={handleDelete}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
            aria-label="Delete conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </button>
  );
}
