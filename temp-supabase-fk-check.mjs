import fs from 'fs';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { getMarketContext } from './lib/market-intelligence.js';
const env = Object.fromEntries(
  fs.readFileSync('.env','utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .filter(line => !line.trim().startsWith('#'))
    .map(line => {
      const [k, ...v] = line.split('=');
      return [k, v.join('=')];
    })
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const currentUserId = '550e8400-e29b-41d4-a716-446655440000';
  console.log('AUTH_USER_ID:', currentUserId);

  const userRow = await supabase.from('users').select('*').eq('id', currentUserId).single();
  console.log('PUBLIC_USERS_ROW:', JSON.stringify(userRow, null, 2));

  const marketContext = await getMarketContext();
  console.log('MARKET_CONTEXT_FROM_SCRIPT:', marketContext);

  const tradesRow = await supabase.from('trading_trades').select('*').eq('user_id', currentUserId).limit(5);
  console.log('TRADING_TRADES_FOR_USER:', JSON.stringify(tradesRow, null, 2));

  const uniqueTradeId = randomUUID();
  const testTrade = {
    id: uniqueTradeId,
    user_id: currentUserId,
    market_sentiment: marketContext.marketSentiment,
    sector: marketContext.sector,
    risk_level: marketContext.riskLevel,
    volatility: marketContext.volatility,
    status: 'open'
  };

  const insertRes = await supabase.from('trading_trades').insert([testTrade]);
  console.log('INSERT_RES:', JSON.stringify(insertRes, null, 2));

  const verifyRes = await supabase.from('trading_trades').select('*').eq('id', testTrade.id).single();
  console.log('VERIFY_INSERT:', JSON.stringify(verifyRes, null, 2));

  const constraintRes = await supabase
    .from('information_schema.table_constraints')
    .select('constraint_name,table_schema,table_name,constraint_type')
    .eq('table_name', 'trading_trades');
  console.log('TABLE_CONSTRAINTS:', JSON.stringify(constraintRes, null, 2));

  const foreignKeyRes = await supabase
    .from('information_schema.key_column_usage')
    .select('constraint_name,table_schema,table_name,column_name,ordinal_position,position_in_unique_constraint')
    .eq('table_name', 'trading_trades');
  console.log('KEY_COLUMN_USAGE:', JSON.stringify(foreignKeyRes, null, 2));
}

main().catch(err => {
  console.error('ERROR', err);
  process.exit(1);
});