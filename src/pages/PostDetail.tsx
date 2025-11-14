import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ThumbsUp,
  MessageCircle,
  Bookmark,
  Share2,
  Users,
  Briefcase,
  TrendingUp,
  UserPlus,
  Send,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FeedPost {
  id: string;
  author_id: string;
  post_type: string;
  title: string | null;
  content: string;
  created_at: string;
  tags: string[] | null;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
    bio: string | null;
    skills: string[] | null;
  };
  upvotes: number;
  comments: number;
  is_upvoted: boolean;
  is_saved: boolean;
  is_connected: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId && postId) {
      loadPost();
      loadComments();
    }
  }, [currentUserId, postId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadPost = async () => {
    try {
      setLoading(true);

      const { data: postData, error: postError } = await supabase
        .from('feed_posts')
        .select(`
          *,
          profiles!feed_posts_author_id_fkey (
            id,
            full_name,
            avatar_url,
            role,
            bio,
            skills
          )
        `)
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      // Fetch interactions
      const [interactionsResult, commentsCountResult, connectionResult] = await Promise.all([
        supabase
          .from('feed_post_interactions')
          .select('interaction_type, user_id')
          .eq('post_id', postId),
        
        supabase
          .from('feed_post_comments')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', postId),
        
        supabase
          .from('connections')
          .select('sender_id, receiver_id')
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${postData.author_id}),and(receiver_id.eq.${currentUserId},sender_id.eq.${postData.author_id})`
          )
          .eq('status', 'accepted')
          .single()
      ]);

      const interactions = interactionsResult.data || [];
      const upvotes = interactions.filter(i => i.interaction_type === 'upvote').length;
      const isUpvoted = interactions.some(i => i.interaction_type === 'upvote' && i.user_id === currentUserId);
      const isSaved = interactions.some(i => i.interaction_type === 'save' && i.user_id === currentUserId);

      setPost({
        ...postData,
        upvotes,
        comments: commentsCountResult.count || 0,
        is_upvoted: isUpvoted,
        is_saved: isSaved,
        is_connected: postData.author_id === currentUserId || !!connectionResult.data,
      });
    } catch (error: any) {
      console.error('Load post error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load post',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('feed_post_comments')
        .select(`
          *,
          profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !post) return;

    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      profiles: {
        id: currentUserId,
        full_name: 'You',
        avatar_url: null,
      },
    };

    setComments(prev => [...prev, tempComment]);
    setPost(prev => prev ? { ...prev, comments: prev.comments + 1 } : null);
    
    const commentText = newComment.trim();
    setNewComment('');

    try {
      const { error } = await supabase.from('feed_post_comments').insert({
        post_id: post.id,
        user_id: currentUserId,
        content: commentText,
      });

      if (error) throw error;
      loadComments();
    } catch (error: any) {
      setComments(prev => prev.filter(c => c.id !== tempComment.id));
      setPost(prev => prev ? { ...prev, comments: prev.comments - 1 } : null);
      setNewComment(commentText);
      
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleInteraction = async (type: 'upvote' | 'save') => {
    if (!post) return;

    const isCurrentlyActive = type === 'upvote' ? post.is_upvoted : post.is_saved;

    setPost(prev => {
      if (!prev) return prev;
      if (type === 'upvote') {
        return {
          ...prev,
          is_upvoted: !isCurrentlyActive,
          upvotes: isCurrentlyActive ? prev.upvotes - 1 : prev.upvotes + 1
        };
      } else {
        return { ...prev, is_saved: !isCurrentlyActive };
      }
    });

    try {
      if (isCurrentlyActive) {
        await supabase
          .from('feed_post_interactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId)
          .eq('interaction_type', type);
      } else {
        await supabase.from('feed_post_interactions').insert({
          post_id: post.id,
          user_id: currentUserId,
          interaction_type: type,
        });
      }
    } catch (error: any) {
      // Revert on error
      setPost(prev => {
        if (!prev) return prev;
        if (type === 'upvote') {
          return {
            ...prev,
            is_upvoted: isCurrentlyActive,
            upvotes: isCurrentlyActive ? prev.upvotes + 1 : prev.upvotes - 1
          };
        } else {
          return { ...prev, is_saved: isCurrentlyActive };
        }
      });
      
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleConnect = async () => {
    if (!post) return;

    try {
      await supabase.from('connections').insert({
        sender_id: currentUserId,
        receiver_id: post.author_id,
        status: 'pending',
      });

      toast({
        title: 'Success',
        description: 'Connection request sent!',
      });

      loadPost();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    if (!post) return;

    const shareUrl = window.location.href;
    const shareText = `${post.title || 'Check out this post'} - ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || 'Post from OpenHouse',
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: 'Link copied!',
          description: 'Post link copied to clipboard',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to copy link',
          variant: 'destructive',
        });
      }
    }
  };

  const getPostIcon = (type: string) => {
    switch (type) {
      case 'team_hiring':
        return <Users className="w-4 h-4" />;
      case 'opportunity':
        return <TrendingUp className="w-4 h-4" />;
      case 'project_update':
        return <Briefcase className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getPostTypeLabel = (type: string) => {
    switch (type) {
      case 'idea':
        return 'Idea';
      case 'thought':
        return 'Thought';
      case 'team_hiring':
        return 'Team Hiring';
      case 'opportunity':
        return 'Opportunity';
      case 'progress_update':
        return 'Progress Update';
      case 'project_update':
        return 'Project Update';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading post...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Post not found</p>
        <Button onClick={() => navigate('/feed')}>Back to Feed</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 sm:h-16 items-center gap-3 px-3 sm:px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 sm:h-10 sm:w-10">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <h1 className="text-lg sm:text-xl font-bold">Post Details</h1>
        </div>
      </header>

      <main className="container px-3 sm:px-4 py-4 sm:py-6 max-w-3xl mx-auto">
        {/* Post Card */}
        <Card className="mb-6">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                <AvatarFallback className="text-sm sm:text-base">
                  {post.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base">
                      {post.profiles?.full_name || 'Anonymous'}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {post.profiles?.role || 'User'} •{' '}
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!post.is_connected && post.author_id !== currentUserId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleConnect}
                      className="h-8 text-xs flex-shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                      Connect
                    </Button>
                  )}
                  {post.is_connected && post.author_id !== currentUserId && (
                    <div className="flex items-center gap-1.5 text-xs text-green-500">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Connected</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {getPostIcon(post.post_type)}
                    <span className="ml-1">{getPostTypeLabel(post.post_type)}</span>
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
            {post.title && (
              <CardTitle className="text-lg sm:text-xl">{post.title}</CardTitle>
            )}
            <CardDescription className="text-sm sm:text-base whitespace-pre-wrap">
              {post.content}
            </CardDescription>

            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Author Bio & Skills */}
            {post.profiles && (post.profiles.bio || post.profiles.skills) && (
              <div className="pt-4 border-t space-y-3">
                {post.profiles.bio && (
                  <div>
                    <p className="text-xs font-semibold mb-1">About the author</p>
                    <p className="text-sm text-muted-foreground">{post.profiles.bio}</p>
                  </div>
                )}
                {post.profiles.skills && post.profiles.skills.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {post.profiles.skills.map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interaction Buttons */}
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleInteraction('upvote')}
                className={`h-9 text-xs sm:text-sm ${post.is_upvoted ? 'text-primary' : ''}`}
              >
                <ThumbsUp
                  className={`w-4 h-4 mr-1.5 ${post.is_upvoted ? 'fill-current' : ''}`}
                />
                Upvote ({post.upvotes})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleInteraction('save')}
                className={`h-9 text-xs sm:text-sm ${post.is_saved ? 'text-primary' : ''}`}
              >
                <Bookmark
                  className={`w-4 h-4 mr-1.5 ${post.is_saved ? 'fill-current' : ''}`}
                />
                Save
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 text-xs sm:text-sm ml-auto"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 mr-1.5" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <CardTitle className="text-base sm:text-lg">
                Comments ({post.comments})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {/* Add Comment */}
            <div className="flex gap-2 mb-6">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] text-sm resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addComment();
                  }
                }}
              />
              <Button onClick={addComment} size="icon" className="h-10 w-10 flex-shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Comments List */}
            <ScrollArea className="h-auto max-h-[600px]">
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 pb-4 border-b last:border-b-0">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="text-xs">
                          {comment.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {comment.profiles?.full_name || 'Anonymous'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {comment.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PostDetail;
