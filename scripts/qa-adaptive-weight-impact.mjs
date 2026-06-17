import { calculateScore } from '../lib/quant-engine.js';
import { getDynamicWeights, getSignalPatterns } from '../lib/decision-memory.js';
import { createTradeRecord, updateTradeById } from '../lib/trade-journal.js';
import { randomUUID } from 'crypto';

const DEFAULT_DECISION_WEIGHTS = {
  market: 0.25,
  sector: 0.3,
  risk: 0.25,
  portfolio: 0.2
};

const input = {
  marketSentiment: 'bullish',
  sectorStrength: 'technology',
  riskLevel: 'low',
  exposure: 10
};

const FALLBACK_PATTERNS = {
  market: {
    bullish: { avgAccuracy: 0.08, winRate: 80 }
  },
  sector: {
    technology: { avgAccuracy: 0.05, winRate: 70 }
  },
  risk: {
    low: { avgAccuracy: 0.06, winRate: 80 }
  }
};

async function seedClosedTrades() {
  const trades = [];
  for (let i = 0; i < 10; i += 1) {
    trades.push({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      status: 'closed',
      input: {
        marketSentiment: 'bullish',
        sector: 'technology',
        riskLevel: 'low',
        volatility: 0.02
      },
      outcome: i < 8 ? 'win' : 'loss',
      accuracy_score: i < 8 ? 0.7 : -0.3
    });
  }

  for (const trade of trades) {
    await createTradeRecord(trade);
    await updateTradeById(trade.id, {
      status: 'closed',
      outcome: trade.outcome,
      accuracy_score: trade.accuracy_score,
      closedAt: new Date().toISOString()
    });
  }
}

async function runComparison() {
  console.log('INPUT:', input);

  await seedClosedTrades();

  const patterns = await getSignalPatterns();
  const effectivePatterns =
    Object.keys(patterns.market).length || Object.keys(patterns.sector).length || Object.keys(patterns.risk).length
      ? patterns
      : FALLBACK_PATTERNS;

  console.log('USING PATTERNS:', effectivePatterns);

  const defaultResult = calculateScore(input, DEFAULT_DECISION_WEIGHTS, effectivePatterns);
  console.log('BEFORE ADAPTIVE WEIGHTS');
  console.log('DEFAULT_WEIGHTS:', DEFAULT_DECISION_WEIGHTS);
  console.log('WEIGHTED_CONTRIBUTIONS:', {
    market: defaultResult.scores.market * DEFAULT_DECISION_WEIGHTS.market,
    sector: defaultResult.scores.sector * DEFAULT_DECISION_WEIGHTS.sector,
    risk: defaultResult.scores.risk * DEFAULT_DECISION_WEIGHTS.risk
  });
  console.log('FINAL_SCORE:', defaultResult.score);

  const adaptiveWeights = await getDynamicWeights();
  console.log('AFTER ADAPTIVE WEIGHTS');
  console.log('ADAPTIVE_WEIGHTS:', adaptiveWeights);

  const adaptiveResult = calculateScore(input, adaptiveWeights, effectivePatterns);
  console.log('WEIGHTED_CONTRIBUTIONS:', {
    market: adaptiveResult.scores.market * adaptiveWeights.market,
    sector: adaptiveResult.scores.sector * adaptiveWeights.sector,
    risk: adaptiveResult.scores.risk * adaptiveWeights.risk
  });
  console.log('FINAL_SCORE:', adaptiveResult.score);

  const contributionsChanged = 
    defaultResult.scores.market * DEFAULT_DECISION_WEIGHTS.market !== adaptiveResult.scores.market * adaptiveWeights.market ||
    defaultResult.scores.sector * DEFAULT_DECISION_WEIGHTS.sector !== adaptiveResult.scores.sector * adaptiveWeights.sector ||
    defaultResult.scores.risk * DEFAULT_DECISION_WEIGHTS.risk !== adaptiveResult.scores.risk * adaptiveWeights.risk;

  const scoreChanged = defaultResult.score !== adaptiveResult.score;

  console.log('VALIDATION:', {
    contributionsChanged,
    scoreChanged,
    defaultScore: defaultResult.score,
    adaptiveScore: adaptiveResult.score
  });

  if (!contributionsChanged || !scoreChanged) {
    throw new Error('Adaptive weights did not affect the decision score or contributions.');
  }
}

runComparison().catch(error => {
  console.error('QA FAILED:', error.message);
  process.exit(1);
});
