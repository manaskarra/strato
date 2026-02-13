'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatWindow } from './ChatWindow';
import type { Conversation, Message, ContextData } from '@/types/alto';
import {
  loadConversations,
  saveConversations,
  createConversation,
  createMessage,
  debounce,
} from '@/lib/alto-utils';

export function AltoChat() {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Thinking...');
  const [contextData, setContextData] = useState<ContextData | null>(null);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const storage = loadConversations();
    setConversations(storage.conversations);

    // Set active conversation to the most recent one
    if (storage.conversations.length > 0) {
      const mostRecent = storage.conversations[0];
      setActiveConversationId(mostRecent.id);
      setMessages(storage.messages[mostRecent.id] || []);
    }
  }, []);

  // Debounced save to localStorage
  const debouncedSave = useMemo(
    () =>
      debounce((convs: Conversation[], msgs: Record<string, Message[]>) => {
        saveConversations({ conversations: convs, messages: msgs });
      }, 300),
    []
  );

  // Save conversations and messages to localStorage
  const saveState = useCallback(
    (convs: Conversation[], activeId: string | null, currentMessages: Message[]) => {
      const storage = loadConversations();
      if (activeId) {
        storage.messages[activeId] = currentMessages;
      }
      debouncedSave(convs, storage.messages);
    },
    [debouncedSave]
  );

  // Create a new chat
  const handleNewChat = useCallback(() => {
    // Just clear active conversation and messages
    // A new conversation will be created when the user sends the first message
    setActiveConversationId(null);
    setMessages([]);
    setContextData(null);
  }, []);

  // Select a conversation
  const handleSelectConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
    const storage = loadConversations();
    setMessages(storage.messages[conversationId] || []);
  }, []);

  // Delete a conversation
  const handleDeleteConversation = useCallback((conversationId: string) => {
    const updatedConversations = conversations.filter(c => c.id !== conversationId);
    setConversations(updatedConversations);

    // If deleting active conversation, clear it
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
      setMessages([]);
      setContextData(null);
    }

    // Remove messages from storage
    const storage = loadConversations();
    delete storage.messages[conversationId];
    saveConversations({ conversations: updatedConversations, messages: storage.messages });
  }, [conversations, activeConversationId]);

  // Send a message
  const handleSendMessage = useCallback(
    async (content: string) => {
      setIsLoading(true);
      setLoadingMessage('Gathering data...');

      try {
        let currentConversationId = activeConversationId;
        let updatedConversations = [...conversations];

        // Create new conversation if needed
        if (!currentConversationId) {
          const newConversation = createConversation(content);
          currentConversationId = newConversation.id;
          updatedConversations = [newConversation, ...updatedConversations];
          setConversations(updatedConversations);
          setActiveConversationId(currentConversationId);
        }

        // Create user message
        const userMessage = createMessage('user', content);
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);

        // Prepare messages for backend (context detection happens server-side)
        setLoadingMessage('Analyzing...');

        const llmMessages = updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // Call Python Backend API
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:9320';
        const response = await fetch(`${backendUrl}/api/alto/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: llmMessages.map(m => ({ role: m.role, content: m.content })),
            detect_context: true,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response from Alto');
        }

        const data = await response.json();
        const assistantContent = data.message?.content || 'Sorry, I encountered an error.';
        const contextUsed = data.context_used || [];

        // Create assistant message
        const assistantMessage = createMessage(
          'assistant',
          assistantContent,
          contextUsed.length > 0 ? contextUsed : undefined
        );
        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);

        // Update conversation metadata
        const updatedConversationIndex = updatedConversations.findIndex(
          (c) => c.id === currentConversationId
        );
        if (updatedConversationIndex !== -1) {
          updatedConversations[updatedConversationIndex].updatedAt = new Date();
          updatedConversations[updatedConversationIndex].messageCount = finalMessages.length;
          setConversations(updatedConversations);
        }

        // Save to localStorage
        saveState(updatedConversations, currentConversationId, finalMessages);
      } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage = createMessage(
          'assistant',
          'Sorry, I encountered an error processing your request. Please try again.'
        );
        const errorMessages = [...messages, errorMessage];
        setMessages(errorMessages);
      } finally {
        setIsLoading(false);
        setLoadingMessage('Thinking...');
      }
    },
    [activeConversationId, conversations, messages, contextData, saveState]
  );

  // Quick context handler (for future use)
  const handleQuickContext = useCallback((context: string) => {
    // Placeholder for quick context shortcuts
    const queries: Record<string, string> = {
      portfolio: 'How does my portfolio look? Any concentration risks?',
      market: 'What happened in the markets today?',
      stock: 'What are the top stocks moving today?',
    };
    const query = queries[context];
    if (query) {
      handleSendMessage(query);
    }
  }, [handleSendMessage]);

  return (
    <div className="flex h-full overflow-hidden">
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onQuickContext={handleQuickContext}
      />
      <ChatWindow
        messages={messages}
        isLoading={isLoading}
        loadingMessage={loadingMessage}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
