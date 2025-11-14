-- Enable RLS on payments table (if not already enabled)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON payments;

-- Allow users to insert their own payment records
CREATE POLICY "Users can insert their own payments"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own payment records
CREATE POLICY "Users can view their own payments"
ON payments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own payment records (for status updates)
CREATE POLICY "Users can update their own payments"
ON payments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON payments TO authenticated;
