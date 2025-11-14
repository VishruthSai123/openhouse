-- Group Chat for Project Teams
-- Extends the existing chat system to support project-based group chats

-- Add conversation type to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversation_type VARCHAR(20) DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'group'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_avatar_url TEXT;

-- Create index for project conversations
CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);

-- Update RLS policies for group conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- Function to create or get project group chat
CREATE OR REPLACE FUNCTION get_or_create_project_chat(
  p_project_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
  v_project_name TEXT;
  v_creator_id UUID;
BEGIN
  -- Check if project group chat already exists
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE project_id = p_project_id
    AND conversation_type = 'group';

  -- If exists, return it
  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Get project details
  SELECT title, creator_id INTO v_project_name, v_creator_id
  FROM projects
  WHERE id = p_project_id;

  -- Create new group conversation
  INSERT INTO conversations (conversation_type, project_id, group_name, last_message_at)
  VALUES ('group', p_project_id, v_project_name || ' Team Chat', NOW())
  RETURNING id INTO v_conversation_id;

  -- Add project creator as participant
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (v_conversation_id, v_creator_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  -- Add all team members (from project_members) as participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  SELECT v_conversation_id, user_id
  FROM project_members
  WHERE project_id = p_project_id
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN v_conversation_id;
END;
$$;

-- Function to add team member to project chat when they join
CREATE OR REPLACE FUNCTION add_member_to_project_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Get project conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE project_id = NEW.project_id
    AND conversation_type = 'group';

  -- If conversation exists, add member
  IF v_conversation_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (v_conversation_id, NEW.user_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to auto-add team members to project chat
DROP TRIGGER IF EXISTS trigger_add_member_to_project_chat ON project_members;
CREATE TRIGGER trigger_add_member_to_project_chat
  AFTER INSERT ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION add_member_to_project_chat();

-- Function to remove team member from project chat when they leave
CREATE OR REPLACE FUNCTION remove_member_from_project_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Get project conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE project_id = OLD.project_id
    AND conversation_type = 'group';

  -- If conversation exists, remove member
  IF v_conversation_id IS NOT NULL THEN
    DELETE FROM conversation_participants
    WHERE conversation_id = v_conversation_id
      AND user_id = OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$;

-- Trigger to auto-remove team members from project chat
DROP TRIGGER IF EXISTS trigger_remove_member_from_project_chat ON project_members;
CREATE TRIGGER trigger_remove_member_from_project_chat
  AFTER DELETE ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION remove_member_from_project_chat();

-- Update get_unread_message_count to handle group chats
DROP FUNCTION IF EXISTS get_unread_message_count(UUID);
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT m.id) INTO v_count
  FROM messages m
  INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
  WHERE cp.user_id = p_user_id
    AND m.sender_id != p_user_id
    AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamp);

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Add RLS policy for group conversations
DROP POLICY IF EXISTS "Users can send messages to group conversations" ON messages;
CREATE POLICY "Users can send messages to group conversations" ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON COLUMN conversations.conversation_type IS 'Type of conversation: direct (1-on-1) or group (project team)';
COMMENT ON COLUMN conversations.project_id IS 'Reference to project for group chats';
COMMENT ON COLUMN conversations.group_name IS 'Name of the group chat';
COMMENT ON FUNCTION get_or_create_project_chat IS 'Creates or retrieves the group chat for a project team';
