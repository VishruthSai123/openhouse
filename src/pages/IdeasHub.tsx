import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, TrendingUp, Clock, ArrowUpCircle, MessageSquare, ArrowLeft, Lightbulb } from 'lucide-react';

interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  stage: string;
  looking_for: string[] | null;
  upvotes: number;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    role: string | null;
  };
  idea_votes: { id: string }[];
  idea_comments: { id: string }[];
}

const IdeasHub = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [filteredIdeas, setFilteredIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const categories = [
    'all',
    'SaaS',
    'E-commerce',
    'EdTech',
    'HealthTech',
    'FinTech',
    'Social',
    'Gaming',
    'AI/ML',
    'Other'
  ];

  const stages = {
    'idea': '💡 Idea',
    'validating': '🔍 Validating',
    'building': '🔨 Building',
    'mvp': '🚀 MVP Ready',
    'launched': '✨ Launched'
  };

  useEffect(() => {
    checkAuth();
    loadIdeas();
  }, []);

  useEffect(() => {
    filterIdeas();
  }, [searchQuery, selectedCategory, ideas]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setCurrentUser(user);
  };

  const loadIdeas = async () => {
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role
          ),
          idea_votes (id),
          idea_comments (id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIdeas(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterIdeas = () => {
    let filtered = ideas;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(idea => idea.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(idea =>
        idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredIdeas(filtered);
  };

  const handleUpvote = async (ideaId: string, currentVotes: number) => {
    if (!currentUser) return;

    try {
      // Check if already voted
      const { data: existingVote } = await supabase
        .from('idea_votes')
        .select('id')
        .eq('idea_id', ideaId)
        .eq('user_id', currentUser.id)
        .single();

      if (existingVote) {
        // Remove vote
        await supabase
          .from('idea_votes')
          .delete()
          .eq('id', existingVote.id);

        await supabase
          .from('ideas')
          .update({ upvotes: currentVotes - 1 })
          .eq('id', ideaId);
      } else {
        // Add vote
        await supabase
          .from('idea_votes')
          .insert({ idea_id: ideaId, user_id: currentUser.id });

        await supabase
          .from('ideas')
          .update({ upvotes: currentVotes + 1 })
          .eq('id', ideaId);

        // Award coins to idea creator
        const idea = ideas.find(i => i.id === ideaId);
        if (idea && idea.user_id !== currentUser.id) {
          await awardCoins(idea.user_id, 1, 'Upvote received on idea');
        }

        // Award coins to voter
        await awardCoins(currentUser.id, 1, 'Voted on idea');
      }

      loadIdeas();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const awardCoins = async (userId: string, amount: number, reason: string) => {
    try {
      // Insert transaction
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: userId,
          amount,
          reason,
          reference_type: 'idea_interaction'
        });

      // Update user's total coins
      const { data: profile } = await supabase
        .from('profiles')
        .select('builder_coins')
        .eq('id', userId)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ builder_coins: (profile.builder_coins || 0) + amount })
          .eq('id', userId);
      }
    } catch (error) {
      console.error('Error awarding coins:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading ideas...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            <h1 className="text-base sm:text-xl font-bold">Idea Hub</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Discover amazing startup ideas and connect with founders
            </p>
          </div>
          <Button onClick={() => navigate('/ideas/new')} size="sm" className="sm:size-lg w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Post Your Idea
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 sm:top-3 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
          <Input
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
          />
        </div>

        {/* Category Tabs */}
        <Tabs defaultValue="all" className="mb-6 sm:mb-8 mt-4 sm:mt-6" onValueChange={setSelectedCategory}>
          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
            <TabsList className="inline-flex w-max sm:w-auto flex-nowrap sm:flex-wrap h-auto">
              {categories.map(cat => (
                <TabsTrigger key={cat} value={cat} className="capitalize text-xs sm:text-sm whitespace-nowrap">
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        {/* Ideas Grid */}
        {filteredIdeas.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">No ideas found. Be the first to post!</p>
              <Button onClick={() => navigate('/ideas/new')} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Post an Idea
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredIdeas.map(idea => (
              <Card
                key={idea.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => navigate(`/ideas/${idea.id}`)}
              >
                <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <Badge variant="secondary" className="text-xs">{idea.category}</Badge>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">{stages[idea.stage as keyof typeof stages]}</Badge>
                  </div>
                  <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors text-base sm:text-lg">
                    {idea.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-3 text-xs sm:text-sm">
                    {idea.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  {/* Looking For Tags */}
                  {idea.looking_for && idea.looking_for.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3 sm:mb-4">
                      {idea.looking_for.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {idea.looking_for.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{idea.looking_for.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Author & Stats */}
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {idea.profiles.full_name?.charAt(0) || '?'}
                      </div>
                      <span className="text-muted-foreground truncate">
                        {idea.profiles.full_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">,
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpvote(idea.id, idea.upvotes);
                        }}
                        className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ArrowUpCircle className="w-4 h-4" />
                        <span>{idea.upvotes}</span>
                      </button>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MessageSquare className="w-4 h-4" />
                        <span>{idea.idea_comments?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IdeasHub;
