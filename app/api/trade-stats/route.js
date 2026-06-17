import { createSupabaseServerClient } from '../../../lib/supabase-server.js';
import { cookies } from 'next/headers';

export async function GET(req) {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get trade stats for user
    const { data: trades, error } = await supabase
      .from('trading_trades')
      .select('status,outcome,market_sentiment,sector,risk_level')
      .eq('user_id', user.id);

    if (error) {
      console.error('TRADE_STATS_ERROR:', error);
      return Response.json({ success: false, error: 'Unable to fetch trade stats' }, { status: 500 });
    }

    const closedTrades = trades.filter(t => t.status === 'closed');
    const totalTrades = closedTrades.length;
    const wins = closedTrades.filter(t => t.outcome === 'win').length;
    const losses = closedTrades.filter(t => t.outcome === 'loss').length;
    const winRate = totalTrades > 0 ? wins / totalTrades : 0;

    const categoryBreakdown = category => {
      const groups = {};
      closedTrades.forEach(trade => {
        const key = trade[category];
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

    const stats = {
      totalTrades,
      wins,
      losses,
      winRate,
      sectorPerformance: categoryBreakdown('sector'),
      marketPerformance: categoryBreakdown('market_sentiment'),
      riskPerformance: categoryBreakdown('risk_level')
    };

    return Response.json({ success: true, stats });
  } catch (error) {
    console.error('TRADE_STATS_ERROR:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
