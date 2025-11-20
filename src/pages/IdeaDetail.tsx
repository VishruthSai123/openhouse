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
import PostMenu from '@/components/PostMenu';

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
  is_hidden?: boolean;
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
        .eq('post_type', 'idea')
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

  const handleEdit = () => {
    navigate(`/post/${id}/edit`);
  };

  const handleHide = async () => {
    try {
      const newHiddenState = !idea?.is_hidden;
      const { error } = await supabase
        .from('ideas')
        .update({ is_hidden: newHiddenState })
        .eq('id', id)
        .eq('user_id', currentUser?.id);

      if (error) throw error;

      toast({
        title: newHiddenState ? 'Post hidden' : 'Post unhidden',
        description: newHiddenState 
          ? 'Your post has been hidden successfully.'
          : 'Your post is now visible to everyone.',
      });

      // Reload the idea
      loadIdea();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser?.id);

      if (error) throw error;

      toast({
        title: 'Post deleted',
        description: 'Your post has been permanently deleted.',
      });

      navigate('/ideas');
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
    <div className="min-h-screen bg-background py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/ideas')}
          className="mb-4 sm:mb-6 h-9 sm:h-10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Ideas
        </Button>

        {/* Idea Card */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="px-3 sm:px-6 pt-4 sm:pt-6">
            <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <Badge variant="secondary" className="text-xs">{idea.category}</Badge>
                <Badge variant="outline" className="text-xs whitespace-nowrap">{stages[idea.stage as keyof typeof stages]}</Badge>
              </div>
              {currentUser && idea.user_id === currentUser.id && (
                <PostMenu
                  postId={idea.id}
                  onEdit={handleEdit}
                  onHide={handleHide}
                  onDelete={handleDelete}
                  isHidden={idea.is_hidden || false}
                />
              )}
            </div>
            
            <CardTitle className="text-xl sm:text-2xl lg:text-3xl">{idea.title}</CardTitle>
            
            {/* Author Info */}
            <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 cursor-pointer" onClick={() => navigate(`/profile/${idea.user_id}`)}>
                <AvatarFallback className="bg-primary/10 text-xs sm:text-sm">
                  {idea.profiles.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-sm sm:text-base truncate cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/profile/${idea.user_id}`)}>{idea.profiles.full_name}</p>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                  {idea.profiles.role && <span className="truncate">{idea.profiles.role}</span>}
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span className="hidden sm:inline">{formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}</span>
                    <span className="sm:hidden">{formatDistanceToNow(new Date(idea.created_at), { addSuffix: true }).replace(' ago', '')}</span>
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-6 space-y-4 sm:space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2 text-sm sm:text-base">About This Idea</h3>
              <p className="text-muted-foreground whitespace-pre-wrap text-sm sm:text-base">{idea.description}</p>
            </div>

            {/* Looking For */}
            {idea.looking_for && idea.looking_for.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Looking For</h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {idea.looking_for.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <Button
                variant={hasVoted ? "default" : "outline"}
                size="lg"
                onClick={handleUpvote}
                className="flex items-center justify-center gap-2 h-10 sm:h-11 text-sm sm:text-base"
              >
                <ArrowUpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{hasVoted ? 'Upvoted' : 'Upvote'}</span>
                <Badge variant="secondary" className="text-xs">{idea.upvotes}</Badge>
              </Button>

              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm sm:text-base">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{comments.length} Comments</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-base sm:text-xl">Comments</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Share your thoughts and feedback</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {/* Add Comment */}
            <form onSubmit={handleCommentSubmit} className="mb-4 sm:mb-6">
              <Textarea
                placeholder="Share your feedback, ask questions, or offer to collaborate..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                maxLength={500}
                className="mb-2 text-sm"
              />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {newComment.length}/500 characters
                </p>
                <Button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="w-full sm:w-auto h-9 sm:h-10 text-sm"
                >
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                  {submitting ? 'Posting...' : 'Post Comment (+2 Coins)'}
                </Button>
              </div>
            </form>

            <Separator className="my-4 sm:my-6" />

            {/* Comments List */}
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-2 sm:gap-3">
                    <Avatar className="flex-shrink-0 h-7 w-7 sm:h-9 sm:w-9 cursor-pointer" onClick={() => navigate(`/profile/${comment.user_id}`)}>
                      <AvatarFallback className="bg-primary/10 text-xs">
                        {comment.profiles.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <span className="font-semibold text-xs sm:text-sm cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/profile/${comment.user_id}`)}>
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
                      <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap break-words">
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
