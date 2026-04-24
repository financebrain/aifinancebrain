import { supabase } from './supabase.js';

const DEFAULT_DECISION_WEIGHTS = {
  market: 0.25,
  sector: 0.30,
  risk: 0.25,
  portfolio: 0.20
};

function normalizePerformanceGroup(rows, field) {
  const buckets = {};

  rows.forEach(row => {
    const key = (row[field] || 'unknown').toString().toLowerCase();
    if (!buckets[key]) {
      buckets[key] = { total: 0, count: 0 };
    }
    buckets[key].total += Number(row.accuracy_score) || 0;
    buckets[key].count += 1;
  });

  const metrics = {};
  let totalAverage = 0;
  let groups = 0;

  Object.entries(buckets).forEach(([key, value]) => {
    const avg = value.count ? value.total / value.count : 0;
    metrics[key] = Math.round(avg * 1000) / 1000;
    totalAverage += avg;
    groups += 1;
  });

  return {
    metrics,
    avg: groups ? Math.round((totalAverage / groups) * 1000) / 1000 : 0
  };
}

function normalizeWeights(rawWeights) {
  const total = rawWeights.market + rawWeights.sector + rawWeights.risk + rawWeights.portfolio;
  if (total === 0) {
    return DEFAULT_DECISION_WEIGHTS;
  }

  const normalized = {
    market: Math.round((rawWeights.market / total) * 1000) / 1000,
    sector: Math.round((rawWeights.sector / total) * 1000) / 1000,
    risk: Math.round((rawWeights.risk / total) * 1000) / 1000,
    portfolio: Math.round((rawWeights.portfolio / total) * 1000) / 1000
  };

  const diff = 1 - (normalized.market + normalized.sector + normalized.risk + normalized.portfolio);
  if (Math.abs(diff) > 0) {
    normalized.market = Math.round((normalized.market + diff) * 1000) / 1000;
  }

  return normalized;
}

function buildSignalImpact(rows, field) {
  const buckets = {};
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  rows.forEach(row => {
    const key = (row[field] || 'unknown').toString().toLowerCase();
    if (!buckets[key]) {
      buckets[key] = { totalAccuracy: 0, weightedAccuracy: 0, totalRecency: 0, wins: 0, count: 0 };
    }

    const accuracy = Number(row.accuracy_score) || 0;
    buckets[key].totalAccuracy += accuracy;
    if (row.outcome === 'win') {
      buckets[key].wins += 1;
    }
    buckets[key].count += 1;

    const timestamp = row.created_at ? new Date(row.created_at).getTime() : NaN;
    const days = Number.isNaN(timestamp) ? 0 : Math.max(0, (now - timestamp) / msPerDay);
    const recencyFactor = 1 / (1 + days / 7);

    buckets[key].weightedAccuracy += accuracy * recencyFactor;
    buckets[key].totalRecency += recencyFactor;
  });

  const impact = {};
  Object.entries(buckets).forEach(([key, value]) => {
    impact[key] = {
      avgAccuracy: value.count ? Math.round((value.totalAccuracy / value.count) * 10000) / 10000 : 0,
      recencyAdjustedAccuracy: value.count ? Math.round((value.weightedAccuracy / value.count) * 10000) / 10000 : 0,
      winRate: value.count ? Math.round((value.wins / value.count) * 100) : 0,
      count: value.count,
      totalRecency: Math.round(value.totalRecency * 10000) / 10000
    };
  });

  return impact;
}

export async function getSignalPerformance() {
  try {
    const { data, error } = await supabase
      .from('decision_history')
      .select('market_sentiment, sector, risk_level, accuracy_score')
      .not('accuracy_score', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch signal performance: ${error.message}`);
    }

    const market = normalizePerformanceGroup(data, 'market_sentiment');
    const sector = normalizePerformanceGroup(data, 'sector');
    const risk = normalizePerformanceGroup(data, 'risk_level');

    return {
      marketSentiment: market.metrics,
      sector: sector.metrics,
      riskLevel: risk.metrics,
      totals: {
        market: market.avg,
        sector: sector.avg,
        risk: risk.avg
      },
      signalCount: data.length
    };
  } catch (error) {
    console.error('Error getting signal performance:', error);
    throw error;
  }
}

export async function getSignalImpact() {
  try {
    const { data, error } = await supabase
      .from('decision_history')
      .select('market_sentiment, sector, risk_level, accuracy_score, outcome, created_at')
      .not('accuracy_score', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch signal impact: ${error.message}`);
    }

    return {
      market: buildSignalImpact(data, 'market_sentiment'),
      sector: buildSignalImpact(data, 'sector'),
      risk: buildSignalImpact(data, 'risk_level')
    };
  } catch (error) {
    console.error('Error getting signal impact:', error);
    throw error;
  }
}

function computeCategoryScore(rows, field) {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const groups = {};
  const totalRows = rows.length;

  rows.forEach(row => {
    const key = (row[field] || 'unknown').toString().toLowerCase();
    if (!groups[key]) {
      groups[key] = { totalWeightedAccuracy: 0, count: 0 };
    }

    const accuracy = Number(row.accuracy_score) || 0;
    const timestamp = row.created_at ? new Date(row.created_at).getTime() : NaN;
    const days = Number.isNaN(timestamp) ? 0 : Math.max(0, (now - timestamp) / msPerDay);
    const recencyFactor = 1 / (1 + days / 7);
    const weightedAccuracy = accuracy * recencyFactor;

    groups[key].totalWeightedAccuracy += weightedAccuracy;
    groups[key].count += 1;
  });

  const scores = Object.values(groups).map(bucket => {
    const avgAccuracy = bucket.count ? bucket.totalWeightedAccuracy / bucket.count : 0;
    const dominance = totalRows ? bucket.count / totalRows : 0;
    let score = avgAccuracy * Math.log(bucket.count + 1) * dominance;
    if (score < 0) {
      score *= 1.5;
    }
    return score;
  });

  scores.sort((a, b) => Math.abs(b) - Math.abs(a));

  return scores.slice(0, 2).reduce((sum, score) => sum + score, 0);
}

export async function getDynamicWeights() {
  try {
    const { data, error } = await supabase
      .from('decision_history')
      .select('market_sentiment, sector, risk_level, accuracy_score, created_at')
      .not('accuracy_score', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch decision history for dynamic weights: ${error.message}`);
    }

    const totalDecisionCount = data ? data.length : 0;
    const validAccuracyRows = data
      ? data.filter(row => row.accuracy_score !== null && row.accuracy_score !== undefined)
      : [];

    console.log('Decision count:', totalDecisionCount);
    console.log('Fetched rows:', totalDecisionCount);
    console.log('Valid accuracy rows:', validAccuracyRows.length);
    console.log('Sample rows:', data ? data.slice(0, 3) : []);
    console.log(
      'Sample created_at valid:',
      data ? data.slice(0, 3).map(row => ({ created_at: row.created_at, valid: !!row.created_at })) : []
    );

    // if (totalDecisionCount < 20) {
    //   return DEFAULT_DECISION_WEIGHTS;
    // }

    const marketScore = computeCategoryScore(data, 'market_sentiment');
    const sectorScore = computeCategoryScore(data, 'sector');
    const riskScore = computeCategoryScore(data, 'risk_level');
    const totalSignalScore = marketScore + sectorScore + riskScore;
    const adjustablePool = 1 - DEFAULT_DECISION_WEIGHTS.portfolio;

    if (totalSignalScore === 0) {
      console.log('Total signal score is zero, returning default weights');
      return DEFAULT_DECISION_WEIGHTS;
    }

    const rawWeights = {
      market: adjustablePool * (marketScore / totalSignalScore),
      sector: adjustablePool * (sectorScore / totalSignalScore),
      risk: adjustablePool * (riskScore / totalSignalScore),
      portfolio: DEFAULT_DECISION_WEIGHTS.portfolio
    };

    const clampedRawWeights = {
      market: Math.max(rawWeights.market, 0),
      sector: Math.max(rawWeights.sector, 0),
      risk: Math.max(rawWeights.risk, 0),
      portfolio: Math.max(rawWeights.portfolio, 0)
    };

    const normalizedWeights = normalizeWeights(clampedRawWeights);
    if (normalizedWeights.market + normalizedWeights.sector + normalizedWeights.risk + normalizedWeights.portfolio === 0) {
      return DEFAULT_DECISION_WEIGHTS;
    }

    const adaptFactor = Math.min(0.5, Math.log(totalDecisionCount || 1) / 10);

    const smoothedWeights = {
      market: DEFAULT_DECISION_WEIGHTS.market * (1 - adaptFactor) + normalizedWeights.market * adaptFactor,
      sector: DEFAULT_DECISION_WEIGHTS.sector * (1 - adaptFactor) + normalizedWeights.sector * adaptFactor,
      risk: DEFAULT_DECISION_WEIGHTS.risk * (1 - adaptFactor) + normalizedWeights.risk * adaptFactor,
      portfolio: DEFAULT_DECISION_WEIGHTS.portfolio
    };

    const clampedSmoothedWeights = {
      market: Math.max(smoothedWeights.market, 0),
      sector: Math.max(smoothedWeights.sector, 0),
      risk: Math.max(smoothedWeights.risk, 0),
      portfolio: Math.max(smoothedWeights.portfolio, 0)
    };

    let computedWeights = normalizeWeights(clampedSmoothedWeights);
    if (computedWeights.market + computedWeights.sector + computedWeights.risk + computedWeights.portfolio === 0) {
      return DEFAULT_DECISION_WEIGHTS;
    }

    const keys = ['market', 'sector', 'risk', 'portfolio'];
    let overweighted = false;
    let adjustedWeights = { ...computedWeights };

    keys.forEach(key => {
      if (adjustedWeights[key] > 0.5) {
        adjustedWeights[key] = adjustedWeights[key] * 0.9;
        overweighted = true;
      }
    });

    if (overweighted) {
      const total = adjustedWeights.market + adjustedWeights.sector + adjustedWeights.risk + adjustedWeights.portfolio;
      if (total > 0) {
        adjustedWeights = {
          market: adjustedWeights.market / total,
          sector: adjustedWeights.sector / total,
          risk: adjustedWeights.risk / total,
          portfolio: adjustedWeights.portfolio / total
        };
      } else {
        return DEFAULT_DECISION_WEIGHTS;
      }
    }

    console.log('Computed weights:', adjustedWeights);

    return adjustedWeights;
  } catch (error) {
    console.error('Error getting dynamic weights:', error);
    return DEFAULT_DECISION_WEIGHTS;
  }
}

export async function testDynamicWeights() {
  const { data: rows, count, error: countError } = await supabase
    .from('decision_history')
    .select('id', { count: 'exact' });

  if (countError) {
    throw new Error(`Failed to count decision_history rows: ${countError.message}`);
  }

  const existingCount = Number(count || 0);
  if (existingCount < 10) {
    const testEntries = [
      { market_sentiment: 'bullish', sector: 'technology', risk_level: 'high', accuracy_score: 0.75, outcome: 'win', created_at: new Date().toISOString() },
      { market_sentiment: 'bearish', sector: 'financials', risk_level: 'low', accuracy_score: -0.25, outcome: 'loss', created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { market_sentiment: 'neutral', sector: 'consumer', risk_level: 'medium', accuracy_score: 0.10, outcome: 'win', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { market_sentiment: 'bullish', sector: 'energy', risk_level: 'medium', accuracy_score: 0.45, outcome: 'win', created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      { market_sentiment: 'bearish', sector: 'technology', risk_level: 'high', accuracy_score: -0.55, outcome: 'loss', created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
      { market_sentiment: 'neutral', sector: 'healthcare', risk_level: 'low', accuracy_score: 0.20, outcome: 'win', created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { market_sentiment: 'bullish', sector: 'financials', risk_level: 'low', accuracy_score: 0.60, outcome: 'win', created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() },
      { market_sentiment: 'bearish', sector: 'consumer', risk_level: 'medium', accuracy_score: -0.15, outcome: 'loss', created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
      { market_sentiment: 'bullish', sector: 'energy', risk_level: 'high', accuracy_score: 0.35, outcome: 'win', created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() },
      { market_sentiment: 'neutral', sector: 'technology', risk_level: 'medium', accuracy_score: -0.05, outcome: 'loss', created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString() }
    ];

    const { error: insertError } = await supabase.from('decision_history').insert(testEntries);
    if (insertError) {
      throw new Error(`Failed to insert test decision_history rows: ${insertError.message}`);
    }
  }

  const { data: finalRows, error: finalError, count: finalCount } = await supabase
    .from('decision_history')
    .select('id', { count: 'exact' });

  if (finalError) {
    throw new Error(`Failed to re-count decision_history rows: ${finalError.message}`);
  }

  const weights = await getDynamicWeights();
  const signalImpact = await getSignalImpact();

  console.log('testDynamicWeights: totalDecisionCount', Number(finalCount || 0));
  console.log('testDynamicWeights: sampleSignalImpact', {
    market: Object.entries(signalImpact.market).slice(0, 3),
    sector: Object.entries(signalImpact.sector).slice(0, 3),
    risk: Object.entries(signalImpact.risk).slice(0, 3)
  });

  return { dynamicWeights: weights };
}

export async function runWeightCheck() {
  const result = await testDynamicWeights();
  return { dynamicWeights: result.dynamicWeights };
}

export async function cleanInvalidData({ purgeAll = false } = {}) {
  try {
    if (purgeAll) {
      const { data, error } = await supabase.from('decision_history').delete().neq('id', '');
      if (error) {
        throw new Error(`Failed to purge decision history: ${error.message}`);
      }
      return { deleted: data?.length ?? 0 };
    }

    const { data, error } = await supabase
      .from('decision_history')
      .delete()
      .in('accuracy_score', [1, -1]);

    if (error) {
      throw new Error(`Failed to delete invalid decision history: ${error.message}`);
    }

    return { deleted: data?.length ?? 0 };
  } catch (error) {
    console.error('Error cleaning invalid data:', error);
    throw error;
  }
}

export async function runRealisticTests() {
  try {
    await cleanInvalidData({ purgeAll: true });

    const testCases = [
      {
        name: 'BULLISH STRONG LOW BUY',
        action: 'buy',
        marketSentiment: 'bullish',
        sectorStrength: 'strong',
        riskLevel: 'low',
        sector: 'technology',
        entryPrice: 100,
        exitPrice: 105,
        expected: 0.05
      },
      {
        name: 'BEARISH WEAK HIGH BUY',
        action: 'buy',
        marketSentiment: 'bearish',
        sectorStrength: 'weak',
        riskLevel: 'high',
        sector: 'energy',
        entryPrice: 100,
        exitPrice: 95,
        expected: -0.05
      },
      {
        name: 'BULLISH WEAK MEDIUM HOLD',
        action: 'hold',
        marketSentiment: 'bullish',
        sectorStrength: 'weak',
        riskLevel: 'medium',
        sector: 'financials',
        entryPrice: 100,
        exitPrice: 104,
        expected: -0.04
      },
      {
        name: 'BEARISH STRONG LOW AVOID',
        action: 'avoid',
        marketSentiment: 'bearish',
        sectorStrength: 'strong',
        riskLevel: 'low',
        sector: 'healthcare',
        entryPrice: 100,
        exitPrice: 95,
        expected: 0.05
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      const decisionPayload = {
        score: 0,
        action: testCase.action,
        confidence: 'medium'
      };

      const inputs = {
        marketSentiment: testCase.marketSentiment,
        sectorStrength: testCase.sectorStrength,
        sector: testCase.sector,
        riskLevel: testCase.riskLevel,
        exposure: 0
      };

      const savedDecision = await saveDecisionHistory(null, decisionPayload, inputs, testCase.entryPrice);
      const updatedOutcome = await updateDecisionOutcome(savedDecision.id, testCase.exitPrice);

      const actual = updatedOutcome.accuracyScore;
      const pass = Math.abs(actual - testCase.expected) < 0.001;

      results.push({
        name: testCase.name,
        expected: testCase.expected,
        actual,
        pass
      });
    }

    const performanceSummary = await getDecisionPerformance(null);
    const actionKeys = Object.keys(performanceSummary.actionBreakdown || {});
    const signalImpact = await getSignalImpact();

    return {
      testResults: results,
      allTestsPassed: results.every(result => result.pass),
      performanceSummary,
      signalImpact
    };
  } catch (error) {
    console.error('Error running realistic tests:', error);
    throw error;
  }
}

/**
 * Save decision history to database
 * @param {string|null} userId - User ID
 * @param {object} decision - Decision result from buildDecision
 * @param {object} inputs - Raw inputs used for decision
 * @param {number} entryPrice - Entry price for the trade
 * @returns {object} - Inserted row data
 */
export async function saveDecisionHistory(userId, decision, inputs, entryPrice) {
  try {
    const { data, error } = await supabase
      .from('decision_history')
      .insert({
        user_id: userId,
        score: decision.score,
        action: decision.action,
        confidence: decision.confidence,
        market_sentiment: inputs.marketSentiment,
        sector: inputs.sector || inputs.sectorStrength,
        risk_level: inputs.riskLevel,
        portfolio_exposure: inputs.exposure,
        entry_price: entryPrice,
        horizon_days: 1
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save decision history: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error saving decision history:', error);
    throw error;
  }
}

/**
 * Update decision outcome based on exit price
 * @param {string} decisionId - Decision history ID
 * @param {number} exitPrice - Exit price for the trade
 * @returns {object} - { outcome, accuracyScore }
 */
export async function updateDecisionOutcome(decisionId, exitPrice) {
  try {
    // Fetch the decision record
    const { data: decision, error: fetchError } = await supabase
      .from('decision_history')
      .select('entry_price, action')
      .eq('id', decisionId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch decision: ${fetchError.message}`);
    }

    if (!decision) {
      throw new Error('Decision not found');
    }

    // Calculate percentage change
    const entryPrice = decision.entry_price;
    const change = (exitPrice - entryPrice) / entryPrice;

    // Determine outcome based on rules
    let outcome;
    if (change > 0.02) {
      outcome = 'win';
    } else if (change < -0.02) {
      outcome = 'loss';
    } else {
      outcome = 'neutral';
    }

    // Calculate accuracy score based on action direction and magnitude
    const action = decision.action;
    const isHold = action === 'hold';

    let directionScore;
    if (action === 'buy' || action === 'accumulate') {
      directionScore = change >= 0 ? 1 : -1;
    } else if (action === 'avoid') {
      directionScore = change <= 0 ? 1 : -1;
    } else if (isHold) {
      directionScore = Math.abs(change) < 0.01 ? 1 : -1;
    } else {
      directionScore = 0;
    }

    const accuracyScore = directionScore * Math.abs(change);

    // Update the record
    const { error: updateError } = await supabase
      .from('decision_history')
      .update({
        exit_price: exitPrice,
        outcome: outcome,
        accuracy_score: accuracyScore
      })
      .eq('id', decisionId);

    if (updateError) {
      throw new Error(`Failed to update decision outcome: ${updateError.message}`);
    }

    return {
      outcome,
      accuracyScore: Math.round(accuracyScore * 10000) / 10000, // Round to 4 decimal places
      percentChange: Math.round(change * 10000) / 100 // Round to 2 decimal places for display
    };
  } catch (error) {
    console.error('Error updating decision outcome:', error);
    throw error;
  }
}

/**
 * Get decision performance metrics for a user
 * @param {string|null} userId - User ID
 * @returns {object} - Performance metrics
 */
export async function getDecisionPerformance(userId) {
  try {
    let query = supabase
      .from('decision_history')
      .select('action, outcome, accuracy_score')
      .not('outcome', 'is', null);

    // Handle null userId properly
    if (userId === null) {
      query = query.is('user_id', null);
    } else {
      query = query.eq('user_id', userId);
    }

    const { data: decisions, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch decision performance: ${error.message}`);
    }

    if (!decisions || decisions.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        avgAccuracy: 0,
        actionBreakdown: {}
      };
    }

    const totalTrades = decisions.length;
    const wins = decisions.filter(d => d.outcome === 'win').length;
    const winRate = Math.round((wins / totalTrades) * 100);

    const totalAccuracy = decisions.reduce((sum, d) => sum + d.accuracy_score, 0);
    const avgAccuracy = Math.round((totalAccuracy / totalTrades) * 100) / 100;

    // Calculate action breakdown
    const actionBreakdown = {};
    decisions.forEach(decision => {
      const action = decision.action;
      if (!actionBreakdown[action]) {
        actionBreakdown[action] = { total: 0, wins: 0, accuracy: 0 };
      }
      actionBreakdown[action].total += 1;
      if (decision.outcome === 'win') {
        actionBreakdown[action].wins += 1;
      }
      actionBreakdown[action].accuracy += decision.accuracy_score;
    });

    // Calculate win rates and average accuracy for each action
    Object.keys(actionBreakdown).forEach(action => {
      const breakdown = actionBreakdown[action];
      breakdown.winRate = Math.round((breakdown.wins / breakdown.total) * 100);
      breakdown.avgAccuracy = Math.round((breakdown.accuracy / breakdown.total) * 100) / 100;
    });

    return {
      totalTrades,
      winRate,
      avgAccuracy,
      actionBreakdown
    };
  } catch (error) {
    console.error('Error getting decision performance:', error);
    throw error;
  }
}

/**
 * Test function for decision memory system
 * @returns {object} - { savedDecision, updatedOutcome, performanceSummary }
 */
export async function testDecisionMemory() {
  try {
    // Test user ID (null for testing - will fail FK constraint)
    const testUserId = null;

    // Step 1: Simulate a decision
    const mockDecision = {
      score: 0.6,
      action: 'buy',
      confidence: 'medium'
    };

    // Step 2: Simulate inputs
    const mockInputs = {
      marketSentiment: 'positive',
      sectorStrength: 'IT',
      riskLevel: 'low',
      exposure: 15
    };

    // Step 3: Simulate entry price
    const entryPrice = 100;

    console.log('Testing Decision Memory System...');
    console.log('==================================');

    // Step 4: Save decision history (real DB insert)
    console.log('1. Saving decision history...');
    const savedDecision = await saveDecisionHistory(testUserId, mockDecision, mockInputs, entryPrice);
    console.log('✓ Decision saved:', savedDecision.id);

    // Step 5: Simulate exit price (5% gain)
    const exitPrice = 105;

    // Step 6: Update decision outcome (real DB update)
    console.log('2. Updating decision outcome...');
    const updatedOutcome = await updateDecisionOutcome(savedDecision.id, exitPrice);
    console.log('✓ Outcome updated:', updatedOutcome);

    // Step 7: Fetch performance metrics (real DB query)
    console.log('3. Fetching performance metrics...');
    const performanceSummary = await getDecisionPerformance(testUserId);
    console.log('✓ Performance fetched:', performanceSummary);

    console.log('==================================');
    console.log('Decision Memory Test Complete!');

    return {
      savedDecision,
      updatedOutcome,
      performanceSummary
    };

  } catch (error) {
    console.error('Decision Memory Test Failed:', error);
    throw error;
  }
}

/**
 * Get signal patterns for market sentiment, sector, and risk level
 * @returns {object} - Signal patterns with avgAccuracy, winRate, count per group
 */
export async function getSignalPatterns() {
  try {
    const { data, error } = await supabase
      .from('decision_history')
      .select('market_sentiment, sector, risk_level, accuracy_score, outcome')
      .not('accuracy_score', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch signal patterns: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return {
        market: {},
        sector: {},
        risk: {}
      };
    }

    const patterns = {
      market: {},
      sector: {},
      risk: {}
    };

    // Group by market_sentiment
    data.forEach(row => {
      const sentiment = (row.market_sentiment || 'unknown').toString().toLowerCase();
      if (!patterns.market[sentiment]) {
        patterns.market[sentiment] = { totalAccuracy: 0, wins: 0, count: 0 };
      }
      patterns.market[sentiment].totalAccuracy += Number(row.accuracy_score) || 0;
      if (row.outcome === 'win') patterns.market[sentiment].wins += 1;
      patterns.market[sentiment].count += 1;
    });

    // Group by sector
    data.forEach(row => {
      const sect = (row.sector || 'unknown').toString().toLowerCase();
      if (!patterns.sector[sect]) {
        patterns.sector[sect] = { totalAccuracy: 0, wins: 0, count: 0 };
      }
      patterns.sector[sect].totalAccuracy += Number(row.accuracy_score) || 0;
      if (row.outcome === 'win') patterns.sector[sect].wins += 1;
      patterns.sector[sect].count += 1;
    });

    // Group by risk_level
    data.forEach(row => {
      const risk = (row.risk_level || 'unknown').toString().toLowerCase();
      if (!patterns.risk[risk]) {
        patterns.risk[risk] = { totalAccuracy: 0, wins: 0, count: 0 };
      }
      patterns.risk[risk].totalAccuracy += Number(row.accuracy_score) || 0;
      if (row.outcome === 'win') patterns.risk[risk].wins += 1;
      patterns.risk[risk].count += 1;
    });

    // Compute statistics for each group
    const computeStats = (groups) => {
      const result = {};
      Object.entries(groups).forEach(([key, bucket]) => {
        result[key] = {
          avgAccuracy: bucket.count ? Math.round((bucket.totalAccuracy / bucket.count) * 10000) / 10000 : 0,
          winRate: bucket.count ? Math.round((bucket.wins / bucket.count) * 100) : 0,
          count: bucket.count
        };
      });
      return result;
    };

    return {
      market: computeStats(patterns.market),
      sector: computeStats(patterns.sector),
      risk: computeStats(patterns.risk)
    };
  } catch (error) {
    console.error('Error getting signal patterns:', error);
    throw error;
  }
}