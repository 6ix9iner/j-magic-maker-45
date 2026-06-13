import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const AIAccountantChat: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    content: "Hello! I'm your AI business accountant. I can help you analyze your business performance, understand your profits, and provide advice for growth. What would you like to know about your business?",
    sender: 'ai',
    timestamp: new Date()
  }]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Send conversation history (excluding the welcome message) so the AI has context
      const historyForApi = updatedMessages
        .filter(m => m.id !== '1') // exclude the hardcoded welcome message
        .map(m => ({ sender: m.sender, content: m.content }));

      const { data, error } = await supabase.functions.invoke('ai-accountant-chat', {
        body: { message: userMessage.content, history: historyForApi }
      });
      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((p) => [...p, aiMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to get AI response. Please try again.');
      setMessages((p) => [...p, {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        sender: 'ai',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full sm:h-[600px] bg-white rounded-lg border border-gray-200 max-w-full overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">AI Business Accountant</h3>
          <p className="text-sm text-gray-600">Your personal financial advisor</p>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 overflow-hidden">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={`max-w-[80%] p-3 rounded-lg break-words whitespace-pre-wrap ${message.sender === 'user' ? 'bg-blue-600 text-white ml-auto' : 'bg-gray-100 text-gray-900'}`}
                style={{ wordBreak: 'break-word' }}
              >
                {message.sender === 'ai' ? (
                  <div className="text-sm">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }: any) => <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words">{children}</p>,
                        ul: ({ children }: any) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
                        ol: ({ children }: any) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
                        li: ({ children }: any) => <li className="break-words">{children}</li>,
                        strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
                        h3: ({ children }: any) => <h3 className="font-semibold mb-1">{children}</h3>,
                        table: ({ children }: any) => (
                          <div className="overflow-auto w-full">
                            <table className="w-full text-left border-collapse my-2 min-w-0 table-auto max-w-full">{children}</table>
                          </div>
                        ),
                        thead: ({ children }: any) => <thead className="border-b">{children}</thead>,
                        tbody: ({ children }: any) => <tbody>{children}</tbody>,
                        th: ({ children }: any) => <th className="px-2 py-1 font-medium border-b">{children}</th>,
                        td: ({ children }: any) => <td className="px-2 py-1 border-b">{children}</td>,
                        code: ({ inline, children }: any) => (
                          inline ? (
                            <code className={`px-1 rounded bg-black/10 break-words whitespace-pre-wrap`}>{children}</code>
                          ) : (
                            <div className="overflow-auto bg-black/5 rounded p-2">
                              <code className={`block w-full max-w-full whitespace-pre-wrap break-words`}>{children}</code>
                            </div>
                          )
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                )}

                <span className={`text-xs mt-1 block ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {message.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 p-3 rounded-lg max-w-[80%]">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2 flex-wrap">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your business performance, profits, growth strategies..."
            className="flex-1 min-w-0"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Ask questions like: "How much profit did I make last month?" or "What are my top performing products?"
        </p>
      </div>
    </div>
  );
};

export default AIAccountantChat;
