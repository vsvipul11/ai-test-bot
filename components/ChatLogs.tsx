// components/ChatLog.tsx
"use client";

import { useEffect, useRef, useState } from 'react';
import { User, MessageCircle } from 'lucide-react';
import { useRTVIClient, useRTVIClientEvent } from 'realtime-ai-react';
import { RTVIEvent, RTVIMessage } from 'realtime-ai';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatLog = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const voiceClient = useRTVIClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Listen for bot's responses
  useRTVIClientEvent(
    RTVIEvent.BotUtterance,
    (message: RTVIMessage) => {
      const content = message.data as string;
      if (content && typeof content === 'string') {
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content,
            timestamp: new Date()
          }
        ]);
      }
    }
  );

  // Listen for user's speech
  useRTVIClientEvent(
    RTVIEvent.UserUtterance,
    (message: RTVIMessage) => {
      const content = message.data as string;
      if (content && typeof content === 'string') {
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: `user-${Date.now()}`,
            role: 'user',
            content,
            timestamp: new Date()
          }
        ]);
      }
    }
  );

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8">
        <div className="bg-blue-50 rounded-full p-4 mb-4">
          <MessageCircle className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">Your conversation with Dr. Riya</h3>
        <p className="text-center text-gray-500 max-w-md">
          Speak clearly when the microphone is active. Dr. Riya is ready to discuss your symptoms and provide assistance.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} max-w-full`}
            >
              <div 
                className={`flex max-w-[85%] rounded-xl py-2 px-3 ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                <div className="flex-shrink-0 mr-2">
                  {message.role === 'user' ? (
                    <User className={`h-5 w-5 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`} />
                  ) : (
                    <div className="h-5 w-5 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">DR</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-medium ${message.role === 'user' ? 'text-blue-100' : 'text-gray-700'}`}>
                      {message.role === 'user' ? 'You' : 'Dr. Riya'}
                    </span>
                    <span className={`text-xs ${message.role === 'user' ? 'text-blue-200' : 'text-gray-400'} ml-2`}>
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className={`text-sm whitespace-pre-wrap break-words ${message.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                    {message.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>
    </div>
  );
};

export default ChatLog;