# SQL Migrations to Run Manually in Supabase

## Instructions
1. Go to your Supabase SQL Editor: https://supabase.com/dashboard/project/zprhdjcmutpnoxzrhkmb/sql/new
2. Copy each SQL block below and run them **in order**
3. Check for any errors after each run

---

## Migration 1: Connections Table (Co-Founder Matching)
**File**: `supabase/migrations/20250115000001_create_connections_table.sql`

```sql
-- Create connections table for co-founder matching
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(sender_id, receiver_id),
  CHECK (sender_id != receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_connections_sender ON connections(sender_id);
CREATE INDEX IF NOT EXISTS idx_connections_receiver ON connections(receiver_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their connections"
  ON connections FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send connection requests"
  ON connections FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received connection requests"
  ON connections FOR UPDATE
  USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete sent connection requests"
  ON connections FOR DELETE
  USING (auth.uid() = sender_id);

CREATE OR REPLACE FUNCTION update_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION update_connections_updated_at();
```

---

## Migration 2: Increment Builder Coins Function
**File**: `supabase/migrations/20250115000002_create_increment_function.sql`

```sql
CREATE OR REPLACE FUNCTION increment_builder_coins(user_id UUID, coins INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET builder_coins = builder_coins + coins
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Migration 3: Projects Tables (Build Spaces)
**File**: `supabase/migrations/20250115000003_create_projects_tables.sql`

This migration creates 4 tables: `projects`, `project_members`, `project_tasks`, `project_milestones`

Run the full content from the file `supabase/migrations/20250115000003_create_projects_tables.sql`

**Note**: If you already have a `projects` table, you'll need to either:
- Drop it first: `DROP TABLE IF EXISTS projects CASCADE;`
- Or modify the migration to use `ALTER TABLE` statements to add the new columns

The new projects table includes:
- `title`, `category`, `status`, `visibility`
- `github_url`, `demo_url`, `tags`
- Full RLS policies for team collaboration

---

## Verification Queries

After running all migrations, verify with these queries:

```sql
-- Check connections table
SELECT COUNT(*) as connection_count FROM connections;

-- Check projects table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects';

-- Test increment function
SELECT increment_builder_coins('YOUR_USER_ID_HERE'::uuid, 10);

-- Verify RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('connections', 'projects', 'project_members', 'project_tasks', 'project_milestones');
```

---

## Features Enabled After Running These Migrations

✅ **Co-Founder Matching**
   - Browse users with filters
   - Send/receive connection requests
   - Accept/reject requests
   - Award 5 Builder Coins on acceptance

✅ **Build Spaces (Projects)**
   - Create projects with full details
   - Add team members with roles (owner/admin/member)
   - Task management with assignments
   - Milestone tracking
   - Public/Private visibility

---

## Next Steps (Already Implemented in Code)

1. **Idea Hub**: ✅ Complete - Browse, Create, Detail pages with voting and comments
2. **Co-Founder Matching**: ✅ Complete - FindTeam page with requests system
3. **Build Spaces**: 🔄 Database ready - Need to create UI pages next

**Routes Available**:
- `/ideas` - Browse ideas
- `/ideas/new` - Post new idea
- `/ideas/:id` - View idea details
- `/find-team` - Find co-founders
- `/home` - Dashboard

