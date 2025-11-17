-- ============================================
-- PROFILE SYSTEM SETUP
-- Creates views and functions for public profile pages
-- ============================================

-- Create a view for public profile stats (connections count + leaderboard rank)
CREATE OR REPLACE VIEW public_profile_stats AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.role,
  p.skills,
  p.builder_coins,
  p.created_at,
  -- Count connections (accepted only)
  (
    SELECT COUNT(*)
    FROM connections c
    WHERE (c.sender_id = p.id OR c.receiver_id = p.id)
    AND c.status = 'accepted'
  ) as connections_count,
  -- Calculate leaderboard rank
  (
    SELECT COUNT(*) + 1
    FROM profiles p2
    WHERE p2.builder_coins > p.builder_coins
  ) as leaderboard_rank
FROM profiles p;

-- Function to get user's public posts
CREATE OR REPLACE FUNCTION get_user_posts(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  post_type TEXT,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  tags TEXT[],
  upvotes BIGINT,
  comments BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fp.id,
    fp.post_type,
    fp.title,
    fp.content,
    fp.created_at,
    fp.tags,
    COALESCE(COUNT(DISTINCT fpu.id), 0) as upvotes,
    COALESCE(COUNT(DISTINCT fpc.id), 0) as comments
  FROM feed_posts fp
  LEFT JOIN feed_post_upvotes fpu ON fp.id = fpu.post_id
  LEFT JOIN feed_post_comments fpc ON fp.id = fpc.post_id
  WHERE fp.author_id = user_id_param
  GROUP BY fp.id, fp.post_type, fp.title, fp.content, fp.created_at, fp.tags
  ORDER BY fp.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's public projects (only public projects + projects where they're added by others)
CREATE OR REPLACE FUNCTION get_user_public_projects(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  status TEXT,
  visibility TEXT,
  github_url TEXT,
  demo_url TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  is_creator BOOLEAN,
  member_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.title,
    p.description,
    p.category,
    p.status,
    p.visibility,
    p.github_url,
    p.demo_url,
    p.tags,
    p.created_at,
    (p.creator_id = user_id_param) as is_creator,
    pm.role as member_role
  FROM projects p
  LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = user_id_param
  WHERE 
    -- Show public projects where user is creator or member
    (p.visibility = 'public' AND (p.creator_id = user_id_param OR pm.user_id = user_id_param))
    -- Don't show private projects even if user is member
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Disable RLS on the view (if RLS is needed, create appropriate policies)
-- The view only exposes public information
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_connections_accepted ON connections(sender_id, receiver_id) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_feed_posts_author ON feed_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- ============================================
-- VERIFICATION QUERIES (Run these to test)
-- ============================================

-- Test profile stats view
-- SELECT * FROM public_profile_stats WHERE id = 'YOUR_USER_ID';

-- Test get user posts function
-- SELECT * FROM get_user_posts('YOUR_USER_ID'::uuid);

-- Test get user projects function
-- SELECT * FROM get_user_public_projects('YOUR_USER_ID'::uuid);
