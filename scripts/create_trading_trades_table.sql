-- Create trading_trades table for user-based trade storage
CREATE TABLE IF NOT EXISTS trading_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  market_sentiment TEXT,
  sector TEXT,
  risk_level TEXT,
  volatility FLOAT,
  action TEXT,
  confidence_score FLOAT,
  score FLOAT,
  entry FLOAT,
  stop_loss FLOAT,
  take_profit FLOAT,
  quantity FLOAT,
  outcome TEXT,
  profit_loss FLOAT,
  strategy TEXT,
  status TEXT DEFAULT 'open'
);

ALTER TABLE trading_trades
  ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE trading_trades
  ADD COLUMN IF NOT EXISTS market_sentiment TEXT;
ALTER TABLE trading_trades
  ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE trading_trades
  ADD COLUMN IF NOT EXISTS risk_level TEXT;
ALTER TABLE trading_trades
  ADD COLUMN IF NOT EXISTS volatility FLOAT;
ALTER TABLE trading_trades
  ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE trading_trades
  ADD COLUMN IF NOT EXISTS confidence_score FLOAT;
ALTER TABLE trading_trades
  ADD COLUMN IF NOT EXISTS score FLOAT;
ALTER TABLE trading_trades
  ADD COLUMN IF NOT EXISTS entry FLOAT;
ALTER TABLE trading_trades
  ADD COLUMN IF NOT EXISTS stop_loss FLOAT;
ALTER TABLE trading_trades
  ADD COLUMN IF NOT EXISTS take_profit FLOAT;
ALTER TABLE trading_trades
  ADD COLUMN IF NOT EXISTS quantity FLOAT;
ALTER TABLE trading_trades
  ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE trading_trades
  ADD COLUMN IF NOT EXISTS profit_loss FLOAT;
ALTER TABLE trading_trades
  ADD COLUMN IF NOT EXISTS strategy TEXT;
ALTER TABLE trading_trades
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';

-- Add foreign key constraint when available
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'trading_trades'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'trading_trades_user_id_fkey'
  ) THEN
    ALTER TABLE trading_trades
      ADD CONSTRAINT trading_trades_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(id)
      ON DELETE CASCADE;
  END IF;
END$$;

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_trading_trades_user_id ON trading_trades(user_id);

-- Create index on status for filtering open/closed trades
CREATE INDEX IF NOT EXISTS idx_trading_trades_status ON trading_trades(status);