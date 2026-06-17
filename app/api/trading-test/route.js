import { runQuantEngine } from '../../../lib/quant-engine.js';
import { runTradingEngine } from '../../../engines/trading/engine.js';
import { getDynamicWeights, getRealPatterns } from '../../../lib/decision-memory.js';
import { getMarketContext } from '../../../lib/market-intelligence.js';
import { getPortfolioState } from '../../../lib/portfolio-manager.js';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

const QA_USER_IDS = [
  '550e8400-e29b-41d4-a716-446655440000',
  '920b9cf9-d5dd-469c-b976-c6ae8d3ed8ef'
];

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // no-op: this route only needs to READ session cookies
          },
        },
      }
    );

    // Get user ID from auth or test mode
    let userId = null;
    
    // TEST MODE: Allow userId query parameter for automated testing
    const testUserId = searchParams.get('userId');
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

    console.log("CURRENT_USER_ID:", userId);
    if (!QA_USER_IDS.includes(userId)) {
      console.log("USER_MISMATCH_DETECTED: current request user is not one of known QA users", {
        userId,
        QA_USER_IDS
      });
    }

    const marketContext = await getMarketContext();
    const { marketSentiment, sector: sectorName, riskLevel, volatility, regime } = marketContext;
    console.log('REGIME_FROM_MARKET_CONTEXT:', regime);
    const testInput = {
      marketSentiment,
      sector: sectorName,
      riskLevel,
      exposure: Number(searchParams.get('exposure')) || 10,
      currentPrice: Number(searchParams.get('price')) || 100,
      volatility: Number(volatility),
      regime
    };

    // Get real patterns from user's closed trades
    const realPatterns = await getRealPatterns(userId);
    console.log("REAL_PATTERNS_LOADED:", realPatterns);
    console.log("MARKET_CONTEXT:", marketContext);

    // Get dynamic weights
    const weights = await getDynamicWeights(userId);

    // Prepare input for trading engine
    const tradingInput = {
      marketSentiment: testInput.marketSentiment,
      sectorStrength: 'strong', // Assume strong for test
      riskLevel: testInput.riskLevel,
      exposure: testInput.exposure,
      sector: testInput.sector,
      regime: testInput.regime,
      weights: weights,
      currentPrice: testInput.currentPrice
    };

    const result = await runTradingEngine(tradingInput, userId);
    console.log('REGIME_RECEIVED_BY_ENGINE_CALL:', tradingInput.regime);

    console.log("TEST_INPUT:", testInput);
    console.log("RESULT:", result);

    // Generate trade ID
    const tradeId = uuidv4();

    // In test mode, ensure test user exists for FK constraint BEFORE inserting trade
    if (testUserId) {
      console.log('TEST_MODE: Ensuring test user exists:', userId);
      // Upsert the user (insert if not exists, ignore if exists)
      const { error: userError } = await supabase.from('users').upsert([{
        id: userId,
        email: `test-user-${userId.slice(0, 8)}@test.local`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }], { onConflict: 'id' });
      
      if (userError) {
        console.error('TEST_MODE: User upsert error:', userError.message);
        // Don't return error - try to continue anyway
      } else {
        console.log('TEST_MODE: Test user ensured');
      }
    }

    // Save trade to Supabase
    const tradeData = {
      id: tradeId,
      user_id: userId,
      market_sentiment: testInput.marketSentiment,
      sector: testInput.sector,
      risk_level: testInput.riskLevel,
      volatility: testInput.volatility,
      action: result.action,
      confidence_score: result.confidenceScore,
      score: result.score ?? result.confidenceScore,
      entry: result.entry,
      stop_loss: result.stopLoss,
      take_profit: result.takeProfit,
      quantity: result.finalPosition,
      strategy: 'quant-based', // Default strategy
      status: 'open'
    };

    // Check portfolio limits before inserting trade
    try {
      const portfolio = await getPortfolioState(userId);
      if (!portfolio.allowNewTrade) {
        console.log('TRADING_TEST_BLOCKED: portfolio heat limit', { heat: portfolio.portfolioHeat });
        tradeData.action = 'hold';
        tradeData.reason = 'portfolio_heat_limit';
        tradeData.quantity = 0;
      } else {
        // Apply size multiplier
        tradeData.quantity = Math.round((tradeData.quantity || 0) * (portfolio.sizeMultiplier || 1) * 10000) / 10000;
      }
    } catch (err) {
      console.warn('TRADING_TEST: portfolio check failed, proceeding with original trade', err);
    }

    const { error: insertError } = await supabase.from('trading_trades').insert([tradeData]);

    if (insertError) {
      console.error("INSERT_ERROR:", insertError);
      if (insertError.details?.toLowerCase().includes('foreign key') || insertError.message?.toLowerCase().includes('foreign key')) {
        console.error("FOREIGN_KEY_FAILURE: trading_trades.user_id may reference auth.users(id) while the test user exists in public.users or users.");
      }
      return Response.json({ error: 'Failed to save trade' }, { status: 500 });
    }

    console.log("TRADE_SAVED:", tradeId);

    return Response.json({
      success: true,
      input: testInput,
      data: result,
      score: result.score ?? result.confidenceScore,
      tradeId: tradeId
    });

  } catch (error) {
    console.error("TRADING_TEST_ERROR:", error);

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}