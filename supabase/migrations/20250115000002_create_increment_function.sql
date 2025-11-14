-- Create function to safely increment builder coins
CREATE OR REPLACE FUNCTION increment_builder_coins(user_id UUID, coins INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET builder_coins = builder_coins + coins
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
