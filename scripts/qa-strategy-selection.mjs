import { runQuantEngine } from '../lib/quant-engine.js';

const testCases = [
  {
    name: 'Stable Trend (Low Volatility Bullish)',
    input: { marketSentiment: 'bullish', sector: 'technology', riskLevel: 'low', exposure: 10, volatility: 0.02, currentPrice: 100 }
  },
  {
    name: 'Breakout (High Volatility Bullish)',
    input: { marketSentiment: 'bullish', sector: 'technology', riskLevel: 'low', exposure: 10, volatility: 0.04, currentPrice: 100 }
  },
  {
    name: 'Defensive (Bearish)',
    input: { marketSentiment: 'bearish', sector: 'financials', riskLevel: 'high', exposure: 10, volatility: 0.05, currentPrice: 100 }
  },
  {
    name: 'Sideways (Neutral)',
    input: { marketSentiment: 'neutral', sector: 'consumer', riskLevel: 'medium', exposure: 10, volatility: 0.015, currentPrice: 100 }
  }
];

async function runStrategyTest() {
  console.log('=== STRATEGY SELECTION TEST ===\n');

  for (const testCase of testCases) {
    console.log(`\nTEST: ${testCase.name}`);
    console.log(`Input: ${JSON.stringify(testCase.input, null, 2)}`);

    const result = await runQuantEngine(testCase.input);

    console.log(`Result:`, {
      action: result.action,
      confidenceScore: result.confidenceScore ? result.confidenceScore.toFixed(4) : 'N/A',
      positionSize: result.positionSize ? result.positionSize.toFixed(4) : 'N/A',
      strategy: result.strategy,
      marketRegime: result.marketRegime,
      enhancedRegime: result.enhancedRegime
    });
  }
}

runStrategyTest().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}).then(() => {
  console.log('\n=== STRATEGY SELECTION TEST COMPLETED ===');
  process.exit(0);
});
