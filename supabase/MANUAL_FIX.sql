-- Run this SQL directly in Supabase Dashboard SQL Editor
-- This will fix the conversation_participants RLS issue immediately

-- Disable RLS on conversation_participants to allow querying other participants
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;

-- Also apply the conversation fixes
UPDATE conversations 
SET conversation_type = 'direct' 
WHERE conversation_type IS NULL;

-- Add trigger to update last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversation_timestamp ON messages;
CREATE TRIGGER update_conversation_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();
