import { createTradeRecord } from '../lib/trade-journal.js';
import { getPortfolioState } from '../lib/portfolio-manager.js';
import { runQuantEngine } from '../lib/quant-engine.js';
import { randomUUID } from 'crypto';

async function createMockTrade(userId, entry, stopLoss, quantity) {
  const trade = {
    id: randomUUID(),
    user_id: userId,
    entry,
    stop_loss: stopLoss,
    quantity,
    status: 'open',
    decision: { action: 'buy' },
    execution: { finalPosition: quantity }
  };
  return await createTradeRecord(trade);
}

async function main() {
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  // clear local open trades if any
  console.log('NOTE: This test assumes no Supabase and uses local store only.');

  await createMockTrade(userId, 100, 98, 0.01); // 1% stop, 1% quantity => 0.01 risk = 1%
  await createMockTrade(userId, 100, 98.5, 0.01); // 0.5% stop, 1% qty => 0.005 risk = 0.5%
  await createMockTrade(userId, 100, 97, 0.01); // 3% stop, 1% qty => 0.03 risk = 3%

  const portfolio = await getPortfolioState(userId);

  console.log('PORTFOLIO_STATE:', portfolio);

  const input = {
    marketSentiment: 'bullish',
    sector: 'technology',
    riskLevel: 'low',
    exposure: 10,
    currentPrice: 100,
    volatility: 0.02,
    regime: 'trending'
  };

  const result = await runQuantEngine(input, userId);
  console.log('ENGINE_RESULT:', result);

  const originalPosition = result.execution?.finalPosition || 0;
  const adjustedPosition = portfolio.sizeMultiplier === 0.75
    ? Math.round(originalPosition * portfolio.sizeMultiplier * 10000) / 10000
    : originalPosition;

  const testPassed = (
    portfolio.portfolioHeat >= 2 &&
    portfolio.portfolioHeat <= 4 &&
    portfolio.allowNewTrade === true &&
    portfolio.sizeMultiplier === 0.75 &&
    result.tradeId &&
    result.execution?.finalPosition === originalPosition
  );

  console.log({
    portfolioHeat: portfolio.portfolioHeat,
    sizeMultiplier: portfolio.sizeMultiplier,
    originalPosition,
    adjustedPosition,
    testPassed
  });
}

main().catch(error => {
  console.error('VALIDATION_ERROR:', error);
  process.exit(1);
});