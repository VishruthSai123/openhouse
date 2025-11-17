import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Send,
  Sparkles,
  TrendingUp,
  Search,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Brain,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const IdeaValidator = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ideaSummary, setIdeaSummary] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add welcome message
    setMessages([{
      role: 'assistant',
      content: `👋 Hi! I'm your AI Idea Validator. I'll help you validate your startup idea with real-time market research and honest feedback.

**Tell me about your idea:**
- What problem does it solve?
- Who is your target audience?
- What makes it unique?

I'll research the market, analyze competition, and give you brutally honest feedback! 🚀`,
      timestamp: new Date(),
    }]);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Extract idea summary from first message
    if (messages.length === 1 && !ideaSummary) {
      setIdeaSummary(input.trim());
    }

    try {
      const { data, error } = await supabase.functions.invoke('idea-validator', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          ideaSummary: ideaSummary || input.trim(),
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to get response. Please try again.',
        variant: 'destructive',
      });

      // Add error message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try asking your question again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    { icon: TrendingUp, text: 'Analyze market size', prompt: 'What is the market size and growth potential for this idea?' },
    { icon: Search, text: 'Check competition', prompt: 'Who are the main competitors and how does my idea compare?' },
    { icon: Lightbulb, text: 'Suggest improvements', prompt: 'What improvements or pivots would you suggest for this idea?' },
    { icon: AlertCircle, text: 'Identify risks', prompt: 'What are the biggest risks and challenges I should be aware of?' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 sm:h-18 items-center gap-4 px-4 sm:px-5">
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Brain className="w-6 h-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">Idea Validator</h1>
          </div>
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Powered
          </Badge>
        </div>
      </header>

      <main className="container px-4 sm:px-5 py-4 max-w-4xl mx-auto">
        {/* Info Banner */}
        <Card className="mb-4 bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Real-time Market Research</p>
              <p className="text-xs text-muted-foreground mt-1">
                I search the web for latest data, competitors, and trends to give you honest, data-backed validation
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Chat Container */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Chat with AI Validator</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Messages */}
            <ScrollArea ref={scrollRef} className="h-[calc(100vh-400px)] min-h-[400px] px-4 sm:px-6">
              <div className="space-y-4 py-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Brain className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`rounded-lg px-4 py-3 max-w-[85%] sm:max-w-[75%] ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-60 mt-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-primary animate-pulse" />
                    </div>
                    <div className="rounded-lg px-4 py-3 bg-muted">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Quick Prompts */}
            {messages.length > 2 && !loading && (
              <div className="px-4 sm:px-6 pb-3">
                <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-1.5"
                      onClick={() => {
                        setInput(prompt.prompt);
                      }}
                    >
                      <prompt.icon className="w-3 h-3 mr-1.5" />
                      {prompt.text}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t p-4 sm:p-6">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Describe your idea or ask a question..."
                  className="min-h-[80px] resize-none"
                  disabled={loading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  size="icon"
                  className="h-[80px] w-12 flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium mb-2">💡 Tips for better validation:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Be specific about your target market and problem</li>
              <li>• Share your unique value proposition</li>
              <li>• Ask about competition and market trends</li>
              <li>• Don't be afraid of honest feedback!</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default IdeaValidator;
