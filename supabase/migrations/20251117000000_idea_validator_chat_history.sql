-- Create idea validator sessions table (if not exists)
CREATE TABLE IF NOT EXISTS public.idea_validator_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  idea_summary TEXT,
  conversation_context TEXT, -- Store AI conversation summary for context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add conversation_context column if table already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'idea_validator_sessions' 
    AND column_name = 'conversation_context'
  ) THEN
    ALTER TABLE public.idea_validator_sessions 
    ADD COLUMN conversation_context TEXT;
  END IF;
END $$;

-- Create idea validator messages table (if not exists)
CREATE TABLE IF NOT EXISTS public.idea_validator_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.idea_validator_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  has_web_context BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_validator_sessions_user_id ON public.idea_validator_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_validator_sessions_updated_at ON public.idea_validator_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_validator_messages_session_id ON public.idea_validator_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_validator_messages_created_at ON public.idea_validator_messages(created_at);

-- Enable RLS
ALTER TABLE public.idea_validator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_validator_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'idea_validator_sessions' 
    AND policyname = 'Users can view own validator sessions'
  ) THEN
    CREATE POLICY "Users can view own validator sessions"
    ON public.idea_validator_sessions
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'idea_validator_sessions' 
    AND policyname = 'Users can create own validator sessions'
  ) THEN
    CREATE POLICY "Users can create own validator sessions"
    ON public.idea_validator_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'idea_validator_sessions' 
    AND policyname = 'Users can update own validator sessions'
  ) THEN
    CREATE POLICY "Users can update own validator sessions"
    ON public.idea_validator_sessions
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'idea_validator_sessions' 
    AND policyname = 'Users can delete own validator sessions'
  ) THEN
    CREATE POLICY "Users can delete own validator sessions"
    ON public.idea_validator_sessions
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS Policies for messages
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'idea_validator_messages' 
    AND policyname = 'Users can view messages from own sessions'
  ) THEN
    CREATE POLICY "Users can view messages from own sessions"
    ON public.idea_validator_messages
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.idea_validator_sessions
        WHERE id = session_id AND user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'idea_validator_messages' 
    AND policyname = 'Users can create messages in own sessions'
  ) THEN
    CREATE POLICY "Users can create messages in own sessions"
    ON public.idea_validator_messages
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.idea_validator_sessions
        WHERE id = session_id AND user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'idea_validator_messages' 
    AND policyname = 'Users can delete messages from own sessions'
  ) THEN
    CREATE POLICY "Users can delete messages from own sessions"
    ON public.idea_validator_messages
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.idea_validator_sessions
        WHERE id = session_id AND user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Trigger to update updated_at on session changes
DROP TRIGGER IF EXISTS on_validator_session_updated ON public.idea_validator_sessions;
CREATE TRIGGER on_validator_session_updated
  BEFORE UPDATE ON public.idea_validator_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to update session timestamp when messages are added
CREATE OR REPLACE FUNCTION public.update_validator_session_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.idea_validator_sessions
  SET updated_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

-- Trigger to update session timestamp on new messages
DROP TRIGGER IF EXISTS on_validator_message_created ON public.idea_validator_messages;
CREATE TRIGGER on_validator_message_created
  AFTER INSERT ON public.idea_validator_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_validator_session_timestamp();
