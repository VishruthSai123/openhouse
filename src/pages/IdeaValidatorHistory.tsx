import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  MessageSquare,
  Trash2,
  Calendar,
  Brain,
  Plus,
  Search as SearchIcon,
  Globe,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
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

interface ChatSession {
  id: string;
  title: string;
  idea_summary: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
  has_web_context?: boolean;
}

const IdeaValidatorHistory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Get all sessions with message count
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('idea_validator_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get message counts and web context info for each session
      const sessionsWithCounts = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { count } = await supabase
            .from('idea_validator_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

          const { data: webContextData } = await supabase
            .from('idea_validator_messages')
            .select('has_web_context')
            .eq('session_id', session.id)
            .eq('has_web_context', true)
            .limit(1);

          return {
            ...session,
            message_count: count || 0,
            has_web_context: (webContextData?.length || 0) > 0,
          };
        })
      );

      setSessions(sessionsWithCounts);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chat history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('idea_validator_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(sessions.filter(s => s.id !== sessionId));
      toast({
        title: 'Success',
        description: 'Chat session deleted',
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete session',
        variant: 'destructive',
      });
    } finally {
      setDeleteSessionId(null);
    }
  };

  const handleOpenSession = (sessionId: string) => {
    navigate(`/idea-validator?session=${sessionId}`);
  };

  const filteredSessions = sessions.filter(session => 
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.idea_summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-5 max-w-5xl mx-auto">
          <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10" onClick={() => navigate('/idea-validator')}>
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
              <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <h1 className="text-base sm:text-xl font-bold truncate">Chat History</h1>
          </div>
          <Button onClick={() => navigate('/idea-validator')} size="sm" className="h-9 text-xs sm:text-sm">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        </div>
      </header>

      <main className="container px-3 sm:px-5 py-3 sm:py-4 max-w-5xl mx-auto">
        {/* Search Bar */}
        <Card className="mb-3 sm:mb-4 border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              <Input
                placeholder="Search chat history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 sm:pl-10 text-xs sm:text-sm h-9 sm:h-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Card className="border-border/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <MessageSquare className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold truncate">{sessions.length}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total Chats</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
                  <Globe className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-purple-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold truncate">
                    {sessions.filter(s => s.has_web_context).length}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">With Research</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions List */}
        {loading ? (
          <Card className="border-border/50">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="flex flex-col items-center gap-2 sm:gap-3">
                <Brain className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground animate-pulse" />
                <p className="text-xs sm:text-sm text-muted-foreground">Loading chat history...</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredSessions.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-8 sm:p-12 text-center">
              <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2">
                {searchQuery ? 'No matching chats found' : 'No chat history yet'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 px-4">
                {searchQuery 
                  ? 'Try a different search term'
                  : 'Start validating your startup ideas with AI to build your history'}
              </p>
              {!searchQuery && (
                <Button onClick={() => navigate('/idea-validator')} size="sm">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Start New Chat
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredSessions.map((session) => (
              <Card 
                key={session.id}
                className="hover:border-primary/50 transition-all cursor-pointer group border-border/50"
                onClick={() => handleOpenSession(session.id)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex-shrink-0">
                      <Brain className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base truncate mb-0.5 sm:mb-1">
                            {session.title}
                          </h3>
                          {session.idea_summary && (
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                              {session.idea_summary}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </div>
                      
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0.5">
                          <MessageSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                          {session.message_count}
                        </Badge>
                        {session.has_web_context && (
                          <Badge variant="secondary" className="text-[10px] sm:text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 px-1.5 py-0.5">
                            <Globe className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                            Research
                          </Badge>
                        )}
                        <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center">
                          <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                          {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteSessionId(session.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSessionId} onOpenChange={() => setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat session and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSessionId && handleDeleteSession(deleteSessionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IdeaValidatorHistory;
