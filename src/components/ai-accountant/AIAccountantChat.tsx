import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Send, Bot, User, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// react-markdown's real per-tag prop types (ComponentPropsWithoutRef<Tag> &
// ReactMarkdownProps) carry a lot more than these renderers read - node
// position info, sibling counts, etc. These just cover what's destructured.
type MdChildrenProps = { children?: React.ReactNode };
type MdCodeProps = { inline?: boolean; children?: React.ReactNode };

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  content: "Hello! I'm your AI business accountant. I can help you analyze your business performance, understand your profits, and provide advice for growth. What would you like to know about your business?",
  sender: 'ai',
  timestamp: new Date(),
};

// How many textarea lines the composer grows to before it starts
// scrolling internally instead of pushing the rest of the page around.
const COMPOSER_MAX_HEIGHT_PX = 160;

const AIAccountantChat: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load the user's saved conversation so leaving and returning to this
  // screen (or reopening the app) picks up right where they left off,
  // instead of resetting to just the welcome message every time.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const { data, error } = await supabase
          .from('ai_accountant_messages')
          .select('id, sender, content, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (cancelled) return;

        if (data && data.length > 0) {
          setMessages(data.map((m) => ({
            id: m.id,
            content: m.content,
            sender: m.sender as 'user' | 'ai',
            timestamp: new Date(m.created_at),
          })));
        } else {
          setMessages([WELCOME_MESSAGE]);
        }
      } catch (err) {
        console.error('Error loading AI accountant history:', err);
        // Fall back to a fresh conversation rather than blocking the screen.
        setMessages([WELCOME_MESSAGE]);
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    };

    loadHistory();
    return () => { cancelled = true; };
  }, [user]);

  // Auto-grow the composer as the user types, like a chat app - up to a
  // cap, after which it scrolls internally instead of growing forever.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!inputMessage) {
      // Reset to the single-line baseline instead of measuring scrollHeight
      // - some mobile WebViews factor the (often multi-line) placeholder
      // into an empty textarea's scrollHeight, which puffs it up at rest.
      el.style.height = '44px';
      return;
    }
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT_PX)}px`;
  }, [inputMessage]);

  const persistMessage = async (msg: Message) => {
    if (!user) return;
    const { error } = await supabase.from('ai_accountant_messages').insert({
      id: msg.id,
      user_id: user.id,
      sender: msg.sender,
      content: msg.content,
    });
    if (error) console.error('Error saving AI accountant message:', error);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user || isLoading) return;

    const userMessage: Message = {
      id: uuidv4(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);
    persistMessage(userMessage);

    try {
      // Send conversation history (excluding the unsaved welcome message)
      // so the AI has context of what's already been discussed.
      const historyForApi = updatedMessages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ sender: m.sender, content: m.content }));

      const { data, error } = await supabase.functions.invoke('ai-accountant-chat', {
        body: { message: userMessage.content, history: historyForApi }
      });
      if (error) throw error;

      const aiMessage: Message = {
        id: uuidv4(),
        content: data.response,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((p) => [...p, aiMessage]);
      persistMessage(aiMessage);
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to get AI response. Please try again.');
      const errorMessage: Message = {
        id: uuidv4(),
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((p) => [...p, errorMessage]);
      persistMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('ai_accountant_messages')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
      setMessages([WELCOME_MESSAGE]);
      toast.success('Conversation cleared');
    } catch (err) {
      console.error('Error clearing AI accountant history:', err);
      toast.error('Failed to clear conversation');
    } finally {
      setIsClearDialogOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent max-w-4xl mx-auto overflow-hidden">
      <div className="flex items-center gap-3 pb-4 mb-2 border-b border-slate-100 dark:border-slate-800 bg-transparent">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-100/50 shrink-0">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg tracking-tight">AI Business Accountant</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Your personal financial advisor</p>
        </div>
        {messages.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsClearDialogOpen(true)}
            className="h-9 w-9 shrink-0 text-slate-400 hover:text-destructive hover:bg-destructive/10"
            aria-label="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 py-4 px-1 overflow-hidden bg-transparent">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : (
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3.5 ${message.sender === 'user' ? 'justify-end' : 'justify-start'} py-1`}
            >
              {message.sender === 'ai' && (
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                </div>
              )}

              <div
                className={`max-w-[85%] ${message.sender === 'user' ? 'p-3.5 px-4 bg-indigo-600 text-white rounded-2xl rounded-tr-none shadow-sm' : 'py-1 text-slate-800 dark:text-slate-200'}`}
                style={{ wordBreak: 'break-word' }}
              >
                {message.sender === 'ai' ? (
                  <div className="text-sm leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }: MdChildrenProps) => <p className="mb-2.5 last:mb-0 whitespace-pre-wrap break-words">{children}</p>,
                        ul: ({ children }: MdChildrenProps) => <ul className="list-disc pl-5 mb-2.5 space-y-1">{children}</ul>,
                        ol: ({ children }: MdChildrenProps) => <ol className="list-decimal pl-5 mb-2.5 space-y-1">{children}</ol>,
                        li: ({ children }: MdChildrenProps) => <li className="break-words">{children}</li>,
                        strong: ({ children }: MdChildrenProps) => <strong className="font-bold text-slate-900 dark:text-white">{children}</strong>,
                        h3: ({ children }: MdChildrenProps) => <h3 className="font-semibold text-slate-900 dark:text-white mt-3 mb-1.5">{children}</h3>,
                        table: ({ children }: MdChildrenProps) => (
                          <div className="overflow-x-auto w-full my-3 rounded-lg border border-slate-100 dark:border-slate-800">
                            <table className="w-full text-left border-collapse min-w-0 table-auto max-w-full">{children}</table>
                          </div>
                        ),
                        thead: ({ children }: MdChildrenProps) => <thead className="border-b bg-slate-50/50 dark:bg-slate-900/50">{children}</thead>,
                        tbody: ({ children }: MdChildrenProps) => <tbody>{children}</tbody>,
                        th: ({ children }: MdChildrenProps) => <th className="px-3 py-2 font-semibold text-xs text-slate-500 border-b">{children}</th>,
                        td: ({ children }: MdChildrenProps) => <td className="px-3 py-2 text-xs border-b border-slate-100 dark:border-slate-800">{children}</td>,
                        code: ({ inline, children }: MdCodeProps) => (
                          inline ? (
                            <code className={`px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-xs font-mono break-words whitespace-pre-wrap text-indigo-600 dark:text-indigo-400`}>{children}</code>
                          ) : (
                            <div className="overflow-auto bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-100 dark:border-slate-800 my-2">
                              <code className={`block w-full max-w-full font-mono text-xs whitespace-pre-wrap break-words`}>{children}</code>
                            </div>
                          )
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                )}

                <span className={`text-[10px] mt-1.5 block text-right font-medium ${message.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {message.sender === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/50 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <User className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3.5 justify-start py-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
                <Bot className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="py-1 max-w-[80%]">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span className="text-sm font-medium text-slate-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
        )}
      </ScrollArea>

      <div className="pt-4 pb-2 bg-transparent">
        <div className="flex gap-2.5 items-end bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm max-w-3xl mx-auto w-full">
          <Textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your sales, products, profits..."
            rows={1}
            className="flex-1 min-w-0 min-h-[44px] py-2.5 px-4 resize-none bg-transparent border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 placeholder:truncate text-slate-800 dark:text-slate-100 leading-relaxed"
            style={{ overflowY: 'auto' }}
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="h-11 w-11 p-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 shadow-sm hover:shadow active:scale-95 transition-all duration-150"
          >
            <Send className="w-4.5 h-4.5" />
          </Button>
        </div>
      </div>

      <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your chat history with the AI accountant. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AIAccountantChat;
