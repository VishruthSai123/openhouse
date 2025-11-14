import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowUpCircle, MessageSquare, Send, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface IdeaDetail {
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
    email: string;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    role: string | null;
  };
}

const IdeaDetail = () => {
  const { id } = useParams();
  const [idea, setIdea] = useState<IdeaDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const stages = {
    'idea': '💡 Just an Idea',
    'validating': '🔍 Validating',
    'building': '🔨 Building',
    'mvp': '🚀 MVP Ready',
    'launched': '✨ Launched'
  };

  useEffect(() => {
    checkAuth();
    loadIdea();
    loadComments();
  }, [id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setCurrentUser(user);
    checkIfVoted(user.id);
  };

  const loadIdea = async () => {
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setIdea(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/ideas');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('idea_comments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role
          )
        `)
        .eq('idea_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error('Error loading comments:', error);
    }
  };

  const checkIfVoted = async (userId: string) => {
    const { data } = await supabase
      .from('idea_votes')
      .select('id')
      .eq('idea_id', id)
      .eq('user_id', userId)
      .single();

    setHasVoted(!!data);
  };

  const handleUpvote = async () => {
    if (!currentUser || !idea) return;

    try {
      if (hasVoted) {
        // Remove vote
        await supabase
          .from('idea_votes')
          .delete()
          .eq('idea_id', id)
          .eq('user_id', currentUser.id);

        await supabase
          .from('ideas')
          .update({ upvotes: idea.upvotes - 1 })
          .eq('id', id);

        setHasVoted(false);
      } else {
        // Add vote
        await supabase
          .from('idea_votes')
          .insert({ idea_id: id, user_id: currentUser.id });

        await supabase
          .from('ideas')
          .update({ upvotes: idea.upvotes + 1 })
          .eq('id', id);

        // Award coins
        if (idea.user_id !== currentUser.id) {
          await awardCoins(idea.user_id, 1, 'Upvote received');
        }
        await awardCoins(currentUser.id, 1, 'Voted on idea');

        setHasVoted(true);
      }

      loadIdea();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('idea_comments')
        .insert({
          idea_id: id,
          user_id: currentUser.id,
          content: newComment.trim()
        });

      if (error) throw error;

      // Award coins
      await awardCoins(currentUser.id, 2, 'Commented on idea');
      if (idea && idea.user_id !== currentUser.id) {
        await awardCoins(idea.user_id, 1, 'Comment received');
      }

      setNewComment('');
      loadComments();

      toast({
        title: 'Comment Posted! 🎉',
        description: '+2 Builder Coins',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const awardCoins = async (userId: string, amount: number, reason: string) => {
    try {
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: userId,
          amount,
          reason,
          reference_type: 'idea_interaction',
          reference_id: id
        });

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
        <div className="animate-pulse text-muted-foreground">Loading idea...</div>
      </div>
    );
  }

  if (!idea) return null;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/ideas')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Ideas
        </Button>

        {/* Idea Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-2">
                <Badge variant="secondary">{idea.category}</Badge>
                <Badge variant="outline">{stages[idea.stage as keyof typeof stages]}</Badge>
              </div>
            </div>
            
            <CardTitle className="text-3xl">{idea.title}</CardTitle>
            
            {/* Author Info */}
            <div className="flex items-center gap-3 mt-4">
              <Avatar>
                <AvatarFallback className="bg-primary/10">
                  {idea.profiles.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{idea.profiles.full_name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {idea.profiles.role && <span>{idea.profiles.role}</span>}
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">About This Idea</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{idea.description}</p>
            </div>

            {/* Looking For */}
            {idea.looking_for && idea.looking_for.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Looking For</h3>
                <div className="flex flex-wrap gap-2">
                  {idea.looking_for.map((tag, idx) => (
                    <Badge key={idx} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Button
                variant={hasVoted ? "default" : "outline"}
                size="lg"
                onClick={handleUpvote}
                className="flex items-center gap-2"
              >
                <ArrowUpCircle className="w-5 h-5" />
                <span>{hasVoted ? 'Upvoted' : 'Upvote'}</span>
                <Badge variant="secondary">{idea.upvotes}</Badge>
              </Button>

              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="w-5 h-5" />
                <span>{comments.length} Comments</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
            <CardDescription>Share your thoughts and feedback</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Add Comment */}
            <form onSubmit={handleCommentSubmit} className="mb-6">
              <Textarea
                placeholder="Share your feedback, ask questions, or offer to collaborate..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                maxLength={500}
                className="mb-2"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {newComment.length}/500 characters
                </p>
                <Button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? 'Posting...' : 'Post Comment (+2 Coins)'}
                </Button>
              </div>
            </form>

            <Separator className="my-6" />

            {/* Comments List */}
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-sm">
                        {comment.profiles.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {comment.profiles.full_name}
                        </span>
                        {comment.profiles.role && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {comment.profiles.role}
                            </span>
                          </>
                        )}
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IdeaDetail;
