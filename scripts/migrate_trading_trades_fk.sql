-- Migration: Fix trading_trades.user_id foreign key to reference public.users(id)

ALTER TABLE trading_trades
  DROP CONSTRAINT IF EXISTS trading_trades_user_id_fkey;

ALTER TABLE trading_trades
  ADD CONSTRAINT trading_trades_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;
