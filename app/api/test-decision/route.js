import { buildDecisionAsync } from '../../../lib/quant-engine.js';
import { getDynamicWeights } from '../../../lib/decision-memory.js';
import { getMarketContext } from '../../../lib/market-intelligence.js';

export async function GET() {
  const marketContext = await getMarketContext();
  const { marketSentiment, sector: sectorName, riskLevel, volatility, regime } = marketContext;
  console.log('REGIME_FROM_MARKET_CONTEXT:', regime);
  const inputs = {
    marketSentiment,
    sector: sectorName,
    riskLevel,
    exposure: 10,
    regime
  };

  const weights = await getDynamicWeights();
  console.log('TEST INPUT:', inputs);
  const result = await buildDecisionAsync(
    inputs.marketSentiment,
    inputs.sector,
    inputs.riskLevel,
    inputs.exposure,
    weights,
    inputs.sector,
    inputs.regime
  );

  console.log({
    baseScore: result.baseScore,
    finalScore: result.score,
    adjustedContributions: result.contributions
  });

  return Response.json({
    action: result.action,
    confidence: result.confidence,
    conflictScore: result.conflictScore,
    explanation: result.explanation
  });
}
