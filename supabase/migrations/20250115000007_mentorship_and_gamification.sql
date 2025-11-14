-- Mentorship System Tables
CREATE TABLE IF NOT EXISTS mentorship_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentorship_mentor ON mentorship_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_mentee ON mentorship_sessions(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_status ON mentorship_sessions(status);

-- Disable RLS
ALTER TABLE mentorship_sessions DISABLE ROW LEVEL SECURITY;

-- Gamification Tables
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

CREATE TABLE IF NOT EXISTS achievement_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_user ON achievement_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_achievement ON achievement_unlocks(achievement_id);

-- Disable RLS
ALTER TABLE achievements DISABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_unlocks DISABLE ROW LEVEL SECURITY;

-- Insert default achievements
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

-- Trigger for mentorship_sessions updated_at
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
