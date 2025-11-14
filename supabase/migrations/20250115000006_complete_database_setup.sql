-- COMPLETE DATABASE SETUP FOR OPEN HOUSE PLATFORM
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- 1. ENSURE PROFILES TABLE HAS ALL COLUMNS
-- ============================================
DO $$ 
BEGIN
  -- Add avatar_url if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
  
  -- Add bio if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
    ALTER TABLE profiles ADD COLUMN bio TEXT;
  END IF;
  
  -- Add role if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role TEXT;
  END IF;
  
  -- Add skills if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'skills') THEN
    ALTER TABLE profiles ADD COLUMN skills TEXT[];
  END IF;
  
  -- Add interests if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'interests') THEN
    ALTER TABLE profiles ADD COLUMN interests TEXT[];
  END IF;
END $$;

-- ============================================
-- 2. COMPLETE IDEAS TABLE SETUP
-- ============================================
DO $$ 
BEGIN
  -- Add user_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'user_id') THEN
    ALTER TABLE ideas ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  
  -- Add title if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'title') THEN
    ALTER TABLE ideas ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled';
  END IF;
  
  -- Add description if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'description') THEN
    ALTER TABLE ideas ADD COLUMN description TEXT NOT NULL DEFAULT '';
  END IF;
  
  -- Add category if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'category') THEN
    ALTER TABLE ideas ADD COLUMN category TEXT NOT NULL DEFAULT 'Other';
  END IF;
  
  -- Add stage if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'stage') THEN
    ALTER TABLE ideas ADD COLUMN stage TEXT NOT NULL DEFAULT 'idea';
  END IF;
  
  -- Add looking_for if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'looking_for') THEN
    ALTER TABLE ideas ADD COLUMN looking_for TEXT[];
  END IF;
  
  -- Add upvotes if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'upvotes') THEN
    ALTER TABLE ideas ADD COLUMN upvotes INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  -- Add created_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'created_at') THEN
    ALTER TABLE ideas ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
  
  -- Add updated_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'updated_at') THEN
    ALTER TABLE ideas ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- Disable RLS on ideas table
ALTER TABLE ideas DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on ideas
DROP POLICY IF EXISTS "Users can view all ideas" ON ideas;
DROP POLICY IF EXISTS "Users can create ideas" ON ideas;
DROP POLICY IF EXISTS "Users can update their own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can delete their own ideas" ON ideas;

-- Create trigger for ideas updated_at
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

-- ============================================
-- 3. IDEA_VOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS idea_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(idea_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_idea_votes_idea ON idea_votes(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_votes_user ON idea_votes(user_id);

-- Disable RLS on idea_votes
ALTER TABLE idea_votes DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all votes" ON idea_votes;
DROP POLICY IF EXISTS "Users can vote on ideas" ON idea_votes;
DROP POLICY IF EXISTS "Users can delete their votes" ON idea_votes;

-- ============================================
-- 4. IDEA_COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS idea_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_idea_comments_idea ON idea_comments(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_comments_user ON idea_comments(user_id);

-- Disable RLS on idea_comments
ALTER TABLE idea_comments DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all comments" ON idea_comments;
DROP POLICY IF EXISTS "Users can create comments" ON idea_comments;
DROP POLICY IF EXISTS "Users can delete their comments" ON idea_comments;

-- ============================================
-- 5. CONNECTIONS TABLE (Already created)
-- ============================================
-- This should already exist from previous migration
-- Just ensure RLS policies are correct

DROP POLICY IF EXISTS "Users can view their connections" ON connections;
DROP POLICY IF EXISTS "Users can send connection requests" ON connections;
DROP POLICY IF EXISTS "Users can update received connection requests" ON connections;
DROP POLICY IF EXISTS "Users can delete sent connection requests" ON connections;

-- Disable RLS on connections
ALTER TABLE connections DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. PROJECTS TABLE - UPDATE COLUMNS
-- ============================================
DO $$ 
BEGIN
  -- Rename name to title if exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'name') THEN
    ALTER TABLE projects RENAME COLUMN name TO title;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'title') THEN
    ALTER TABLE projects ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled Project';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'category') THEN
    ALTER TABLE projects ADD COLUMN category TEXT NOT NULL DEFAULT 'Other';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'visibility') THEN
    ALTER TABLE projects ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'github_url') THEN
    ALTER TABLE projects ADD COLUMN github_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'demo_url') THEN
    ALTER TABLE projects ADD COLUMN demo_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'tags') THEN
    ALTER TABLE projects ADD COLUMN tags TEXT[];
  END IF;
END $$;

-- Disable RLS on projects
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. DISABLE RLS ON ALL SUPPORTING TABLES
-- ============================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. INCREMENT BUILDER COINS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION increment_builder_coins(user_id UUID, coins INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET builder_coins = builder_coins + coins
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify everything is set up:

-- Check ideas table columns
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ideas' ORDER BY ordinal_position;

-- Check idea_votes table
-- SELECT COUNT(*) FROM idea_votes;

-- Check idea_comments table
-- SELECT COUNT(*) FROM idea_comments;

-- Check profiles columns
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY ordinal_position;

-- Check RLS status (should all be disabled)
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
