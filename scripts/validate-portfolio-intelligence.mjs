import { getPortfolioState } from '../lib/portfolio-manager.js';
import { runQuantEngine } from '../lib/quant-engine.js';

async function main() {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
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

  const allowed = portfolio.allowNewTrade === true;
  const multiplierOk = portfolio.sizeMultiplier === 1;
  const heatOk = portfolio.portfolioHeat === 0;
  const createdTrade = !!result.tradeId;
  const positionNotReduced = portfolio.sizeMultiplier === 1 && result.execution && result.execution.quantity > 0;

  const output = {
    portfolioHeat: portfolio.portfolioHeat,
    allowNewTrade: portfolio.allowNewTrade,
    sizeMultiplier: portfolio.sizeMultiplier,
    testPassed: heatOk && allowed && multiplierOk && createdTrade && positionNotReduced
  };

  console.log(output);
}

main().catch(error => {
  console.error('VALIDATION_ERROR:', error);
  process.exit(1);
});