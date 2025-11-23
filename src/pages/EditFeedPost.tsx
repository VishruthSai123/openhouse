import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

type PostType = 'thought' | 'team_hiring' | 'opportunity' | 'progress_update' | 'project_update';

const EditFeedPost = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  const [postType, setPostType] = useState<PostType>('thought');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUserId && postId) {
      loadPost();
    }
  }, [currentUserId, postId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setCurrentUserId(user.id);
  };

  const loadPost = async () => {
    if (!postId) return;

    try {
      const { data, error } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) throw error;

      if (!data) {
        toast({
          title: 'Error',
          description: 'Post not found',
          variant: 'destructive',
        });
        navigate('/feed');
        return;
      }

      // Check if user is the author
      if (data.author_id !== currentUserId) {
        toast({
          title: 'Unauthorized',
          description: 'You can only edit your own posts',
          variant: 'destructive',
        });
        navigate('/feed');
        return;
      }

      // Load post data
      setPostType(data.post_type as PostType);
      setTitle(data.title || '');
      setContent(data.content || '');
      setImageUrl(data.image_url || '');
      setVideoUrl(data.video_url || '');

      setLoading(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/feed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'Content is required',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('feed_posts')
        .update({
          post_type: postType,
          title: title.trim() || null,
          content: content.trim(),
          image_url: imageUrl.trim() || null,
          video_url: videoUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .eq('author_id', currentUserId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Post updated successfully!',
      });

      navigate(`/feed/${postId}`);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 sm:h-16 items-center gap-3 px-3 sm:px-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(`/feed/${postId}`)}
            className="h-8 w-8 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <h1 className="text-lg sm:text-xl font-bold">Edit Post</h1>
        </div>
      </header>

      <main className="container px-3 sm:px-4 py-4 sm:py-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Edit Your Post</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Post Type */}
              <div className="space-y-2">
                <Label htmlFor="postType">Post Type</Label>
                <Select value={postType} onValueChange={(value) => setPostType(value as PostType)}>
                  <SelectTrigger id="postType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thought">Thought</SelectItem>
                    <SelectItem value="team_hiring">Team Hiring</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                    <SelectItem value="progress_update">Progress Update</SelectItem>
                    <SelectItem value="project_update">Project Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title (Optional)</Label>
                <Input
                  id="title"
                  placeholder="Add a catchy title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  placeholder="What's on your mind?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  required
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {content.length} characters
                </p>
              </div>

              {/* Image URL */}
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>

              {/* Video URL */}
              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL (Optional)</Label>
                <Input
                  id="videoUrl"
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/feed/${postId}`)}
                  className="flex-1"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={submitting || !content.trim()}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EditFeedPost;
