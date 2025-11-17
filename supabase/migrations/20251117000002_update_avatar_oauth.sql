-- Update handle_new_user function to include avatar_url from Google OAuth
-- This ensures Google profile pictures are automatically saved

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
  );
  RETURN NEW;
END;
$$;

-- Note: This function is triggered automatically when a new user signs up
-- For Google OAuth users, avatar_url will be populated from their Google profile picture
-- For email/password users, avatar_url will be NULL and initials will be shown instead
