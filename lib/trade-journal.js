import { supabase } from './supabase.js';
import { randomUUID } from 'crypto';

const localStore = {
  trades: [],
  learningData: []
};

export async function getOpenTrades(userId) {
  if (supabase) {
    const { data, error } = await supabase
      .from('trading_trades')
      .select('id,entry,stop_loss,quantity,status,user_id')
      .eq('user_id', userId)
      .eq('status', 'open');

    if (error) {
      console.error('getOpenTrades: supabase fetch error', error);
      return [];
    }

    return data || [];
  }

  return localStore.trades.filter(
    t => t.status === 'open' && t.user_id === userId
  );
}

function normalizeKey(value) {
  return (value || 'unknown').toString().toLowerCase();
}

export async function createTradeRecord(record) {
  const trade = { ...record };
  if (supabase) {
    console.log("USING TABLE: trading_trades");
    const { error } = await supabase.from('trading_trades').insert(trade);
    if (error) {
      console.error('Supabase trade insert failed:', error);
      throw error;
    }
    return trade;
  }

  localStore.trades.push(trade);
  return trade;
}

export async function getTradeById(id) {
  if (supabase) {
    console.log("USING TABLE: trading_trades");
    const { data, error } = await supabase.from('trading_trades').select('*').eq('id', id).single();
    if (error) {
      console.error('Supabase getTradeById failed:', error);
      return null;
    }
    return data;
  }

  return localStore.trades.find(t => t.id === id) || null;
}

export async function updateTradeById(id, updates) {
  if (supabase) {
    console.log("USING TABLE: trading_trades");
    const { data, error } = await supabase.from('trading_trades').update(updates).eq('id', id).select().single();
    if (error) {
      console.error('Supabase updateTradeById failed:', error);
      throw error;
    }
    return data;
  }

  const record = localStore.trades.find(t => t.id === id);
  if (!record) return null;
  Object.assign(record, updates);
  return record;
}

export async function recordLearning(category, key, winRate, adjustment) {
  const entry = {
    id: randomUUID(),
    category,
    key,
    winRate,
    adjustment,
    timestamp: new Date().toISOString()
  };

  if (supabase) {
    const { error } = await supabase.from('learning_data').insert(entry);
    if (error) {
      console.error('Supabase recordLearning failed:', error);
    }
    return entry;
  }

  localStore.learningData.push(entry);
  return entry;
}

export async function getTradeStats() {
  let trades;
  if (supabase) {
    console.log("USING TABLE: trading_trades");
    const { data, error } = await supabase.from('trading_trades').select('status,outcome,market_sentiment,sector,risk_level');
    if (error) {
      console.error('Supabase getTradeStats failed:', error);
      return null;
    }
    trades = data || [];
  } else {
    trades = localStore.trades;
  }

  const closedTrades = trades.filter(t => t.status === 'closed');
  const totalTrades = closedTrades.length;
  const wins = closedTrades.filter(t => t.outcome === 'win').length;
  const losses = closedTrades.filter(t => t.outcome === 'loss').length;
  const winRate = totalTrades > 0 ? wins / totalTrades : 0;

  const categoryBreakdown = category => {
    const groups = {};
    closedTrades.forEach(trade => {
      const rawValue = trade.input?.[category]
        ?? (category === 'sector' ? trade.sector
          : category === 'marketSentiment' ? trade.market_sentiment
          : category === 'riskLevel' ? trade.risk_level
          : undefined);
      const key = normalizeKey(rawValue);
      if (!groups[key]) {
        groups[key] = { total: 0, wins: 0, losses: 0 };
      }
      groups[key].total += 1;
      if (trade.outcome === 'win') groups[key].wins += 1;
      if (trade.outcome === 'loss') groups[key].losses += 1;
    });

    return Object.fromEntries(
      Object.entries(groups).map(([key, stats]) => [key, {
        total: stats.total,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.total > 0 ? stats.wins / stats.total : 0
      }])
    );
  };

  return {
    totalTrades,
    wins,
    losses,
    winRate,
    sectorPerformance: categoryBreakdown('sector'),
    marketPerformance: categoryBreakdown('marketSentiment'),
    riskPerformance: categoryBreakdown('riskLevel')
  };
}
