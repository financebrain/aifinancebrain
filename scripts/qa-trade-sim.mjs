import { runQuantEngine } from '../lib/quant-engine.js';
import { updateTradeById, getTradeStats } from '../lib/trade-journal.js';

async function closeTrade(existing, exitPrice) {
  return updateTradeById(existing.tradeId, {
    status: 'closed',
    exitPrice,
    profitLoss: Math.round(((Number(exitPrice) - Number(existing.execution.entry)) * Number(existing.execution.quantity)) * 100) / 100,
    outcome: exitPrice >= existing.execution.takeProfit ? 'win' : exitPrice <= existing.execution.stopLoss ? 'loss' : 'partial',
    closedAt: new Date().toISOString()
  });
}

async function runSimulation() {
  const t1 = await runQuantEngine({ marketSentiment: 'bullish', sector: 'technology', riskLevel: 'low', exposure: 10, volatility: 0.02, currentPrice: 100 });
  console.log('TRADE 1 RESULT:', t1);

  const bearishInputs = [0, 10, 20, 30, 40, 50, 60, 70];
  let t2 = null;
  for (const exposure of bearishInputs) {
    const candidate = await runQuantEngine({ marketSentiment: 'bearish', sector: 'financials', riskLevel: 'high', exposure, volatility: 0.05, currentPrice: 100 });
    console.log('TRY T2 exposure', exposure, 'tradeId', candidate.tradeId, 'skip', candidate.execution?.skip, 'action', candidate.action, 'confidenceScore', candidate.confidenceScore);
    if (candidate.tradeId && candidate.execution && !candidate.execution.skip) {
      t2 = candidate;
      break;
    }
  }

  if (!t2) {
    const alternativeSectors = ['technology', 'healthcare', 'energy', 'consumer'];
    for (const sector of alternativeSectors) {
      for (const exposure of bearishInputs) {
        const candidate = await runQuantEngine({ marketSentiment: 'bearish', sector, riskLevel: 'high', exposure, volatility: 0.05, currentPrice: 100 });
        console.log('TRY ALT T2', sector, exposure, 'tradeId', candidate.tradeId, 'skip', candidate.execution?.skip, 'action', candidate.action, 'confidenceScore', candidate.confidenceScore);
        if (candidate.tradeId && candidate.execution && !candidate.execution.skip) {
          t2 = candidate;
          break;
        }
      }
      if (t2) break;
    }
  }

  if (!t2) {
    throw new Error('Unable to generate a valid loss trade scenario with bearish high risk after exploring alternatives.');
  }
  console.log('TRADE 2 RESULT:', t2);

  const t3 = await runQuantEngine({ marketSentiment: 'bullish', sector: 'technology', riskLevel: 'low', exposure: 15, volatility: 0.02, currentPrice: 100 });
  console.log('TRADE 3 RESULT:', t3);

  const closed1 = await closeTrade(t1, t1.execution.takeProfit);
  console.log('CLOSED TRADE 1:', { id: closed1.id, outcome: closed1.outcome, profitLoss: closed1.profitLoss });

  const closed2 = await closeTrade(t2, t2.execution.stopLoss);
  console.log('CLOSED TRADE 2:', { id: closed2.id, outcome: closed2.outcome, profitLoss: closed2.profitLoss });

  const closed3 = await closeTrade(t3, t3.execution.takeProfit);
  console.log('CLOSED TRADE 3:', { id: closed3.id, outcome: closed3.outcome, profitLoss: closed3.profitLoss });

  const stats = await getTradeStats();
  console.log('TRADE STATS:', stats);

  const t4 = await runQuantEngine({ marketSentiment: 'bullish', sector: 'technology', riskLevel: 'low', exposure: 10, volatility: 0.02, currentPrice: 100 });
  console.log('TRIGGER TRADE RESULT:', t4);
}

runSimulation().catch(error => {
  console.error('SIMULATION ERROR:', error);
  process.exit(1);
});