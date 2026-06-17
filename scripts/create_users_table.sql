-- Create a public users table for test and trading data
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure trading_trades can reference this table
-- First drop the old constraint if it exists
ALTER TABLE trading_trades
  DROP CONSTRAINT IF EXISTS trading_trades_user_id_fkey;

-- Add the new constraint
ALTER TABLE trading_trades
  ADD CONSTRAINT trading_trades_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);
