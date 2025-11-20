import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, MessageSquare, Calendar, ThumbsUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import PostMenu from '@/components/PostMenu';

interface DiscussionDetail {
  id: string;
  title: string;
  description: string;
  category: string;
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

const DiscussionDetail = () => {
  const { id } = useParams();
  const [discussion, setDiscussion] = useState<DiscussionDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadDiscussion();
    loadComments();
  }, [id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setCurrentUser(user);
  };

  const loadDiscussion = async () => {
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
        .eq('post_type', 'discussion')
        .single();

      if (error) throw error;
      setDiscussion(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/feed');
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

  const handleEdit = () => {
    navigate(`/post/${id}/edit`);
  };

  const handleHide = async () => {
    try {
      const newHiddenState = !discussion?.is_hidden;
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

      // Reload the discussion
      loadDiscussion();
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

      navigate('/feed');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('idea_comments')
        .insert({
          idea_id: id,
          user_id: currentUser.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      loadComments();

      toast({
        title: 'Comment posted!',
        description: 'Your comment has been added to the discussion.',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading discussion...</div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Discussion not found</p>
          <Button onClick={() => navigate('/feed')} className="mt-4">
            Back to Feed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate('/feed')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Feed
          </Button>
        </div>

        {/* Main Discussion Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="w-12 h-12 sm:w-14 sm:h-14 cursor-pointer" onClick={() => navigate(`/profile/${discussion.user_id}`)}>
                <AvatarFallback className="bg-purple-500 text-white text-lg">
                  {discussion.profiles?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Discussion
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {discussion.category}
                    </Badge>
                  </div>
                  {currentUser && discussion.user_id === currentUser.id && (
                    <PostMenu
                      postId={discussion.id}
                      onEdit={handleEdit}
                      onHide={handleHide}
                      onDelete={handleDelete}
                      isHidden={discussion.is_hidden || false}
                    />
                  )}
                </div>
                <CardTitle className="text-xl sm:text-2xl mb-2">{discussion.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Started by <span className="cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/profile/${discussion.user_id}`)}>{discussion.profiles?.full_name}</span></span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Discussion Content */}
            <div className="prose max-w-none">
              <p className="text-muted-foreground whitespace-pre-wrap">{discussion.description}</p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 pt-4 border-t text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                <span>{comments.length} {comments.length === 1 ? 'reply' : 'replies'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Replies ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Comment Form */}
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <Textarea
                placeholder="Share your thoughts on this discussion..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <Button type="submit" disabled={submitting || !newComment.trim()}>
                <Send className="w-4 h-4 mr-2" />
                {submitting ? 'Posting...' : 'Post Reply'}
              </Button>
            </form>

            <Separator />

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No replies yet. Be the first to share your thoughts!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-4 rounded-lg bg-muted/30">
                    <Avatar className="w-8 h-8 cursor-pointer" onClick={() => navigate(`/profile/${comment.user_id}`)}>
                      <AvatarFallback className="text-xs">
                        {comment.profiles?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/profile/${comment.user_id}`)}>
                          {comment.profiles?.full_name || 'Unknown User'}
                        </span>
                        {comment.profiles?.role && (
                          <Badge variant="outline" className="text-xs">
                            {comment.profiles.role}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DiscussionDetail;
