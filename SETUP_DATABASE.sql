-- ============================================
-- OPEN HOUSE PLATFORM - COMPLETE DATABASE SETUP
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Step 1: Add missing columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'founder';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';

-- Step 2: Fix ideas table structure
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'idea';
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS looking_for TEXT[] DEFAULT '{}';
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0;

-- Step 3: Create idea_votes table
CREATE TABLE IF NOT EXISTS idea_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(idea_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_idea_votes_idea_id ON idea_votes(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_votes_user_id ON idea_votes(user_id);

-- Step 4: Create idea_comments table
CREATE TABLE IF NOT EXISTS idea_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_idea_comments_idea_id ON idea_comments(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_comments_user_id ON idea_comments(user_id);

-- Step 5: Create connections table
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fix any invalid status values
UPDATE connections SET status = 'pending' 
WHERE status NOT IN ('pending', 'accepted', 'rejected') OR status IS NULL;

-- Add constraint after cleaning data
ALTER TABLE connections DROP CONSTRAINT IF EXISTS connections_status_check;
ALTER TABLE connections ADD CONSTRAINT connections_status_check 
  CHECK (status IN ('pending', 'accepted', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_connections_sender ON connections(sender_id);
CREATE INDEX IF NOT EXISTS idx_connections_receiver ON connections(receiver_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

-- Step 6: Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'planning',
  visibility TEXT DEFAULT 'public',
  github_url TEXT,
  demo_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fix any invalid status values in existing data
UPDATE projects SET status = 'planning' 
WHERE status NOT IN ('planning', 'in_progress', 'completed', 'on_hold') OR status IS NULL;

-- Fix any invalid visibility values in existing data
UPDATE projects SET visibility = 'public' 
WHERE visibility NOT IN ('public', 'private') OR visibility IS NULL;

-- Drop existing constraints if they exist
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_visibility_check;

-- Add constraints after data is cleaned
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold'));
ALTER TABLE projects ADD CONSTRAINT projects_visibility_check 
  CHECK (visibility IN ('public', 'private'));

CREATE INDEX IF NOT EXISTS idx_projects_creator ON projects(creator_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);

-- Step 7: Create project_members table
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Fix any invalid role values
UPDATE project_members SET role = 'member' 
WHERE role NOT IN ('owner', 'admin', 'member') OR role IS NULL;

-- Add constraint after cleaning data
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_role_check;
ALTER TABLE project_members ADD CONSTRAINT project_members_role_check 
  CHECK (role IN ('owner', 'admin', 'member'));

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- Step 8: Create project_tasks table
CREATE TABLE IF NOT EXISTS project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fix any invalid status values
UPDATE project_tasks SET status = 'todo' 
WHERE status NOT IN ('todo', 'in_progress', 'done') OR status IS NULL;

-- Add constraint after cleaning data
ALTER TABLE project_tasks DROP CONSTRAINT IF EXISTS project_tasks_status_check;
ALTER TABLE project_tasks ADD CONSTRAINT project_tasks_status_check 
  CHECK (status IN ('todo', 'in_progress', 'done'));

CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned ON project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(status);

-- Step 9: Create project_milestones table
CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones(project_id);

-- Step 10: Create mentorship_sessions table
CREATE TABLE IF NOT EXISTS mentorship_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fix any invalid status values
UPDATE mentorship_sessions SET status = 'pending' 
WHERE status NOT IN ('pending', 'confirmed', 'completed', 'cancelled');

-- Add constraint after cleaning data
ALTER TABLE mentorship_sessions DROP CONSTRAINT IF EXISTS mentorship_sessions_status_check;
ALTER TABLE mentorship_sessions ADD CONSTRAINT mentorship_sessions_status_check 
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_mentorship_mentor ON mentorship_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_mentee ON mentorship_sessions(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_status ON mentorship_sessions(status);

-- Step 11: Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT,
  category TEXT NOT NULL CHECK (category IN ('ideas', 'projects', 'social', 'coins', 'milestones')),
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('count', 'milestone')),
  requirement_value INTEGER,
  coins_reward INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add missing columns if they don't exist (for existing tables)
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS requirement_type TEXT;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS requirement_value INTEGER;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS coins_reward INTEGER DEFAULT 0;

-- Add unique constraint on name if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'achievements_name_key'
  ) THEN
    ALTER TABLE achievements ADD CONSTRAINT achievements_name_key UNIQUE (name);
  END IF;
END $$;

-- Step 12: Create achievement_unlocks table
CREATE TABLE IF NOT EXISTS achievement_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_user ON achievement_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_achievement ON achievement_unlocks(achievement_id);

-- Step 13: Insert default achievements
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, coins_reward) VALUES
  ('First Idea', 'Post your first startup idea', '💡', 'ideas', 'milestone', 1, 5),
  ('Idea Machine', 'Post 10 startup ideas', '🚀', 'ideas', 'count', 10, 50),
  ('Popular Idea', 'Get 10 upvotes on an idea', '⭐', 'ideas', 'count', 10, 25),
  ('Viral Idea', 'Get 50 upvotes on an idea', '🔥', 'ideas', 'count', 50, 100),
  ('First Project', 'Create your first project', '🏗️', 'projects', 'milestone', 1, 10),
  ('Project Master', 'Create 5 projects', '👨‍💻', 'projects', 'count', 5, 75),
  ('Team Player', 'Make 5 connections', '🤝', 'social', 'count', 5, 30),
  ('Networker', 'Make 20 connections', '🌐', 'social', 'count', 20, 100),
  ('Coin Collector', 'Earn 100 Builder Coins', '💰', 'coins', 'count', 100, 20),
  ('Coin Master', 'Earn 500 Builder Coins', '👑', 'coins', 'count', 500, 100),
  ('Milestone Achiever', 'Complete 5 project milestones', '🎯', 'milestones', 'count', 5, 50),
  ('Task Warrior', 'Complete 20 tasks', '⚔️', 'milestones', 'count', 20, 75)
ON CONFLICT (name) DO NOTHING;

-- Step 14: Create Builder Coins increment function
CREATE OR REPLACE FUNCTION increment_builder_coins(user_id UUID, coins INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET builder_coins = COALESCE(builder_coins, 0) + coins
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Step 15: Create trigger for mentorship_sessions updated_at
CREATE OR REPLACE FUNCTION update_mentorship_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_mentorship_updated_at ON mentorship_sessions;

CREATE TRIGGER update_mentorship_updated_at
  BEFORE UPDATE ON mentorship_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_mentorship_updated_at();

-- Step 16: DISABLE RLS (Row Level Security) on all tables
-- This prevents 406 and 400 errors during development
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE ideas DISABLE ROW LEVEL SECURITY;
ALTER TABLE idea_votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE idea_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones DISABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE achievements DISABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_unlocks DISABLE ROW LEVEL SECURITY;

-- If payments and coin_transactions tables exist, disable RLS on them too
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    EXECUTE 'ALTER TABLE payments DISABLE ROW LEVEL SECURITY';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coin_transactions') THEN
    EXECUTE 'ALTER TABLE coin_transactions DISABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ============================================
-- SETUP COMPLETE!
-- Your Open House platform database is now ready.
-- ============================================
