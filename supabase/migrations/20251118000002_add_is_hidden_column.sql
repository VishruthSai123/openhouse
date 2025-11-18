-- Add is_hidden column to ideas table for hiding posts
-- This allows users to hide their own posts without deleting them

DO $$
BEGIN
  -- Add is_hidden column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'is_hidden') THEN
    ALTER TABLE ideas ADD COLUMN is_hidden BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create index on is_hidden for faster queries
CREATE INDEX IF NOT EXISTS idx_ideas_is_hidden ON ideas(is_hidden) WHERE is_hidden = false;

-- Create index on user_id for user's own posts
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);

COMMENT ON COLUMN ideas.is_hidden IS 'Whether the post is hidden by the user (soft delete)';
