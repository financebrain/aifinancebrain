import { runQuantEngine } from '../lib/quant-engine.js';

const candidates = [
  { marketSentiment: 'bullish', sector: 'financials', riskLevel: 'high', exposure: 10, volatility: 0.05, currentPrice: 100 },
  { marketSentiment: 'neutral', sector: 'financials', riskLevel: 'high', exposure: 10, volatility: 0.05, currentPrice: 100 },
  { marketSentiment: 'bearish', sector: 'technology', riskLevel: 'high', exposure: 10, volatility: 0.05, currentPrice: 100 },
  { marketSentiment: 'bearish', sector: 'healthcare', riskLevel: 'high', exposure: 10, volatility: 0.05, currentPrice: 100 },
  { marketSentiment: 'bullish', sector: 'technology', riskLevel: 'high', exposure: 10, volatility: 0.05, currentPrice: 100 }
];

async function main() {
  for (const params of candidates) {
    const result = await runQuantEngine(params);
    const open = result.tradeId && result.execution && !result.execution.skip;
    console.log('CANDIDATE', params, 'OPEN', open, 'ACTION', result.action, 'CONF', result.confidenceScore, 'TRADEID', result.tradeId);
    if (open) {
      console.log('OPEN CANDIDATE SELECTED', JSON.stringify(params));
      break;
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });