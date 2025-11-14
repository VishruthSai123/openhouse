-- Add missing columns to ideas table
DO $$ 
BEGIN
  -- Add looking_for column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'looking_for') THEN
    ALTER TABLE ideas ADD COLUMN looking_for TEXT[];
  END IF;
  
  -- Add stage column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'stage') THEN
    ALTER TABLE ideas ADD COLUMN stage TEXT NOT NULL DEFAULT 'idea';
  END IF;
END $$;
