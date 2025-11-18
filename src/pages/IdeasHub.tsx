import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, TrendingUp, Clock, ArrowUpCircle, MessageSquare, ArrowLeft, Lightbulb, Home, Briefcase, Users, FolderKanban, MessageCircle, MapPin, DollarSign, Wifi } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  description: string;
  category: string;
  post_type: string;
  stage?: string;
  looking_for?: string[] | null;
  job_type?: string;
  location?: string;
  salary_range?: string | null;
  skills_required?: string[] | null;
  is_remote?: boolean;
  company_name?: string | null;
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const stages = {
    'idea': '💡 Idea',
    'validating': '🔍 Validating',
    'building': '🔨 Building',
    'mvp': '🚀 MVP Ready',
    'launched': '✨ Launched'
  };

  const jobTypeLabels: { [key: string]: string } = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    'contract': 'Contract',
    'internship': 'Internship',
    'freelance': 'Freelance',
  };

  useEffect(() => {
    checkAuth();
    loadPosts();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [searchQuery, selectedTab, posts]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setCurrentUser(user);
  };

  const loadPosts = async () => {
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
      setPosts(data || []);
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

  const filterPosts = () => {
    let filtered = posts;

    // Filter by tab
    if (selectedTab !== 'all') {
      if (selectedTab === 'co-founders') {
        // Co-founders are ideas where looking_for includes founder-related roles
        filtered = filtered.filter(post => 
          post.post_type === 'idea' && 
          post.looking_for?.some(role => 
            role.toLowerCase().includes('founder') || 
            role.toLowerCase().includes('co-founder')
          )
        );
      } else if (selectedTab === 'jobs') {
        filtered = filtered.filter(post => 
          post.post_type === 'job_posting' || post.post_type === 'job_request'
        );
      } else if (selectedTab === 'projects') {
        // Projects are ideas in building/mvp/launched stages
        filtered = filtered.filter(post => 
          post.post_type === 'idea' && 
          (post.stage === 'building' || post.stage === 'mvp' || post.stage === 'launched')
        );
      } else {
        filtered = filtered.filter(post => post.post_type === selectedTab);
      }
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPosts(filtered);
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
        const post = posts.find(i => i.id === ideaId);
        if (post && post.user_id !== currentUser.id) {
          await awardCoins(post.user_id, 1, 'Upvote received on idea');
        }

        // Award coins to voter
        await awardCoins(currentUser.id, 1, 'Voted on idea');
      }

      loadPosts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const renderPostCard = (post: Post) => {
    const isIdea = post.post_type === 'idea';
    const isJob = post.post_type === 'job_posting' || post.post_type === 'job_request';
    const isDiscussion = post.post_type === 'discussion';

    return (
      <Card
        key={post.id}
        className="hover:shadow-lg transition-shadow cursor-pointer group"
        onClick={() => navigate(`/post/${post.id}`)}
      >
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
          <div className="flex items-start justify-between mb-2 gap-2">
            <Badge variant="secondary" className="text-xs">{post.category}</Badge>
            {isIdea && post.stage && (
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                {stages[post.stage as keyof typeof stages]}
              </Badge>
            )}
            {isJob && post.job_type && (
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                {jobTypeLabels[post.job_type] || post.job_type}
              </Badge>
            )}
            {isDiscussion && (
              <Badge variant="outline" className="text-xs whitespace-nowrap bg-purple-100 text-purple-700">
                <MessageCircle className="w-3 h-3 mr-1" />
                Discussion
              </Badge>
            )}
          </div>
          <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors text-base sm:text-lg">
            {post.title}
          </CardTitle>
          <CardDescription className="line-clamp-3 text-xs sm:text-sm">
            {post.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          {/* Job-specific info */}
          {isJob && (
            <div className="space-y-2 mb-3">
              {post.location && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{post.location}</span>
                  {post.is_remote && <Badge variant="outline" className="text-xs ml-1">Remote</Badge>}
                </div>
              )}
              {post.salary_range && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <DollarSign className="w-3 h-3" />
                  <span>{post.salary_range}</span>
                </div>
              )}
              {post.company_name && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Briefcase className="w-3 h-3" />
                  <span>{post.company_name}</span>
                </div>
              )}
              {post.skills_required && post.skills_required.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.skills_required.slice(0, 3).map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {post.skills_required.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{post.skills_required.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Idea-specific info */}
          {isIdea && post.looking_for && post.looking_for.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3 sm:mb-4">
              {post.looking_for.slice(0, 3).map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {post.looking_for.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{post.looking_for.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Author & Stats */}
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {post.profiles.full_name?.charAt(0) || '?'}
              </div>
              <span className="text-muted-foreground truncate">
                {post.profiles.full_name}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpvote(post.id, post.upvotes);
                }}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowUpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{post.upvotes}</span>
              </button>
              <div className="flex items-center gap-1 text-muted-foreground">
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{post.idea_comments?.length || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => navigate('/feed')}>
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            <h1 className="text-base sm:text-xl font-bold">Explore</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Discover ideas, jobs, co-founders, projects, and discussions
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 sm:top-3 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
          <Input
            placeholder="Search everything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
          />
        </div>

        {/* Tabs for post types */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6 sm:mb-8 mt-4 sm:mt-6">
          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
            <TabsList className="inline-flex w-max sm:w-auto flex-nowrap sm:flex-wrap h-auto">
              <TabsTrigger value="all" className="text-xs sm:text-sm whitespace-nowrap">
                <Search className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                All
              </TabsTrigger>
              <TabsTrigger value="idea" className="text-xs sm:text-sm whitespace-nowrap">
                <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                Ideas
              </TabsTrigger>
              <TabsTrigger value="jobs" className="text-xs sm:text-sm whitespace-nowrap">
                <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                Jobs
              </TabsTrigger>
              <TabsTrigger value="co-founders" className="text-xs sm:text-sm whitespace-nowrap">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                Co-Founders
              </TabsTrigger>
              <TabsTrigger value="projects" className="text-xs sm:text-sm whitespace-nowrap">
                <FolderKanban className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                Projects
              </TabsTrigger>
              <TabsTrigger value="discussion" className="text-xs sm:text-sm whitespace-nowrap">
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                Discussions
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        {/* Posts Grid */}
        {filteredPosts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? 'No results found. Try a different search term.' 
                  : 'No posts found in this category.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredPosts.map(post => renderPostCard(post))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IdeasHub;
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
