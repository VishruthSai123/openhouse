-- Create table for idea validator chat sessions
CREATE TABLE IF NOT EXISTS idea_validator_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  idea_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create table for chat messages
CREATE TABLE IF NOT EXISTS idea_validator_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES idea_validator_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  has_web_context BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES idea_validator_sessions(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON idea_validator_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON idea_validator_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON idea_validator_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON idea_validator_messages(created_at);

-- Enable Row Level Security
ALTER TABLE idea_validator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_validator_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessions
CREATE POLICY "Users can view their own sessions"
  ON idea_validator_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON idea_validator_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON idea_validator_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON idea_validator_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages from their sessions"
  ON idea_validator_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM idea_validator_sessions
      WHERE idea_validator_sessions.id = idea_validator_messages.session_id
      AND idea_validator_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their sessions"
  ON idea_validator_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM idea_validator_sessions
      WHERE idea_validator_sessions.id = idea_validator_messages.session_id
      AND idea_validator_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their sessions"
  ON idea_validator_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM idea_validator_sessions
      WHERE idea_validator_sessions.id = idea_validator_messages.session_id
      AND idea_validator_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from their sessions"
  ON idea_validator_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM idea_validator_sessions
      WHERE idea_validator_sessions.id = idea_validator_messages.session_id
      AND idea_validator_sessions.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE idea_validator_sessions
  SET updated_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update session timestamp when new message is added
CREATE TRIGGER update_session_timestamp
AFTER INSERT ON idea_validator_messages
FOR EACH ROW
EXECUTE FUNCTION update_session_updated_at();

-- Grant permissions
GRANT ALL ON idea_validator_sessions TO authenticated;
GRANT ALL ON idea_validator_messages TO authenticated;
