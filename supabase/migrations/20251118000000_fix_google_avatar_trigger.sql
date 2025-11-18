-- Fix Google OAuth avatar synchronization for new users
-- Drop and recreate the trigger to use the updated handle_new_user function

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the handle_new_user function with avatar_url support
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Sync existing Google OAuth users' avatars
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
  END LOOP;
END $$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates profile for new users and syncs Google OAuth avatar';
