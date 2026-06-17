import fs from 'fs/promises';
import { runQuantEngine } from '../lib/quant-engine.js';
import { updateTradeById, getTradeStats } from '../lib/trade-journal.js';
import { getDynamicWeights } from '../lib/decision-memory.js';

async function closeTrade(existing, exitPrice) {
  return updateTradeById(existing.tradeId, {
    status: 'closed',
    exitPrice,
    profitLoss: Math.round(((Number(exitPrice) - Number(existing.execution.entry)) * Number(existing.execution.quantity)) * 100) / 100,
    outcome: exitPrice >= existing.execution.takeProfit ? 'win' : exitPrice <= existing.execution.stopLoss ? 'loss' : 'partial',
    closedAt: new Date().toISOString()
  });
}

async function runTrades() {
  const summary = { trades: [], stats: null, adaptiveWeights: null };

  const baseTradeParams = {
    marketSentiment: 'bullish',
    sector: 'technology',
    riskLevel: 'low',
    exposure: 10,
    volatility: 0.02,
    currentPrice: 100
  };

  const tradeCount = 20;
  const winCount = 16;
  const trades = Array.from({ length: tradeCount }, (_, index) => ({
    label: `trade${index + 1}`,
    params: { ...baseTradeParams, currentPrice: 100 + index * 0.01 }
  }));

  for (const [index, tradeDescriptor] of trades.entries()) {
    const trade = await runQuantEngine(tradeDescriptor.params);
    if (!trade.tradeId || !trade.execution || trade.execution.skip) {
      throw new Error(`Trade ${index + 1} failed to open or was skipped: ${JSON.stringify(trade)}`);
    }

    const exitPrice = index < winCount ? trade.execution.takeProfit : trade.execution.stopLoss;
    const closed = await closeTrade(trade, exitPrice);
    summary.trades.push({ label: tradeDescriptor.label, params: tradeDescriptor.params, result: trade, closed });
  }

  summary.stats = await getTradeStats();
  summary.adaptiveWeights = await getDynamicWeights();
  await fs.writeFile('scripts/qa-trade-adapt-test.json', JSON.stringify(summary, null, 2), 'utf-8');
  console.log('Adaptive test report saved to scripts/qa-trade-adapt-test.json');
}

runTrades().catch(async error => {
  await fs.writeFile('scripts/qa-trade-adapt-test.json', JSON.stringify({ error: error.message }, null, 2), 'utf-8');
  console.error('Adaptive test failed:', error);
  process.exit(1);
});