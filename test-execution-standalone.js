// Standalone Test Trade Execution Layer

// Calculate execution plan with risk management
function calculateExecutionPlan(decision, currentPrice, riskLevel) {
  const { action, confidenceScore, positionSize } = decision;

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

// Test
const mockDecision = {
  action: 'buy',
  confidenceScore: 0.2,
  positionSize: 0.1
};

const currentPrice = 100;
const riskLevel = 'low';

try {
  const result = calculateExecutionPlan(mockDecision, currentPrice, riskLevel);
  console.log('Execution Plan Result (low confidence):', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Test error:', error);
}