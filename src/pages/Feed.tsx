import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
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
  LayoutDashboard,
  Mail,
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
  };
  upvotes: number;
  comments: number;
  is_upvoted: boolean;
  is_saved: boolean;
  is_connected: boolean;
  connection_status?: 'none' | 'pending' | 'accepted';
  engagement_score?: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

const Feed = () => {
  const [allPosts, setAllPosts] = useState<FeedPost[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserProfile, setCurrentUserProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const POSTS_PER_PAGE = 10;
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadPosts();

      // Set up real-time subscriptions
      const connectionsChannel = supabase
        .channel('feed-connections-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'connections',
            filter: `sender_id=eq.${currentUserId},receiver_id=eq.${currentUserId}`,
          },
          (payload) => {
            console.log('Connection change in feed:', payload);
            // Reload posts to update connection status
            loadPosts();
          }
        )
        .subscribe();

      const postsChannel = supabase
        .channel('feed-posts-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feed_posts',
          },
          (payload) => {
            console.log('Feed post change:', payload);
            // Reload posts when new posts are added or updated
            loadPosts();
          }
        )
        .subscribe();

      const interactionsChannel = supabase
        .channel('feed-interactions-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feed_post_interactions',
          },
          (payload) => {
            console.log('Interaction change:', payload);
            // Optionally update specific post interactions without full reload
            // For now, we handle it optimistically in handleInteraction
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(connectionsChannel);
        supabase.removeChannel(postsChannel);
        supabase.removeChannel(interactionsChannel);
      };
    }
  }, [currentUserId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      
      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setCurrentUserProfile(profile);
      }
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);

      // Fetch more posts for randomization (50 instead of 20)
      const { data: postsData, error: postsError } = await supabase
        .from('feed_posts')
        .select(`
          *,
          profiles!feed_posts_author_id_fkey (
            id,
            full_name,
            avatar_url,
            role
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setAllPosts([]);
        setDisplayedPosts([]);
        setLoading(false);
        return;
      }

      const postIds = postsData.map((p) => p.id);
      const authorIds = postsData.map((p) => p.author_id);

      // Get user's connections (followers)
      const { data: followingData } = await supabase
        .from('connections')
        .select('receiver_id, sender_id')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .eq('status', 'accepted');

      const followingIds = new Set(
        followingData?.map(c => 
          c.sender_id === currentUserId ? c.receiver_id : c.sender_id
        ) || []
      );

      // Fetch all related data in parallel
      const [interactionsResult, commentsResult, connectionsResult, pendingConnectionsResult] = await Promise.all([
        supabase
          .from('feed_post_interactions')
          .select('post_id, interaction_type, user_id')
          .in('post_id', postIds),
        
        supabase
          .from('feed_post_comments')
          .select('post_id, id')
          .in('post_id', postIds),
        
        supabase
          .from('connections')
          .select('sender_id, receiver_id, status')
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.in.(${authorIds.join(',')})),and(receiver_id.eq.${currentUserId},sender_id.in.(${authorIds.join(',')}))`
          )
          .eq('status', 'accepted'),
        
        supabase
          .from('connections')
          .select('sender_id, receiver_id, status')
          .eq('sender_id', currentUserId)
          .in('receiver_id', authorIds)
          .eq('status', 'pending')
      ]);

      const interactions = interactionsResult.data || [];
      const comments = commentsResult.data || [];
      const connections = connectionsResult.data || [];
      const pendingConnections = pendingConnectionsResult.data || [];

      // Create lookup maps for better performance
      const upvotesMap = new Map<string, number>();
      const userUpvotesSet = new Set<string>();
      const userSavesSet = new Set<string>();
      const commentsMap = new Map<string, number>();
      const connectedUsersSet = new Set<string>();
      const pendingConnectionsSet = new Set<string>();

      // Build upvotes map
      interactions.forEach((i) => {
        if (i.interaction_type === 'upvote') {
          upvotesMap.set(i.post_id, (upvotesMap.get(i.post_id) || 0) + 1);
          if (i.user_id === currentUserId) {
            userUpvotesSet.add(i.post_id);
          }
        } else if (i.interaction_type === 'save' && i.user_id === currentUserId) {
          userSavesSet.add(i.post_id);
        }
      });

      // Build comments map
      comments.forEach((c) => {
        commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1);
      });

      // Build connected users set
      connections.forEach((c) => {
        if (c.sender_id === currentUserId) {
          connectedUsersSet.add(c.receiver_id);
        } else if (c.receiver_id === currentUserId) {
          connectedUsersSet.add(c.sender_id);
        }
      });

      // Build pending connections set
      pendingConnections.forEach((c) => {
        pendingConnectionsSet.add(c.receiver_id);
      });

      // Enrich posts with interaction data and engagement score
      const enrichedPosts: FeedPost[] = postsData.map((post) => {
        const upvoteCount = upvotesMap.get(post.id) || 0;
        const commentCount = commentsMap.get(post.id) || 0;
        const isConnected = post.author_id === currentUserId || connectedUsersSet.has(post.author_id);
        const isPending = pendingConnectionsSet.has(post.author_id);
        const isFromFollowing = followingIds.has(post.author_id);
        const postAge = Date.now() - new Date(post.created_at).getTime();
        const hoursSincePost = postAge / (1000 * 60 * 60);

        // Calculate engagement score with varied weights
        let engagementScore = 0;
        engagementScore += upvoteCount * 3; // Upvotes weighted
        engagementScore += commentCount * 5; // Comments weighted more
        engagementScore += isFromFollowing ? 20 : 0; // Boost posts from connections
        engagementScore -= hoursSincePost * 0.5; // Decay over time
        engagementScore += Math.random() * 15; // Random factor for variety

        return {
          ...post,
          upvotes: upvoteCount,
          comments: commentCount,
          is_upvoted: userUpvotesSet.has(post.id),
          is_saved: userSavesSet.has(post.id),
          is_connected: isConnected,
          connection_status: isConnected ? 'accepted' : (isPending ? 'pending' : 'none'),
          engagement_score: engagementScore,
        };
      });

      // Sort by engagement score and take top 20
      const sortedPosts = enrichedPosts.sort((a, b) => 
        (b.engagement_score || 0) - (a.engagement_score || 0)
      ).slice(0, 20);

      // Add slight shuffle to top posts for variety
      const finalPosts = sortedPosts.sort((a, b) => {
        const scoreA = (a.engagement_score || 0) + Math.random() * 5;
        const scoreB = (b.engagement_score || 0) + Math.random() * 5;
        return scoreB - scoreA;
      });

      // Store all posts and display first page
      setAllPosts(finalPosts);
      setDisplayedPosts(finalPosts.slice(0, POSTS_PER_PAGE));
      setCurrentPage(1);
      setHasMore(finalPosts.length > POSTS_PER_PAGE);
    } catch (error: any) {
      console.error('Load posts error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setLoadingMore(true);
    
    // Simulate slight delay for better UX
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const startIndex = currentPage * POSTS_PER_PAGE;
      const endIndex = startIndex + POSTS_PER_PAGE;
      const nextPosts = allPosts.slice(startIndex, endIndex);
      
      setDisplayedPosts(prev => [...prev, ...nextPosts]);
      setCurrentPage(nextPage);
      setHasMore(endIndex < allPosts.length);
      setLoadingMore(false);
    }, 300);
  };

  const handleInteraction = async (postId: string, type: 'upvote' | 'save') => {
    const post = displayedPosts.find((p) => p.id === postId);
    if (!post) return;

    const isCurrentlyActive = type === 'upvote' ? post.is_upvoted : post.is_saved;

    // Optimistic UI update
    setDisplayedPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id !== postId) return p;
        if (type === 'upvote') {
          return {
            ...p,
            is_upvoted: !isCurrentlyActive,
            upvotes: isCurrentlyActive ? p.upvotes - 1 : p.upvotes + 1
          };
        } else {
          return { ...p, is_saved: !isCurrentlyActive };
        }
      })
    );

    try {
      if (isCurrentlyActive) {
        // Remove interaction
        await supabase
          .from('feed_post_interactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId)
          .eq('interaction_type', type);
      } else {
        // Add interaction
        await supabase.from('feed_post_interactions').insert({
          post_id: postId,
          user_id: currentUserId,
          interaction_type: type,
        });
      }
    } catch (error: any) {
      // Revert on error
      setDisplayedPosts(prevPosts =>
        prevPosts.map(p => {
          if (p.id !== postId) return p;
          if (type === 'upvote') {
            return {
              ...p,
              is_upvoted: isCurrentlyActive,
              upvotes: isCurrentlyActive ? p.upvotes + 1 : p.upvotes - 1
            };
          } else {
            return { ...p, is_saved: isCurrentlyActive };
          }
        })
      );
      
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleConnect = async (userId: string) => {
    // Optimistic UI update
    setDisplayedPosts(prevPosts =>
      prevPosts.map(p =>
        p.author_id === userId
          ? { ...p, connection_status: 'pending' as const }
          : p
      )
    );

    try {
      await supabase.from('connections').insert({
        sender_id: currentUserId,
        receiver_id: userId,
        status: 'pending',
      });

      toast({
        title: 'Success',
        description: 'Connection request sent!',
      });
    } catch (error: any) {
      // Revert on error
      setDisplayedPosts(prevPosts =>
        prevPosts.map(p =>
          p.author_id === userId
            ? { ...p, connection_status: 'none' as const }
            : p
        )
      );
      
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('feed_post_comments')
        .select(`
          *,
          profiles (
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
    if (!newComment.trim() || !selectedPost) return;

    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      profiles: {
        full_name: 'You',
        avatar_url: null,
      },
    };

    // Optimistic UI update
    setComments(prev => [...prev, tempComment]);
    setDisplayedPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === selectedPost.id ? { ...p, comments: p.comments + 1 } : p
      )
    );
    
    const commentText = newComment.trim();
    setNewComment('');

    try {
      const { error } = await supabase.from('feed_post_comments').insert({
        post_id: selectedPost.id,
        user_id: currentUserId,
        content: commentText,
      });

      if (error) throw error;

      // Reload comments to get the real data
      loadComments(selectedPost.id);
    } catch (error: any) {
      // Revert on error
      setComments(prev => prev.filter(c => c.id !== tempComment.id));
      setDisplayedPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === selectedPost.id ? { ...p, comments: p.comments - 1 } : p
        )
      );
      setNewComment(commentText);
      
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleShare = async (post: FeedPost) => {
    const shareUrl = `${window.location.origin}/feed/${post.id}`;
    const shareText = `${post.title || 'Check out this post'} - ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || 'Post from OpenHouse',
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled share or error occurred
        console.log('Share cancelled');
      }
    } else {
      // Fallback to clipboard
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
        <div className="animate-pulse">Loading feed...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 sm:h-18 items-center justify-between px-4 sm:px-5">
          <h1 className="text-xl sm:text-2xl font-bold">Home Feed</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/messages')}
              className="h-10 w-10 sm:h-11 sm:w-11"
            >
              <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="h-10 w-10 sm:h-11 sm:w-11"
            >
              <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <Avatar 
              className="w-10 h-10 sm:w-11 sm:h-11 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/40 transition-all"
              onClick={() => navigate(`/profile/${currentUserId}`)}
            >
              {currentUserProfile?.avatar_url ? (
                <img src={currentUserProfile.avatar_url} alt="Profile" className="object-cover w-full h-full" />
              ) : (
                <AvatarFallback className="text-sm sm:text-base bg-primary/10">
                  {currentUserProfile?.full_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
        </div>
      </header>

      <main className="container px-3 sm:px-4 py-4 sm:py-6 max-w-3xl mx-auto">
        <div className="space-y-4">
          {displayedPosts.length === 0 && !loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No posts yet. Be the first to share something!
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {displayedPosts.map((post) => (
                <Card 
                  key={post.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/feed/${post.id}`)}
                >
                  <CardHeader className="p-3 sm:p-6">
                    <div className="flex items-start gap-3">
                      <Avatar 
                        className="w-8 h-8 sm:w-10 sm:h-10 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${post.author_id}`);
                        }}
                      >
                        {post.profiles?.avatar_url ? (
                          <img src={post.profiles.avatar_url} alt={post.profiles.full_name || 'User'} className="object-cover w-full h-full" />
                        ) : (
                          <AvatarFallback className="text-xs sm:text-sm">
                            {post.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p 
                              className="font-medium text-sm sm:text-base truncate cursor-pointer hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/profile/${post.author_id}`);
                              }}
                            >
                              {post.profiles?.full_name || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {post.profiles?.role || 'User'} •{' '}
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          {!post.is_connected && post.author_id !== currentUserId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (post.connection_status !== 'pending') {
                                  handleConnect(post.author_id);
                                }
                              }}
                              disabled={post.connection_status === 'pending'}
                              className="h-7 text-xs flex-shrink-0"
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              {post.connection_status === 'pending' ? 'Request Sent' : 'Connect'}
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {getPostIcon(post.post_type)}
                            <span className="ml-1">{getPostTypeLabel(post.post_type)}</span>
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    {post.title && (
                      <CardTitle className="text-base sm:text-lg mb-2">{post.title}</CardTitle>
                    )}
                    <CardDescription className="text-sm whitespace-pre-wrap">
                      {post.content}
                    </CardDescription>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {post.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Interaction Buttons */}
                    <div className="flex items-center gap-1 sm:gap-2 mt-4 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInteraction(post.id, 'upvote');
                        }}
                        className={`h-8 text-xs ${post.is_upvoted ? 'text-primary' : ''}`}
                      >
                        <ThumbsUp
                          className={`w-4 h-4 mr-1 ${post.is_upvoted ? 'fill-current' : ''}`}
                        />
                        <span className="hidden sm:inline">Upvote</span>
                        <span className="sm:hidden">{post.upvotes}</span>
                        <span className="hidden sm:inline ml-1">({post.upvotes})</span>
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPost(post);
                              loadComments(post.id);
                            }}
                            className="h-8 text-xs"
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            {post.comments}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[85vh]">
                          <DialogHeader>
                            <DialogTitle className="text-base sm:text-lg">Comments</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="h-[300px] sm:h-[400px] pr-4">
                            <div className="space-y-4">
                              {comments.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                  No comments yet. Be the first to comment!
                                </p>
                              ) : (
                                comments.map((comment) => (
                                  <div key={comment.id} className="flex gap-2 sm:gap-3">
                                    <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
                                      <AvatarFallback className="text-xs">
                                        {comment.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <p className="text-xs sm:text-sm font-medium">
                                        {comment.profiles?.full_name || 'Anonymous'}
                                      </p>
                                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                        {comment.content}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
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
                          <div className="flex gap-2 pt-3 border-t">
                            <Textarea
                              placeholder="Write a comment..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              className="min-h-[60px] text-sm resize-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  addComment();
                                }
                              }}
                            />
                            <Button onClick={addComment} size="icon" className="h-9 w-9 flex-shrink-0">
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInteraction(post.id, 'save');
                        }}
                        className={`h-8 text-xs ${post.is_saved ? 'text-primary' : ''}`}
                      >
                        <Bookmark
                          className={`w-4 h-4 mr-1 ${post.is_saved ? 'fill-current' : ''}`}
                        />
                        <span className="hidden sm:inline">Save</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(post);
                        }}
                      >
                        <Share2 className="w-4 h-4" />
                        <span className="hidden sm:inline ml-1">Share</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Load More Button */}
              {hasMore && (
                <Card className="mt-4">
                  <CardContent className="py-6 text-center">
                    <Button
                      onClick={loadMore}
                      disabled={loadingMore}
                      variant="outline"
                      className="w-full sm:w-auto px-8"
                    >
                      {loadingMore ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent mr-2" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
            )}
        </div>
      </main>
    </div>
  );
};

export default Feed;
