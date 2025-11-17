# 👤 Profile System - Complete Setup Guide

## Overview
The profile system creates public profile pages for all users, similar to Facebook/Instagram profiles. Each profile displays:
- Profile picture (Google OAuth avatar or letter initials)
- Full name, bio, role, and skills
- Connections count
- Builder Score (coins) and Leaderboard Rank
- All public posts by the user
- All public projects (only shows public projects, hides private ones)
- Connect and Message buttons

## 🗄️ Database Setup

### Step 1: Run the SQL Migration

**Run this in Supabase SQL Editor:**

```sql
-- Copy and paste the entire content from:
supabase/migrations/20251117000001_profile_system.sql
```

This creates:
1. **`public_profile_stats` view** - Aggregates profile data with connections count and rank
2. **`get_user_posts()` function** - Returns all posts by a user
3. **`get_user_public_projects()` function** - Returns only public projects where user is creator or member
4. **Indexes** - For better performance

### Step 2: Disable RLS (Development)

The migration automatically disables RLS. If you need to verify:

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'feed_posts', 'projects');

-- Should show rowsecurity = false for all
```

### Step 3: Verify the Setup

Test the functions:

```sql
-- Test profile stats (replace with actual user ID)
SELECT * FROM profiles WHERE id = 'YOUR_USER_ID';

-- Test get user posts
SELECT * FROM get_user_posts('YOUR_USER_ID'::uuid);

-- Test get user projects
SELECT * FROM get_user_public_projects('YOUR_USER_ID'::uuid);
```

## 📱 Profile Features

### Profile Information Display

**For Google OAuth users:**
- Avatar automatically fetched from Google account
- Full name from Google profile

**For Email/Password users:**
- Avatar shows first letter(s) of name in colored circle
- Full name from registration/onboarding

### Profile Stats

1. **Connections Count** - Number of accepted connections
2. **Builder Score** - Total builder coins earned
3. **Leaderboard Rank** - Position based on builder coins

### Profile Actions

**For other users viewing:**
- ✅ **Connect** button (if not connected)
- ✅ **Request Sent** (if pending)
- ✅ **Message** button (if connected)

**For own profile:**
- ✅ **Edit Profile** button
  - Edit full name
  - Edit bio
  - Edit skills (comma separated)

### Posts Tab

Shows all posts created by the user:
- Post title and content
- Upvotes and comments count
- Tags
- Click to view full post detail

### Projects Tab

Shows only **PUBLIC** projects:
- ✅ Projects created by the user (if public)
- ✅ Projects where user is a member (if public)
- ❌ Private projects are HIDDEN (even if user is member)
- Shows role badge (Creator/Member/Admin)
- Links to GitHub and Demo URLs

## 🔗 Profile Links

Profiles are accessible at: `/profile/:userId`

### Where Profiles are Linked

1. **Feed Posts**
   - Click on user's name
   - Click on user's avatar
   
2. **Post Detail Page**
   - Click on author name
   - Click on author avatar
   - Click on comment author names/avatars

3. **All other pages** (you can add):
   - Projects page (team members)
   - Find Team page
   - Connections page
   - Messages page

## 🎨 UI Components Used

- **Card** - Main profile container
- **Avatar** - Profile picture with fallback initials
- **Badge** - Role, category, status tags
- **Tabs** - Posts and Projects sections
- **Dialog** - Edit profile modal
- **Button** - Connect, Message, Edit actions

## 🔧 Edit Profile

Users can edit their own profile by clicking the "Edit Profile" button:

**Editable Fields:**
- Full Name
- Bio (multiline text)
- Skills (comma separated list)

**Non-editable:**
- Avatar (auto-generated based on auth method)
- Email
- Role (set during onboarding)
- Builder Coins
- Connections

## 📊 Privacy & Visibility

### What's Public:
- ✅ Full name
- ✅ Avatar
- ✅ Bio
- ✅ Role and Skills
- ✅ Builder Score and Rank
- ✅ Connections count
- ✅ All feed posts
- ✅ Public projects only

### What's Private:
- ❌ Email address
- ❌ Private projects (completely hidden)
- ❌ Payment information
- ❌ Private messages

## 🚀 Usage Examples

### Navigating to a Profile

```typescript
// From any component
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// Navigate to user's profile
navigate(`/profile/${userId}`);
```

### Making Names Clickable

```tsx
<p 
  className="font-medium cursor-pointer hover:underline"
  onClick={(e) => {
    e.stopPropagation();
    navigate(`/profile/${userId}`);
  }}
>
  {userName}
</p>
```

### Making Avatars Clickable

```tsx
<Avatar 
  className="w-10 h-10 cursor-pointer"
  onClick={(e) => {
    e.stopPropagation();
    navigate(`/profile/${userId}`);
  }}
>
  <AvatarFallback>{initials}</AvatarFallback>
</Avatar>
```

## 🔍 Testing Checklist

- [ ] Profile loads correctly with all stats
- [ ] Own profile shows "Edit Profile" button
- [ ] Other profiles show "Connect" button
- [ ] Connected profiles show "Message" button
- [ ] Posts tab shows all user posts
- [ ] Projects tab shows ONLY public projects
- [ ] Private projects are NOT visible
- [ ] Clicking names/avatars navigates to profile
- [ ] Edit profile updates successfully
- [ ] Avatar shows Google image for OAuth users
- [ ] Avatar shows initials for email users

## 📝 Files Modified/Created

### Created:
1. `src/pages/Profile.tsx` - Main profile page component
2. `supabase/migrations/20251117000001_profile_system.sql` - Database migration
3. `PROFILE_SYSTEM_SETUP.md` - This documentation

### Modified:
1. `src/App.tsx` - Added profile route
2. `src/pages/Feed.tsx` - Made names/avatars clickable
3. `src/pages/PostDetail.tsx` - Made names/avatars clickable

## 🎯 Next Steps

### Add Profile Links to Other Pages:

1. **Projects Page** - Team members list
2. **Find Team Page** - User cards
3. **Connections Page** - Connection cards
4. **Messages Page** - Conversation participants
5. **Leaderboard** - Ranked users

### Example Implementation:

```tsx
// In any component showing user information
<div 
  className="cursor-pointer hover:bg-muted/50 p-2 rounded"
  onClick={() => navigate(`/profile/${user.id}`)}
>
  <Avatar className="w-8 h-8">
    <AvatarFallback>{user.initials}</AvatarFallback>
  </Avatar>
  <p className="font-medium">{user.full_name}</p>
</div>
```

## 🆘 Troubleshooting

### Profile not loading
- Check if user ID exists in profiles table
- Verify SQL migration ran successfully
- Check browser console for errors

### Posts not showing
- Verify `feed_posts` table has data
- Check `author_id` matches user ID
- Ensure posts exist for that user

### Projects not showing
- Only PUBLIC projects are shown
- Verify project `visibility` is 'public'
- Check `project_members` table for membership

### Avatar not showing
- For Google OAuth: Check `avatar_url` in profiles table
- For email users: Shows first letter(s) of name automatically
- Verify `full_name` exists in profiles table

## ✅ Done!

The profile system is now complete and ready to use! Users can:
- View any user's public profile
- Edit their own profile
- Connect and message other users
- See all posts and public projects
- Navigate to profiles from anywhere in the app

---

**Questions or issues?** Check the browser console and Supabase logs for debugging information.
