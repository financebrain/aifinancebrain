import { getMarketContext } from '../lib/market-intelligence.js';
import { runTradingEngine } from '../engines/trading/engine.js';

async function main() {
  try {
    const marketContext = await getMarketContext();
    console.log('MARKET_CONTEXT_LOCAL:', marketContext);

    const input = {
      marketSentiment: marketContext.marketSentiment,
      sectorStrength: 'strong',
      riskLevel: marketContext.riskLevel,
      exposure: 10,
      sector: marketContext.sector,
      currentPrice: 100,
      volatility: Number(marketContext.volatility),
      regime: marketContext.regime
    };

    const userId = '550e8400-e29b-41d4-a716-446655440000';

    const result = await runTradingEngine(input, userId);
    console.log('ENGINE_RESULT:', result);
  } catch (err) {
    console.error('LOCAL_TEST_ERROR:', err);
    process.exit(1);
  }
}

main();
