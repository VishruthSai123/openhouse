-- Complete ideas table setup
-- This ensures all required columns exist for the Idea Hub feature

DO $$ 
BEGIN
  -- Add user_id column if missing (foreign key to profiles)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'user_id') THEN
    ALTER TABLE ideas ADD COLUMN user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  
  -- Add title column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'title') THEN
    ALTER TABLE ideas ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled';
  END IF;
  
  -- Add description column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'description') THEN
    ALTER TABLE ideas ADD COLUMN description TEXT NOT NULL DEFAULT '';
  END IF;
  
  -- Add category column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'category') THEN
    ALTER TABLE ideas ADD COLUMN category TEXT NOT NULL DEFAULT 'Other';
  END IF;
  
  -- Add stage column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'stage') THEN
    ALTER TABLE ideas ADD COLUMN stage TEXT NOT NULL DEFAULT 'idea';
  END IF;
  
  -- Add looking_for column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'looking_for') THEN
    ALTER TABLE ideas ADD COLUMN looking_for TEXT[];
  END IF;
  
  -- Add upvotes column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'upvotes') THEN
    ALTER TABLE ideas ADD COLUMN upvotes INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  -- Add created_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'created_at') THEN
    ALTER TABLE ideas ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
  
  -- Add updated_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'updated_at') THEN
    ALTER TABLE ideas ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- Create trigger for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_ideas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ideas_updated_at ON ideas;

CREATE TRIGGER update_ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_ideas_updated_at();

-- Disable RLS on ideas table
ALTER TABLE ideas DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view all ideas" ON ideas;
DROP POLICY IF EXISTS "Users can create ideas" ON ideas;
DROP POLICY IF EXISTS "Users can update their own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can delete their own ideas" ON ideas;
