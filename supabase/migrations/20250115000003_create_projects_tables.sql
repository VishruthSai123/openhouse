-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  github_url TEXT,
  demo_url TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add missing columns to existing projects table if they don't exist
DO $$ 
BEGIN
  -- Add title column if it doesn't exist (rename name to title if needed)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'name') THEN
    ALTER TABLE projects RENAME COLUMN name TO title;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'title') THEN
    ALTER TABLE projects ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled Project';
  END IF;
  
  -- Add category column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'category') THEN
    ALTER TABLE projects ADD COLUMN category TEXT NOT NULL DEFAULT 'Other';
  END IF;
  
  -- Add visibility column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'visibility') THEN
    ALTER TABLE projects ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private'));
  END IF;
  
  -- Add github_url column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'github_url') THEN
    ALTER TABLE projects ADD COLUMN github_url TEXT;
  END IF;
  
  -- Add demo_url column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'demo_url') THEN
    ALTER TABLE projects ADD COLUMN demo_url TEXT;
  END IF;
  
  -- Add tags column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'tags') THEN
    ALTER TABLE projects ADD COLUMN tags TEXT[];
  END IF;
END $$;

-- Create project_members table
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique membership
  UNIQUE(project_id, user_id)
);

-- Create project_tasks table
CREATE TABLE IF NOT EXISTS project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create project_milestones table
CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date TIMESTAMPTZ,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_creator ON projects(creator_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned ON project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones(project_id);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view public projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Project creators and admins can update" ON projects;
DROP POLICY IF EXISTS "Project creators can delete" ON projects;

DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Project owners and admins can add members" ON project_members;
DROP POLICY IF EXISTS "Project owners and admins can update members" ON project_members;
DROP POLICY IF EXISTS "Users can leave projects" ON project_members;

DROP POLICY IF EXISTS "Project members can view tasks" ON project_tasks;
DROP POLICY IF EXISTS "Project members can create tasks" ON project_tasks;
DROP POLICY IF EXISTS "Project members can update tasks" ON project_tasks;
DROP POLICY IF EXISTS "Project owners and admins can delete tasks" ON project_tasks;

DROP POLICY IF EXISTS "Project members can view milestones" ON project_milestones;
DROP POLICY IF EXISTS "Project owners and admins can create milestones" ON project_milestones;
DROP POLICY IF EXISTS "Project owners and admins can update milestones" ON project_milestones;
DROP POLICY IF EXISTS "Project owners and admins can delete milestones" ON project_milestones;

-- RLS Policies for projects
-- Anyone can view public projects
CREATE POLICY "Anyone can view public projects"
  ON projects FOR SELECT
  USING (visibility = 'public' OR creator_id = auth.uid());

-- Users can create projects
CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Creators and admins can update projects
CREATE POLICY "Project creators and admins can update"
  ON projects FOR UPDATE
  USING (
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Creators can delete projects
CREATE POLICY "Project creators can delete"
  ON projects FOR DELETE
  USING (creator_id = auth.uid());

-- RLS Policies for project_members
-- Members can view their memberships
CREATE POLICY "Users can view project members"
  ON project_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_members.project_id
      AND (visibility = 'public' OR creator_id = auth.uid())
    ) OR
    user_id = auth.uid()
  );

-- Project owners and admins can add members
CREATE POLICY "Project owners and admins can add members"
  ON project_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id
      AND (
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = project_id
          AND pm.user_id = auth.uid()
          AND pm.role IN ('owner', 'admin')
        )
      )
    )
  );

-- Project owners and admins can update member roles
CREATE POLICY "Project owners and admins can update members"
  ON project_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id
      AND (
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = project_id
          AND pm.user_id = auth.uid()
          AND pm.role IN ('owner', 'admin')
        )
      )
    )
  );

-- Users can leave projects (delete their own membership)
CREATE POLICY "Users can leave projects"
  ON project_members FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for project_tasks
-- Project members can view tasks
CREATE POLICY "Project members can view tasks"
  ON project_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = project_tasks.project_id
      AND user_id = auth.uid()
    )
  );

-- Project members can create tasks
CREATE POLICY "Project members can create tasks"
  ON project_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = project_tasks.project_id
      AND user_id = auth.uid()
    )
  );

-- Project members can update tasks
CREATE POLICY "Project members can update tasks"
  ON project_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = project_tasks.project_id
      AND user_id = auth.uid()
    )
  );

-- Project owners and admins can delete tasks
CREATE POLICY "Project owners and admins can delete tasks"
  ON project_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = project_tasks.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for project_milestones
-- Project members can view milestones
CREATE POLICY "Project members can view milestones"
  ON project_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = project_milestones.project_id
      AND user_id = auth.uid()
    )
  );

-- Project owners and admins can manage milestones
CREATE POLICY "Project owners and admins can create milestones"
  ON project_milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    ) OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Project owners and admins can update milestones"
  ON project_milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    ) OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Project owners and admins can delete milestones"
  ON project_milestones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = project_milestones.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    ) OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_milestones.project_id AND creator_id = auth.uid()
    )
  );

-- Trigger functions for updated_at
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON project_tasks;

-- Triggers
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();
