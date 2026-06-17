// Trading Engine - Quant-based engine mode
// Uses quant logic for precise trading decisions

import { buildDecisionAsync } from '../../lib/quant-engine.js';

export async function runTradingEngine(input, userId = null) {
  const { marketSentiment, sectorStrength, riskLevel, exposure, sector, weights, currentPrice, regime } = input;

  console.log('REGIME_RECEIVED:', regime);

  // Run quant decision engine
  const decision = await buildDecisionAsync(
    marketSentiment,
    sectorStrength,
    riskLevel,
    exposure,
    weights,
    sector,
    regime,
    userId
  );

  // Execute trade plan
  const execution = calculateExecutionPlan(decision, currentPrice, riskLevel);

  return {
    action: decision.action,
    score: decision.score,
    confidenceScore: decision.confidenceScore,
    positionSize: execution.finalPosition,
    regime: decision.marketRegime,
    patternEnhanced: decision.patternEnhanced,
    ...execution
  };
}

// Calculate execution plan with risk management
function calculateExecutionPlan(decision, currentPrice, riskLevel) {
  const { action, confidenceScore, positionSize, score, marketRegime, riskMultiplier } = decision;

  console.log('POSITION_INPUTS', {
    score,
    confidenceScore,
    regime: marketRegime,
    riskMultiplier,
    positionSize
  });

  // 1. Risk per trade
  let riskPerTrade = 0.01; // 1% base
  if (confidenceScore > 0.6) {
    riskPerTrade = 0.015; // 1.5%
  } else if (confidenceScore < 0.3) {
    riskPerTrade = 0.005; // 0.5%
  }

  // 2. Stop Loss
  let stopLoss = null;
  let takeProfit = null;
  let riskRewardRatio = null;

  if (action === 'buy' || action === 'accumulate') {
    // Stop loss percentage based on risk level
    let stopPercent = 0.03; // default 3%
    if (riskLevel === 'low') {
      stopPercent = 0.02; // 2%
    } else if (riskLevel === 'high') {
      stopPercent = 0.04; // 4%
    }

    stopLoss = currentPrice * (1 - stopPercent);

    // 3. Take Profit: 2x stop distance
    const stopDistance = stopPercent;
    takeProfit = currentPrice * (1 + 2 * stopDistance);

    // 4. Risk Reward Ratio: 2:1 (since take profit is 2x stop distance)
    riskRewardRatio = 2.0;
  }

  // 5. Position Adjustment
  const finalPosition = positionSize * (riskPerTrade / 0.01);

  // 6. Debug
  console.log("EXECUTION_DEBUG:", {
    entry: currentPrice,
    stopLoss,
    takeProfit,
    risk: riskPerTrade
  });

  return {
    entry: currentPrice,
    stopLoss,
    takeProfit,
    riskPerTrade,
    riskRewardRatio,
    finalPosition
  };
}

export { calculateExecutionPlan };