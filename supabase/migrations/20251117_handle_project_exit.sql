-- Function to remove user from project group chat when they leave the team
CREATE OR REPLACE FUNCTION remove_from_project_chat()
RETURNS TRIGGER AS $$
DECLARE
  project_conversation_id UUID;
BEGIN
  -- Find the conversation for this project
  SELECT id INTO project_conversation_id
  FROM conversations
  WHERE project_id = OLD.project_id
  AND conversation_type = 'group';

  -- If a conversation exists, remove the user from participants
  IF project_conversation_id IS NOT NULL THEN
    DELETE FROM conversation_participants
    WHERE conversation_id = project_conversation_id
    AND user_id = OLD.user_id;
    
    RAISE LOG 'Removed user % from project chat %', OLD.user_id, project_conversation_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to remove users from project chat when they leave the team
DROP TRIGGER IF EXISTS on_project_member_removed ON project_members;
CREATE TRIGGER on_project_member_removed
  AFTER DELETE ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION remove_from_project_chat();

-- Function to add user to project group chat when they join the team
CREATE OR REPLACE FUNCTION add_to_project_chat()
RETURNS TRIGGER AS $$
DECLARE
  project_conversation_id UUID;
BEGIN
  -- Find the conversation for this project
  SELECT id INTO project_conversation_id
  FROM conversations
  WHERE project_id = NEW.project_id
  AND conversation_type = 'group';

  -- If a conversation exists, add the user to participants
  IF project_conversation_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (project_conversation_id, NEW.user_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
    
    RAISE LOG 'Added user % to project chat %', NEW.user_id, project_conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add users to project chat when they join the team
DROP TRIGGER IF EXISTS on_project_member_added ON project_members;
CREATE TRIGGER on_project_member_added
  AFTER INSERT ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION add_to_project_chat();

-- Update the get_or_create_project_chat function to add all team members
CREATE OR REPLACE FUNCTION get_or_create_project_chat(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_project_name TEXT;
BEGIN
  -- Get project name
  SELECT title INTO v_project_name
  FROM projects
  WHERE id = p_project_id;

  -- Check if conversation exists
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE project_id = p_project_id
  AND conversation_type = 'group';

  -- Create conversation if it doesn't exist
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (conversation_type, group_name, project_id)
    VALUES ('group', v_project_name || ' Team', p_project_id)
    RETURNING id INTO v_conversation_id;

    -- Add project owner to participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    SELECT v_conversation_id, creator_id
    FROM projects
    WHERE id = p_project_id
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

    -- Add all team members to participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    SELECT v_conversation_id, user_id
    FROM project_members
    WHERE project_id = p_project_id
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  ELSE
    -- Conversation exists, ensure the requesting user is a participant
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (v_conversation_id, p_user_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
