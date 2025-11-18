-- Add support for jobs and discussions in ideas table
-- Extend the ideas table to support multiple post types

-- Add post_type column to ideas table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'post_type') THEN
    ALTER TABLE ideas ADD COLUMN post_type TEXT DEFAULT 'idea' CHECK (post_type IN ('idea', 'job_posting', 'job_request', 'discussion'));
  END IF;
END $$;

-- Add job-specific fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'job_type') THEN
    ALTER TABLE ideas ADD COLUMN job_type TEXT CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship', 'freelance'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'location') THEN
    ALTER TABLE ideas ADD COLUMN location TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'salary_range') THEN
    ALTER TABLE ideas ADD COLUMN salary_range TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'skills_required') THEN
    ALTER TABLE ideas ADD COLUMN skills_required TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'is_remote') THEN
    ALTER TABLE ideas ADD COLUMN is_remote BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'company_name') THEN
    ALTER TABLE ideas ADD COLUMN company_name TEXT;
  END IF;
END $$;

-- Create index on post_type for faster queries
CREATE INDEX IF NOT EXISTS idx_ideas_post_type ON ideas(post_type);
CREATE INDEX IF NOT EXISTS idx_ideas_job_type ON ideas(job_type) WHERE post_type IN ('job_posting', 'job_request');

-- Update feed_posts to include post_type if column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feed_posts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feed_posts' AND column_name = 'post_type') THEN
      ALTER TABLE feed_posts ADD COLUMN post_type TEXT DEFAULT 'idea';
    END IF;
  END IF;
END $$;

COMMENT ON COLUMN ideas.post_type IS 'Type of post: idea, job_posting, job_request, or discussion';
COMMENT ON COLUMN ideas.job_type IS 'Employment type for job posts';
COMMENT ON COLUMN ideas.location IS 'Job location or remote work info';
COMMENT ON COLUMN ideas.salary_range IS 'Salary range for job postings';
COMMENT ON COLUMN ideas.skills_required IS 'Required skills for jobs';
COMMENT ON COLUMN ideas.is_remote IS 'Whether job is remote';
COMMENT ON COLUMN ideas.company_name IS 'Company name for job postings';
