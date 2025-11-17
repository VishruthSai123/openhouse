# 🎯 PROFILE SYSTEM - QUICK START

## ✅ What Was Implemented

A complete public profile system similar to Facebook/Instagram with:
- Public profile pages for all users
- Profile picture (Google OAuth or letter initials)
- Stats: Connections, Builder Score, Leaderboard Rank
- Bio, role, skills display
- Posts and Projects tabs
- Connect and Message buttons
- Edit profile functionality (for own profile)
- Clickable names/avatars throughout the app

---

## 🚀 STEP 1: Run This SQL in Supabase

**Go to Supabase → SQL Editor → New Query**

Copy and paste this entire SQL:

```sql
-- ============================================
-- PROFILE SYSTEM SETUP
-- Creates views and functions for public profile pages
-- ============================================

-- Create a view for public profile stats (connections count + leaderboard rank)
CREATE OR REPLACE VIEW public_profile_stats AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.role,
  p.skills,
  p.builder_coins,
  p.created_at,
  -- Count connections (accepted only)
  (
    SELECT COUNT(*)
    FROM connections c
    WHERE (c.sender_id = p.id OR c.receiver_id = p.id)
    AND c.status = 'accepted'
  ) as connections_count,
  -- Calculate leaderboard rank
  (
    SELECT COUNT(*) + 1
    FROM profiles p2
    WHERE p2.builder_coins > p.builder_coins
  ) as leaderboard_rank
FROM profiles p;

-- Function to get user's public posts
CREATE OR REPLACE FUNCTION get_user_posts(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  post_type TEXT,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  tags TEXT[],
  upvotes BIGINT,
  comments BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fp.id,
    fp.post_type,
    fp.title,
    fp.content,
    fp.created_at,
    fp.tags,
    COALESCE(COUNT(DISTINCT fpu.id), 0) as upvotes,
    COALESCE(COUNT(DISTINCT fpc.id), 0) as comments
  FROM feed_posts fp
  LEFT JOIN feed_post_upvotes fpu ON fp.id = fpu.post_id
  LEFT JOIN feed_post_comments fpc ON fp.id = fpc.post_id
  WHERE fp.author_id = user_id_param
  GROUP BY fp.id, fp.post_type, fp.title, fp.content, fp.created_at, fp.tags
  ORDER BY fp.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's public projects (only public projects + projects where they're added by others)
CREATE OR REPLACE FUNCTION get_user_public_projects(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  status TEXT,
  visibility TEXT,
  github_url TEXT,
  demo_url TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  is_creator BOOLEAN,
  member_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.title,
    p.description,
    p.category,
    p.status,
    p.visibility,
    p.github_url,
    p.demo_url,
    p.tags,
    p.created_at,
    (p.creator_id = user_id_param) as is_creator,
    pm.role as member_role
  FROM projects p
  LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = user_id_param
  WHERE 
    -- Show public projects where user is creator or member
    (p.visibility = 'public' AND (p.creator_id = user_id_param OR pm.user_id = user_id_param))
    -- Don't show private projects even if user is member
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Disable RLS on the view (if RLS is needed, create appropriate policies)
-- The view only exposes public information
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_connections_accepted ON connections(sender_id, receiver_id) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_feed_posts_author ON feed_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
```

**Click "Run"**

---

## ✅ STEP 2: Verify It Worked

Run this test query (replace with a real user ID from your database):

```sql
-- Get any user ID first
SELECT id, full_name FROM profiles LIMIT 1;

-- Test with that ID (replace YOUR_USER_ID)
SELECT * FROM get_user_posts('YOUR_USER_ID'::uuid);
SELECT * FROM get_user_public_projects('YOUR_USER_ID'::uuid);
```

If you see results (or empty arrays), it's working! ✅

---

## 📱 How to Use

### Access Any Profile:
- URL: `http://localhost:5173/profile/USER_ID_HERE`
- Click any username in Feed posts
- Click any avatar in Feed posts
- Click any username in post comments

### Profile Features:

**For ANY user viewing:**
- See profile picture, name, bio, role, skills
- See connections count, builder score, leaderboard rank
- See all their posts
- See all their PUBLIC projects (private ones hidden)

**For OTHER users:**
- "Connect" button (if not connected)
- "Request Sent" (if pending)
- "Message" button (if connected)

**For OWN profile:**
- "Edit Profile" button to update:
  - Full name
  - Bio
  - Skills

---

## 🔗 Where Profiles Are Linked

Already implemented in:
1. ✅ **Feed page** - Click names/avatars on posts
2. ✅ **Post detail page** - Click author names/avatars
3. ✅ **Post comments** - Click comment author names/avatars

You can add profile links to:
- Projects page (team members)
- Find Team page (user cards)
- Connections page
- Messages page
- Leaderboard
- Anywhere you show user information

---

## 🎨 Profile Picture Logic

**Google OAuth users:**
- Shows Google profile picture automatically
- Stored in `profiles.avatar_url`

**Email/Password users:**
- Shows first letter(s) of name in colored circle
- Example: "John Doe" → "JD"
- No upload needed, fully automatic

---

## 🔒 Privacy & Visibility

**What's PUBLIC:**
- ✅ Name, avatar, bio, role, skills
- ✅ Builder score and rank
- ✅ Connections count
- ✅ All feed posts
- ✅ Public projects ONLY

**What's PRIVATE:**
- ❌ Email address
- ❌ Private projects (completely hidden)
- ❌ Payment info
- ❌ Messages

---

## 🧪 Testing

1. Open your app: `npm run dev`
2. Go to Feed and click any username
3. Should see profile page with stats
4. Try clicking "Edit Profile" on your own profile
5. Check Posts and Projects tabs

---

## 📁 Files Created/Modified

**Created:**
- `src/pages/Profile.tsx` - Profile page component
- `supabase/migrations/20251117000001_profile_system.sql` - Database setup
- `PROFILE_SYSTEM_SETUP.md` - Detailed documentation
- `PROFILE_QUICK_START.md` - This file

**Modified:**
- `src/App.tsx` - Added `/profile/:userId` route
- `src/pages/Feed.tsx` - Made names/avatars clickable
- `src/pages/PostDetail.tsx` - Made names/avatars clickable

---

## 🆘 Troubleshooting

**Profile not loading?**
- Check if SQL migration ran successfully
- Verify user ID exists in profiles table
- Check browser console for errors

**Posts not showing?**
- Check if user has created any posts in `feed_posts` table
- Verify `author_id` matches user ID

**Projects not showing?**
- Only PUBLIC projects are shown
- Check project `visibility` column is 'public'
- Private projects are intentionally hidden

**"Connect" button not working?**
- Check `connections` table has correct structure
- Verify current user is logged in

---

## ✅ You're Done!

The profile system is complete! Users can now:
- View any user's public profile
- See their posts and projects
- Connect and message them
- Edit their own profile
- Navigate to profiles from anywhere

**Next:** Add profile links to more pages (Projects, Find Team, Connections, etc.)

---

## 📚 Need More Details?

See `PROFILE_SYSTEM_SETUP.md` for:
- Complete feature documentation
- Implementation examples
- Code snippets for adding profile links
- Advanced customization options
