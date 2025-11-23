-- Add is_hidden column to feed_posts table
-- This allows users to hide their feed posts without deleting them

DO $$
BEGIN
  -- Add is_hidden column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feed_posts' AND column_name = 'is_hidden') THEN
    ALTER TABLE feed_posts ADD COLUMN is_hidden BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create index on is_hidden for faster queries (partial index for visible posts)
CREATE INDEX IF NOT EXISTS idx_feed_posts_is_hidden ON feed_posts(is_hidden) WHERE is_hidden = false;

COMMENT ON COLUMN feed_posts.is_hidden IS 'Whether the post is hidden by the user (soft delete)';

-- Update RLS policy to exclude hidden posts for non-owners
DROP POLICY IF EXISTS "Anyone can view public posts" ON feed_posts;

CREATE POLICY "Anyone can view public posts" ON feed_posts
  FOR SELECT
  USING (
    (
      visibility = 'public' AND (is_hidden = false OR is_hidden IS NULL OR author_id = auth.uid())
    ) OR
    author_id = auth.uid() OR
    (visibility = 'connections' AND (is_hidden = false OR is_hidden IS NULL OR author_id = auth.uid()) AND author_id IN (
      SELECT receiver_id FROM connections WHERE sender_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT sender_id FROM connections WHERE receiver_id = auth.uid() AND status = 'accepted'
    ))
  );

-- Also update ideas table RLS policy to properly handle is_hidden
-- First, check if the ideas table has RLS enabled and policies
DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Anyone can view ideas" ON ideas;
  
  -- Create new policy that respects is_hidden
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ideas') THEN
    -- Enable RLS if not already enabled
    ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Anyone can view ideas" ON ideas
      FOR SELECT
      USING (
        is_hidden = false OR is_hidden IS NULL OR user_id = auth.uid()
      );
  END IF;
END $$;
