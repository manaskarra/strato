'use client';

import { WelcomeScreen } from './WelcomeScreen';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import type { Message } from '@/types/alto';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  loadingMessage?: string;
  onSendMessage: (message: string) => void;
}

export function ChatWindow({
  messages,
  isLoading,
  loadingMessage,
  onSendMessage,
}: ChatWindowProps) {
  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {hasMessages ? (
        <MessageList
          messages={messages}
          isLoading={isLoading}
          loadingMessage={loadingMessage}
        />
      ) : (
        <WelcomeScreen onSuggestedQuestion={onSendMessage} />
      )}
      <ChatInput onSendMessage={onSendMessage} disabled={isLoading} />
    </div>
  );
}
