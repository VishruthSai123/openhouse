-- Sync existing ideas to feed_posts and create triggers for future syncing
-- ========================================================================

-- First, copy all existing ideas to feed_posts
INSERT INTO feed_posts (author_id, post_type, title, content, idea_id, visibility, created_at, updated_at)
SELECT 
  user_id as author_id,
  'idea' as post_type,
  title,
  description as content,
  id as idea_id,
  'public' as visibility,
  created_at,
  updated_at
FROM ideas
ON CONFLICT DO NOTHING;

-- Function to automatically create feed post when idea is created
CREATE OR REPLACE FUNCTION sync_idea_to_feed()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new idea as feed post
  INSERT INTO feed_posts (author_id, post_type, title, content, idea_id, visibility, created_at, updated_at)
  VALUES (NEW.user_id, 'idea', NEW.title, NEW.description, NEW.id, 'public', NEW.created_at, NEW.updated_at);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update feed post when idea is updated
CREATE OR REPLACE FUNCTION update_idea_in_feed()
RETURNS TRIGGER AS $$
BEGIN
  -- Update corresponding feed post
  UPDATE feed_posts
  SET 
    title = NEW.title,
    content = NEW.description,
    updated_at = NEW.updated_at
  WHERE idea_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete feed post when idea is deleted
CREATE OR REPLACE FUNCTION delete_idea_from_feed()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete corresponding feed post
  DELETE FROM feed_posts WHERE idea_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic syncing
DROP TRIGGER IF EXISTS trigger_sync_idea_to_feed ON ideas;
CREATE TRIGGER trigger_sync_idea_to_feed
  AFTER INSERT ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION sync_idea_to_feed();

DROP TRIGGER IF EXISTS trigger_update_idea_in_feed ON ideas;
CREATE TRIGGER trigger_update_idea_in_feed
  AFTER UPDATE ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_idea_in_feed();

DROP TRIGGER IF EXISTS trigger_delete_idea_from_feed ON ideas;
CREATE TRIGGER trigger_delete_idea_from_feed
  BEFORE DELETE ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION delete_idea_from_feed();

-- Also sync project updates to feed
-- Function to create feed post when project is created
CREATE OR REPLACE FUNCTION sync_project_to_feed()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new project as feed post
  INSERT INTO feed_posts (author_id, post_type, title, content, project_id, tags, visibility, created_at, updated_at)
  VALUES (
    NEW.creator_id, 
    'project_update', 
    NEW.title, 
    NEW.description, 
    NEW.id, 
    NEW.tags, 
    NEW.visibility, 
    NEW.created_at, 
    NEW.updated_at
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update feed post when project is updated
CREATE OR REPLACE FUNCTION update_project_in_feed()
RETURNS TRIGGER AS $$
BEGIN
  -- Update corresponding feed post
  UPDATE feed_posts
  SET 
    title = NEW.title,
    content = NEW.description,
    tags = NEW.tags,
    visibility = NEW.visibility,
    updated_at = NEW.updated_at
  WHERE project_id = NEW.id AND post_type = 'project_update';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete feed post when project is deleted
CREATE OR REPLACE FUNCTION delete_project_from_feed()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete corresponding feed post
  DELETE FROM feed_posts WHERE project_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for project syncing
DROP TRIGGER IF EXISTS trigger_sync_project_to_feed ON projects;
CREATE TRIGGER trigger_sync_project_to_feed
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_to_feed();

DROP TRIGGER IF EXISTS trigger_update_project_in_feed ON projects;
CREATE TRIGGER trigger_update_project_in_feed
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_in_feed();

DROP TRIGGER IF EXISTS trigger_delete_project_from_feed ON projects;
CREATE TRIGGER trigger_delete_project_from_feed
  BEFORE DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION delete_project_from_feed();

-- Copy existing projects to feed_posts
INSERT INTO feed_posts (author_id, post_type, title, content, project_id, tags, visibility, created_at, updated_at)
SELECT 
  creator_id as author_id,
  'project_update' as post_type,
  title,
  description as content,
  id as project_id,
  tags,
  visibility,
  created_at,
  updated_at
FROM projects
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT EXECUTE ON FUNCTION sync_idea_to_feed() TO authenticated;
GRANT EXECUTE ON FUNCTION update_idea_in_feed() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_idea_from_feed() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_project_to_feed() TO authenticated;
GRANT EXECUTE ON FUNCTION update_project_in_feed() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_project_from_feed() TO authenticated;
