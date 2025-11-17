-- Sync Google OAuth avatar URLs for existing users
-- This updates profiles for users who signed up before avatar sync was implemented

DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all users with Google OAuth provider
  FOR user_record IN 
    SELECT 
      au.id,
      au.raw_user_meta_data->>'avatar_url' as google_avatar,
      au.raw_user_meta_data->>'picture' as google_picture
    FROM auth.users au
    WHERE au.raw_user_meta_data->>'provider' = 'google'
       OR au.raw_user_meta_data->>'iss' LIKE '%accounts.google.com%'
  LOOP
    -- Update profile with Google avatar if not already set
    UPDATE public.profiles
    SET avatar_url = COALESCE(
      user_record.google_avatar,
      user_record.google_picture
    )
    WHERE id = user_record.id
      AND (avatar_url IS NULL OR avatar_url = '');
      
    RAISE NOTICE 'Updated avatar for user: %', user_record.id;
  END LOOP;
END $$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Google avatar sync completed successfully';
END $$;
