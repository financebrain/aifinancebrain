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

async function findOpenTrade(paramsList) {
  for (const params of paramsList) {
    const candidate = await runQuantEngine(params);
    if (candidate.tradeId && candidate.execution && !candidate.execution.skip) {
      return { candidate, params };
    }
  }
  return null;
}

async function main() {
  const summary = { trades: [], stats: null, trigger: null, error: null };

  const t1 = await runQuantEngine({ marketSentiment: 'bullish', sector: 'technology', riskLevel: 'low', exposure: 10, volatility: 0.02, currentPrice: 100 });
  summary.trades.push({ label: 'trade1', input: { marketSentiment: 'bullish', sector: 'technology', riskLevel: 'low', exposure: 10, volatility: 0.02, currentPrice: 100 }, result: t1 });

  const t2Candidate = await findOpenTrade([
    { marketSentiment: 'bearish', sector: 'financials', riskLevel: 'high', exposure: 10, volatility: 0.05, currentPrice: 100 },
    { marketSentiment: 'bearish', sector: 'technology', riskLevel: 'high', exposure: 10, volatility: 0.05, currentPrice: 100 },
    { marketSentiment: 'bullish', sector: 'technology', riskLevel: 'high', exposure: 10, volatility: 0.05, currentPrice: 100 },
    { marketSentiment: 'bearish', sector: 'technology', riskLevel: 'high', exposure: 20, volatility: 0.05, currentPrice: 100 },
    { marketSentiment: 'neutral', sector: 'financials', riskLevel: 'high', exposure: 10, volatility: 0.05, currentPrice: 100 },
    { marketSentiment: 'neutral', sector: 'technology', riskLevel: 'high', exposure: 10, volatility: 0.05, currentPrice: 100 }
  ]);

  if (!t2Candidate) {
    throw new Error('No open trade found for any fallback loss-trade candidate.');
  }

  const t2 = t2Candidate.candidate;
  summary.trades.push({ label: 'trade2', input: t2Candidate.params, result: t2 });

  const t3 = await runQuantEngine({ marketSentiment: 'bullish', sector: 'technology', riskLevel: 'low', exposure: 15, volatility: 0.02, currentPrice: 100 });
  summary.trades.push({ label: 'trade3', input: { marketSentiment: 'bullish', sector: 'technology', riskLevel: 'low', exposure: 15, volatility: 0.02, currentPrice: 100 }, result: t3 });

  summary.trades = await Promise.all(summary.trades.map(async trade => {
    if (trade.result.tradeId) {
      const exitPrice = trade.label === 'trade2' ? trade.result.execution.stopLoss : trade.result.execution.takeProfit;
      const closed = await closeTrade(trade.result, exitPrice);
      return { ...trade, closed };
    }
    return trade;
  }));

  summary.stats = await getTradeStats();
  summary.dynamicWeights = await getDynamicWeights();

  const trigger = await runQuantEngine({ marketSentiment: 'bullish', sector: 'technology', riskLevel: 'low', exposure: 10, volatility: 0.02, currentPrice: 100 });
  summary.trigger = trigger;

  await fs.writeFile('scripts/qa-trade-report.json', JSON.stringify(summary, null, 2), 'utf-8');
  console.log('Saved report to scripts/qa-trade-report.json');
}

main().catch(async error => {
  await fs.writeFile('scripts/qa-trade-report.json', JSON.stringify({ error: error.message }, null, 2), 'utf-8');
  console.error(error);
  process.exit(1);
});