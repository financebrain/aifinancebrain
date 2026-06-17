import { createSupabaseServerClient } from '../../../lib/supabase-server.js';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    const url = new URL(req.url);
    const testUserId = url.searchParams.get('userId');
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);

    let userId = null;

    // TEST MODE: Allow userId query parameter for automated testing
    if (testUserId && process.env.NODE_ENV === 'development') {
      userId = testUserId;
      console.log("TEST_MODE: Using userId from query parameter:", userId);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      userId = user.id;
    }

    const { id, exitPrice } = await req.json();

    // Get trade data
    const { data: trade, error: fetchError } = await supabase
      .from('trading_trades')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !trade) {
      return Response.json({ error: 'Trade not found' }, { status: 404 });
    }

    if (trade.status !== 'open') {
      return Response.json({ error: 'Trade already closed' }, { status: 400 });
    }

    // Allow closing no-position trades without stop_loss/take_profit
    const hasExecutionTargets = trade.stop_loss !== null && trade.take_profit !== null;

    if (hasExecutionTargets && (exitPrice === undefined || exitPrice === null)) {
      return Response.json({ error: 'Missing id or exitPrice' }, { status: 400 });
    }

    let pnl = 0;
    let outcome = 'hold';

    if (hasExecutionTargets) {
      pnl = (exitPrice - trade.entry) * trade.quantity;

      if (exitPrice <= trade.stop_loss) {
        outcome = 'loss';
      } else if (exitPrice >= trade.take_profit) {
        outcome = 'win';
      } else {
        outcome = 'partial';
      }
    }

    // Update trade
    const { error: updateError } = await supabase
      .from('trading_trades')
      .update({
        outcome: outcome,
        profit_loss: pnl,
        status: 'closed'
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (updateError) {
      console.error("UPDATE_ERROR:", updateError);
      return Response.json({ error: 'Failed to update trade' }, { status: 500 });
    }

    console.log("TRADE_UPDATED:", id, "PNL:", pnl, "OUTCOME:", outcome);

    return Response.json({
      success: true,
      trade: {
        id,
        profitLoss: pnl,
        outcome
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

