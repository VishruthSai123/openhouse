import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, TrendingUp, Clock, ArrowUpCircle, MessageSquare } from 'lucide-react';

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
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">💡 Idea Hub</h1>
              <p className="text-muted-foreground mt-1">
                Discover amazing startup ideas and connect with founders
              </p>
            </div>
            <Button onClick={() => navigate('/ideas/new')} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Post Your Idea
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category Tabs */}
        <Tabs defaultValue="all" className="mb-8" onValueChange={setSelectedCategory}>
          <TabsList className="flex-wrap h-auto">
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="capitalize">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIdeas.map(idea => (
              <Card
                key={idea.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => navigate(`/ideas/${idea.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary">{idea.category}</Badge>
                    <Badge variant="outline">{stages[idea.stage as keyof typeof stages]}</Badge>
                  </div>
                  <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                    {idea.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    {idea.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Looking For Tags */}
                  {idea.looking_for && idea.looking_for.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
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
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                        {idea.profiles.full_name?.charAt(0) || '?'}
                      </div>
                      <span className="text-muted-foreground">
                        {idea.profiles.full_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
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
