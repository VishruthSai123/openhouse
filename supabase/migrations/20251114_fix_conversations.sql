-- Fix conversations and messages system
-- This migration ensures conversations persist properly and display correct user information

-- Update existing conversations to have conversation_type if NULL
UPDATE conversations 
SET conversation_type = 'direct' 
WHERE conversation_type IS NULL;

-- Make sure last_message_at gets updated when messages are sent
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_conversation_timestamp ON messages;
CREATE TRIGGER update_conversation_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Update get_or_create_conversation to ensure conversation_type is set
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conversation_uuid UUID;
  existing_conv_id UUID;
BEGIN
  -- Check if conversation already exists between these two users
  SELECT cp1.conversation_id INTO existing_conv_id
  FROM conversation_participants cp1
  INNER JOIN conversation_participants cp2 
    ON cp1.conversation_id = cp2.conversation_id
  INNER JOIN conversations c
    ON c.id = cp1.conversation_id
  WHERE cp1.user_id = user1_id 
    AND cp2.user_id = user2_id
    AND (c.conversation_type = 'direct' OR c.conversation_type IS NULL)
    AND (
      SELECT COUNT(*) FROM conversation_participants 
      WHERE conversation_id = cp1.conversation_id
    ) = 2
  LIMIT 1;

  -- If exists, return it
  IF existing_conv_id IS NOT NULL THEN
    -- Update conversation type if NULL
    UPDATE conversations 
    SET conversation_type = 'direct' 
    WHERE id = existing_conv_id AND conversation_type IS NULL;
    
    RETURN existing_conv_id;
  END IF;

  -- If not exists, create new conversation
  INSERT INTO conversations (conversation_type, last_message_at)
  VALUES ('direct', NOW())
  RETURNING id INTO conversation_uuid;
  
  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id, last_read_at)
  VALUES 
    (conversation_uuid, user1_id, NOW()),
    (conversation_uuid, user2_id, NOW());

  RETURN conversation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_or_create_project_chat to ensure proper setup
CREATE OR REPLACE FUNCTION get_or_create_project_chat(p_project_id UUID)
RETURNS UUID AS $$
DECLARE
  conversation_uuid UUID;
  project_name TEXT;
BEGIN
  -- Check if group conversation exists for this project
  SELECT id INTO conversation_uuid
  FROM conversations
  WHERE project_id = p_project_id 
    AND conversation_type = 'group'
  LIMIT 1;

  -- If exists, return it
  IF conversation_uuid IS NOT NULL THEN
    RETURN conversation_uuid;
  END IF;

  -- Get project name for group name
  SELECT title INTO project_name
  FROM projects
  WHERE id = p_project_id;

  -- Create new group conversation
  INSERT INTO conversations (conversation_type, project_id, group_name, last_message_at)
  VALUES ('group', p_project_id, project_name || ' Team Chat', NOW())
  RETURNING id INTO conversation_uuid;

  -- Add all project members as participants
  INSERT INTO conversation_participants (conversation_id, user_id, last_read_at)
  SELECT conversation_uuid, user_id, NOW()
  FROM project_members
  WHERE project_id = p_project_id;

  RETURN conversation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id, conversation_id);

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_project_chat(UUID) TO authenticated;
