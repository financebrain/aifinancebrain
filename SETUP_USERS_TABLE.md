# Trade Generation Setup

## Problem
The test trade generation is failing because the `trading_trades` table has a foreign key constraint on a `users` table that doesn't exist.

## Solution  
You need to create a `public.users` table in your Supabase database. Follow these steps:

### Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Log in to your project
3. Go to **SQL Editor** in the left sidebar
4. Click **+ New Query**

### Step 2: Run the Setup SQL
Copy and paste this SQL, then click **Run**:

```sql
-- Create a public users table for test and trading data
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update foreign key constraint on trading_trades
ALTER TABLE trading_trades
  DROP CONSTRAINT IF EXISTS trading_trades_user_id_fkey;

ALTER TABLE trading_trades
  ADD CONSTRAINT trading_trades_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);
```

### Step 3: Verify Success
The SQL should complete without errors. You should see:
- Table `public.users` created
- Foreign key constraint updated
- Index created

### Step 4: Run Trade Generation
After the SQL completes, run the test again:

```bash
node test-trade-generation.js
```

This should now successfully create and close all 13 trades.

## What This Does
- Creates a `public.users` table with UUID primary key and email
- Updates the FK constraint on `trading_trades` to reference `public.users` instead of `auth.users`
- Allows test trades to be created with test user IDs
- Maintains data integrity with proper foreign key relationships

## Notes
- This table is separate from Supabase Auth (`auth.users`)
- Test user IDs are created dynamically when making trade requests
- The FK constraint ensures data consistency
- Index on `id` improves query performance
