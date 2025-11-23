import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to check if user has paid and gate features accordingly
 */
export const usePaymentGuard = () => {
  const [hasPaid, setHasPaid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  const checkPaymentStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setHasPaid(false);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('has_paid')
        .eq('id', user.id)
        .single();

      setHasPaid(profile?.has_paid || false);
    } catch (error) {
      console.error('Error checking payment status:', error);
      setHasPaid(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if a specific feature is accessible
   * @param featureName - Name of the feature to check
   * @returns boolean - true if accessible, false if payment required
   */
  const canAccessFeature = (featureName: string): boolean => {
    if (hasPaid) return true;

    // Define which features are allowed without payment (read-only)
    const freeFeatures = [
      'view_posts',
      'read_discussions',
      'browse_profiles',
      'view_projects',
      'view_leaderboard',
      'browse_jobs',
      'browse_ideas'
    ];

    return freeFeatures.includes(featureName);
  };

  /**
   * List of restricted features that require payment
   */
  const restrictedFeatures = {
    upvote: 'Upvoting',
    comment: 'Comments',
    share: 'Sharing',
    create_post: 'Creating Posts',
    create_idea: 'Posting Ideas',
    create_job: 'Posting Jobs',
    create_discussion: 'Starting Discussions',
    create_project: 'Creating Projects',
    send_message: 'Messaging',
    send_request: 'Connection Requests',
    follow: 'Following Users',
    connect: 'Connecting',
    earn_coins: 'Builder Coins',
    mentor_booking: 'Mentorship Bookings',
    apply_job: 'Job Applications',
  };

  return {
    hasPaid,
    loading,
    canAccessFeature,
    restrictedFeatures,
  };
};

/**
 * Helper function to get user's payment status without hook
 */
export const getUserPaymentStatus = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('has_paid')
      .eq('id', user.id)
      .single();

    return profile?.has_paid || false;
  } catch (error) {
    console.error('Error checking payment status:', error);
    return false;
  }
};
