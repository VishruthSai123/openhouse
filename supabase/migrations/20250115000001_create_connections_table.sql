-- Create connections table for co-founder matching
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure users can't send multiple requests to the same person
  UNIQUE(sender_id, receiver_id),
  -- Ensure users can't send requests to themselves
  CHECK (sender_id != receiver_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_connections_sender ON connections(sender_id);
CREATE INDEX IF NOT EXISTS idx_connections_receiver ON connections(receiver_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

-- Enable RLS
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their connections" ON connections;
DROP POLICY IF EXISTS "Users can send connection requests" ON connections;
DROP POLICY IF EXISTS "Users can update received connection requests" ON connections;
DROP POLICY IF EXISTS "Users can delete sent connection requests" ON connections;

-- Policies for connections
-- Users can view connections they're involved in
CREATE POLICY "Users can view their connections"
  ON connections FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send connection requests
CREATE POLICY "Users can send connection requests"
  ON connections FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update connection requests they received
CREATE POLICY "Users can update received connection requests"
  ON connections FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Users can delete connection requests they sent
CREATE POLICY "Users can delete sent connection requests"
  ON connections FOR DELETE
  USING (auth.uid() = sender_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_connections_updated_at ON connections;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION update_connections_updated_at();
