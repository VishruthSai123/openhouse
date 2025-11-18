import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import IdeaDetail from './IdeaDetail';
import JobDetail from './JobDetail';
import DiscussionDetail from './DiscussionDetail';

/**
 * Router component that determines which detail page to show
 * based on the post_type of the post
 */
const PostDetailRouter = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [postType, setPostType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPostType = async () => {
      if (!id) {
        navigate('/feed');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('ideas')
          .select('post_type')
          .eq('id', id)
          .single();

        if (error) throw error;

        setPostType(data.post_type || 'idea');
      } catch (error) {
        console.error('Error fetching post type:', error);
        navigate('/feed');
      } finally {
        setLoading(false);
      }
    };

    fetchPostType();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Route to the appropriate detail component based on post_type
  switch (postType) {
    case 'job_posting':
      return <JobDetail />;
    case 'job_request':
      return <JobDetail />; // Job requests use the same component as job postings
    case 'discussion':
      return <DiscussionDetail />;
    case 'idea':
    default:
      return <IdeaDetail />;
  }
};

export default PostDetailRouter;
