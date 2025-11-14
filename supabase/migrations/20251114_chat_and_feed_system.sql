-- Chat and Messaging System for Connected Users
-- =============================================

-- 1. Conversations Table (stores chat conversations between connected users)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Conversation Participants Table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  is_archived BOOLEAN DEFAULT false,
  UNIQUE(conversation_id, user_id)
);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'link')),
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Message Reactions Table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reaction VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(message_id, user_id, reaction)
);

-- 5. Feed Posts Table (for home feed - ideas, thoughts, updates)
CREATE TABLE IF NOT EXISTS feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_type VARCHAR(30) NOT NULL CHECK (post_type IN ('idea', 'thought', 'team_hiring', 'opportunity', 'progress_update', 'project_update')),
  title TEXT,
  content TEXT NOT NULL,
  media_url TEXT,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  tags TEXT[],
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'connections', 'private')),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Feed Post Interactions (likes, saves, etc.)
CREATE TABLE IF NOT EXISTS feed_post_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES feed_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('upvote', 'save', 'share')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(post_id, user_id, interaction_type)
);

-- 7. Feed Post Comments
CREATE TABLE IF NOT EXISTS feed_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES feed_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES feed_post_comments(id) ON DELETE CASCADE,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. User Following System (for "Following" feed)
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_author ON feed_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_type ON feed_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_feed_post_interactions_post ON feed_post_interactions(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_post_interactions_user ON feed_post_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_post_comments_post ON feed_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- Row Level Security (RLS) Policies
-- ===================================

-- Conversations: Users can only see conversations they are part of
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations" ON conversations
  FOR SELECT
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Conversation Participants
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own participations" ON conversation_participants
  FOR SELECT
  USING (user_id = auth.uid() OR conversation_id IN (
    SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can join conversations" ON conversation_participants
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Messages: Users can only see messages in their conversations
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their conversations" ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE
  USING (sender_id = auth.uid());

-- Message Reactions
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions" ON message_reactions
  FOR SELECT
  USING (true);

CREATE POLICY "Users can add their own reactions" ON message_reactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own reactions" ON message_reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- Feed Posts
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public posts" ON feed_posts
  FOR SELECT
  USING (
    visibility = 'public' OR
    author_id = auth.uid() OR
    (visibility = 'connections' AND author_id IN (
      SELECT receiver_id FROM connections WHERE sender_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT sender_id FROM connections WHERE receiver_id = auth.uid() AND status = 'accepted'
    ))
  );

CREATE POLICY "Users can create their own posts" ON feed_posts
  FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update their own posts" ON feed_posts
  FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own posts" ON feed_posts
  FOR DELETE
  USING (author_id = auth.uid());

-- Feed Post Interactions
ALTER TABLE feed_post_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view interactions" ON feed_post_interactions
  FOR SELECT
  USING (true);

CREATE POLICY "Users can add their own interactions" ON feed_post_interactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own interactions" ON feed_post_interactions
  FOR DELETE
  USING (user_id = auth.uid());

-- Feed Post Comments
ALTER TABLE feed_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON feed_post_comments
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments" ON feed_post_comments
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own comments" ON feed_post_comments
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON feed_post_comments
  FOR DELETE
  USING (user_id = auth.uid());

-- User Follows
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows" ON user_follows
  FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others" ON user_follows
  FOR INSERT
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can unfollow others" ON user_follows
  FOR DELETE
  USING (follower_id = auth.uid());

-- Functions and Triggers
-- =======================

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Function to get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conversation_uuid UUID;
BEGIN
  -- Check if conversation already exists
  SELECT cp1.conversation_id INTO conversation_uuid
  FROM conversation_participants cp1
  INNER JOIN conversation_participants cp2 
    ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = user1_id 
    AND cp2.user_id = user2_id
    AND (
      SELECT COUNT(*) FROM conversation_participants 
      WHERE conversation_id = cp1.conversation_id
    ) = 2
  LIMIT 1;

  -- If not exists, create new conversation
  IF conversation_uuid IS NULL THEN
    INSERT INTO conversations DEFAULT VALUES
    RETURNING id INTO conversation_uuid;
    
    -- Add both participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (conversation_uuid, user1_id), (conversation_uuid, user2_id);
  END IF;

  RETURN conversation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(for_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM messages m
    INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
    WHERE cp.user_id = for_user_id
      AND m.sender_id != for_user_id
      AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamp)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count(UUID) TO authenticated;
