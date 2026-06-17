import { getSignalPatterns, getDynamicWeights, getRealPatterns } from './decision-memory.js';
import { createTradeRecord } from './trade-journal.js';
import { getPortfolioState } from './portfolio-manager.js';
import { randomUUID } from 'crypto';

// Quant-specific functions moved from decision-engine.js

function round(value) {
  return Math.round(value * 100) / 100;
}

function normalizeInputs(marketSentiment, sectorStrength, riskLevel, exposure, regime = 'sideways') {
  return {
    marketSentiment: marketSentiment || 'neutral',
    sectorStrength: sectorStrength || 'weak',
    riskLevel: riskLevel || 'medium',
    regime: regime || 'sideways',
    exposure: exposure || 0
  };
}

function scoreMarketContext(marketSentiment) {
  const sentiment = (marketSentiment || '').toLowerCase();
  if (sentiment === 'bullish') return 0.15;
  if (sentiment === 'bearish') return -0.15;
  return 0;
}

function scoreRegimeContext(regime) {
  const normalized = (regime || '').toLowerCase();
  if (normalized === 'trending') return 0.1;
  if (normalized === 'volatile') return -0.1;
  return 0;
}

function scoreRiskContext(riskLevel) {
  const normalized = (riskLevel || '').toLowerCase();
  if (normalized === 'low') return 0.05;
  if (normalized === 'high') return -0.05;
  return 0;
}

function convertMarket(sentiment, patterns) {
  const key = (sentiment || '').toLowerCase();
  const data = patterns?.market?.[key];
  if (!data) return 0;
  const value = data.avgAccuracy * ((data.winRate || 0) / 100);
  return Number.isFinite(value) ? value : 0;
}

function convertSector(sector, patterns) {
  const key = (sector || '').toLowerCase();
  const data = patterns?.sector?.[key];
  if (!data) return 0;
  const value = data.avgAccuracy * ((data.winRate || 0) / 100);
  return Number.isFinite(value) ? value : 0;
}

function convertRisk(level, patterns) {
  const key = (level || '').toLowerCase();
  const data = patterns?.risk?.[key];
  if (!data) return 0;
  const value = data.avgAccuracy * ((data.winRate || 0) / 100);
  return Number.isFinite(value) ? value : 0;
}

function convertExposure(exposure) {
  if (exposure == null || isNaN(exposure)) return 0;
  if (exposure > 70) return -1;
  if (exposure > 40) return -0.5;
  return 0;
}

function convertToScores({ marketSentiment, sectorStrength, riskLevel, exposure }, patterns = null) {
  const scores = {
    market: convertMarket(marketSentiment, patterns),
    sector: convertSector(sectorStrength, patterns),
    risk: convertRisk(riskLevel, patterns),
    portfolio: convertExposure(exposure)
  };

  if (isNaN(scores.market)) scores.market = 0;
  if (isNaN(scores.sector)) scores.sector = 0;
  if (isNaN(scores.risk)) scores.risk = 0;
  if (isNaN(scores.portfolio)) scores.portfolio = 0;

  console.log('CONVERTED_SCORES:', scores);
  console.log('FINAL SCORES:', scores);

  return scores;
}

function calculateScore(inputs, weights = null, patterns = null) {
  const scores = convertToScores(inputs, patterns);
  const defaultWeights = { market: 0.25, sector: 0.30, risk: 0.25, portfolio: 0.20 };
  const w = weights || defaultWeights;

  const marketContribution = scores.market * w.market;
  const sectorContribution = scores.sector * w.sector;
  const riskContribution = scores.risk * w.risk;
  const portfolioContribution = scores.portfolio * w.portfolio;
  const marketContextContribution = scoreMarketContext(inputs.marketSentiment);
  const regimeContribution = scoreRegimeContext(inputs.regime);
  const riskContextContribution = scoreRiskContext(inputs.riskLevel);

  console.log('ADAPTIVE_WEIGHTS:', w);
  console.log('WEIGHTED_CONTRIBUTIONS:', {
    marketContribution,
    sectorContribution,
    riskContribution,
    portfolioContribution
  });
  console.log('MARKET_SCORE:', marketContextContribution);
  console.log('REGIME_SCORE:', regimeContribution);
  console.log('RISK_SCORE:', riskContextContribution);

  const score = marketContribution + sectorContribution + riskContribution + portfolioContribution + marketContextContribution + regimeContribution + riskContextContribution;
  console.log('FINAL_SCORE:', score);

  return {
    score,
    contributions: { market: marketContribution, sector: sectorContribution, risk: riskContribution, portfolio: portfolioContribution },
    contextContributions: { market: marketContextContribution, regime: regimeContribution, risk: riskContextContribution },
    scores,
    penalties: [],
    penaltyReasons: []
  };
}

function applyScorePenalties(scoreResult, inputs) {
  let { score, contributions } = scoreResult;
  const penalties = [];
  const penaltyReasons = [];

  // High risk penalty
  if (inputs.riskScore === -1) {
    const penalty = -0.1;
    score += penalty;
    penalties.push(penalty);
    penaltyReasons.push('high risk environment');
  }

  // Overexposure penalty
  if (inputs.portfolioScore < -0.15) {
    const penalty = -0.05;
    score += penalty;
    penalties.push(penalty);
    penaltyReasons.push('portfolio overexposure');
  }

  return {
    score,
    contributions,
    penalties,
    penaltyReasons
  };
}

function calculateConflictScore(contributions) {
  const values = [contributions.market, contributions.sector, contributions.risk];
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calculateConflict(scores) {
  if (!scores) return false;

  const values = Object.values(scores);

  const positive = values.filter(v => v > 0).length;
  const negative = values.filter(v => v < 0).length;

  return positive > 0 && negative > 0;
}

function calculateExecutionPlan(action, confidenceScore, currentPrice, volatility = 0.02, regime = null, accountSize = 100000) {
  if (action === 'hold' || action === 'avoid') {
    return {
      skip: true,
      reason: 'No-trade action'
    };
  }

  if (confidenceScore < 0.25) {
    return {
      skip: true,
      reason: 'Very low confidence trade filtered'
    };
  }

  if (!currentPrice || isNaN(currentPrice)) {
    console.warn("Invalid currentPrice for execution plan:", currentPrice);
    return null;
  }

  const entry = currentPrice;
  const vol = Math.min(Math.max(volatility, 0.015), 0.04);
  const k = confidenceScore > 0.6 ? 1.4 : 1.8;
  const stopDistancePct = vol * k;
  const stopLoss = currentPrice * (1 - stopDistancePct);

  let riskPercent;
  if (confidenceScore > 0.6) {
    riskPercent = 1.5;
  } else if (confidenceScore >= 0.25 && confidenceScore < 0.4) {
    riskPercent = 0.5;
  } else {
    riskPercent = 1;
  }
  const riskAmount = accountSize * (riskPercent / 100);
  const stopDistance = currentPrice - stopLoss;
  const quantity = stopDistance > 0 ? riskAmount / stopDistance : 0;

  if (quantity < 1) {
    return {
      skip: true,
      reason: 'Position too small'
    };
  }

  let rr;
  if (volatility > 0.04) {
    rr = 1.5;
  } else if (confidenceScore > 0.6) {
    rr = 2.5;
  } else {
    rr = 2;
  }

  let takeProfit = currentPrice + (stopDistance * rr);

  if (regime === 'bullish') {
    takeProfit = currentPrice + (stopDistance * (rr + 0.5));
  }

  if (regime === 'bearish') {
    takeProfit = currentPrice + (stopDistance * (rr - 0.5));
  }

  return {
    entry: round(currentPrice),
    stopLoss: round(stopLoss),
    takeProfit: round(takeProfit),
    riskPercent,
    quantity: round(quantity),
    riskRewardRatio: rr,
    tradeType: volatility > 0.04 ? 'high_volatility' : 'normal'
  };
}

function determineAction(score, scores) {
  const hasConflict = calculateConflict(scores);

  console.log("CONFLICT_CHECK:", {
    scores,
    hasConflict,
    score
  });

  if (hasConflict) {
    if (score > 0.1) return 'accumulate';
    if (score > -0.1) return 'hold';
    return 'avoid';
  }

  if (score > 0.5) return 'buy';
  if (score > 0.15) return 'accumulate';
  if (score > -0.15) return 'hold';
  return 'avoid';
}

function adjustContribution(contribution, pattern) {
  const strength = Math.abs(pattern) * 3;

  if (pattern > 0) {
    return contribution > 0
      ? contribution * (1 + strength)
      : contribution * (1 - strength);
  } else {
    return contribution > 0
      ? contribution * (1 - strength)
      : contribution * (1 + strength);
  }
}

function calculateAdvancedConfidence({
  finalScore,
  contributions,
  patterns,
  conflictScore
}) {
  // 1. Pattern Trust: average of absolute avgAccuracy
  const marketAccuracy = patterns.market;
  const sectorAccuracy = patterns.sector;
  const riskAccuracy = patterns.risk;
  const patternTrust = (marketAccuracy + sectorAccuracy + riskAccuracy) / 3;

  // 2. Signal Agreement: based on signs of contributions
  const signs = [contributions.market, contributions.sector, contributions.risk, contributions.portfolio].map(c => Math.sign(c));
  const positiveCount = signs.filter(s => s > 0).length;
  const negativeCount = signs.filter(s => s < 0).length;
  const total = signs.length;
  let signalAgreement;
  if (positiveCount === total) {
    signalAgreement = 1; // all positive
  } else if (negativeCount === total) {
    signalAgreement = 0; // opposite (all negative)
  } else {
    signalAgreement = 0.5; // mixed
  }

  // 3. Normalized Score
  const normalizedScore = Math.min(Math.abs(finalScore), 1);

  // 4. Combine confidence score
  const confidenceScore = 
    (patternTrust * 0.4) +
    (signalAgreement * 0.2) +
    ((1 - conflictScore) * 0.2) +
    (normalizedScore * 0.2);

  // 5. Convert to level
  let confidenceLevel;
  if (confidenceScore > 0.7) {
    confidenceLevel = 'high';
  } else if (confidenceScore > 0.4) {
    confidenceLevel = 'medium';
  } else {
    confidenceLevel = 'low';
  }

  // 6. Return
  return {
    confidenceScore,
    confidenceLevel
  };
}

function calculatePositionSize({ action, confidenceScore }) {
  let positionSize;
  if (action === 'buy') positionSize = 0.6;
  else if (action === 'accumulate') positionSize = 0.3;
  else if (action === 'hold') positionSize = 0.1;
  else positionSize = 0;

  return {
    positionSize,
    sizeLabel: action === 'buy' ? 'large' : action === 'accumulate' ? 'medium' : action === 'hold' ? 'small' : 'none'
  };
}

function applyRiskDominance({
  action,
  confidenceScore,
  positionSize,
  patterns,
  riskKey
}) {
  const riskPattern = patterns.risk?.[riskKey];

  if (!riskPattern) {
    return {
      action,
      positionSize,
      override: "none"
    };
  }

  if (riskPattern.avgAccuracy < 0 || riskPattern.winRate < 40) {
    return {
      action: "avoid",
      positionSize: 0,
      override: "bad_risk"
    };
  } else if (riskPattern.avgAccuracy < 0.03) {
    return {
      action,
      positionSize: positionSize * 0.5,
      override: "weak_risk"
    };
  } else {
    return {
      action,
      positionSize,
      override: "none"
    };
  }
}

function getActionPerformance(decisionHistory) {
  const actions = ['buy', 'accumulate', 'hold', 'avoid'];
  const performance = {};

  actions.forEach(action => {
    const actionDecisions = decisionHistory.filter(d => d.action === action);
    const count = actionDecisions.length;
    if (count === 0) {
      performance[action] = {
        avgAccuracy: 0,
        winRate: 0,
        count: 0
      };
      return;
    }
    const totalAccuracy = actionDecisions.reduce((sum, d) => sum + (d.accuracy || 0), 0);
    const avgAccuracy = totalAccuracy / count;
    const wins = actionDecisions.filter(d => d.outcome === 'win').length;
    const winRate = (wins / count) * 100;
    performance[action] = {
      avgAccuracy,
      winRate,
      count
    };
  });

  return performance;
}

function applyDecisionFeedback({
  action,
  confidenceScore,
  positionSize,
  actionPerformance
}) {
  const perf = actionPerformance[action];
  if (!perf || perf.count < 5) {
    console.log("FEEDBACK_DEBUG:", {
      action,
      count: perf?.count,
      feedback: "insufficient_data"
    });

    return {
      confidenceScore,
      positionSize,
      feedback: "insufficient_data"
    };
  }

  if (perf.winRate < 40) {
    const adjusted = {
      confidenceScore: Math.max(0, Math.min(1, confidenceScore * 0.7)),
      positionSize: Math.max(0, Math.min(1, positionSize * 0.5)),
      feedback: "penalized_bad_action"
    };
    console.log("FEEDBACK_DEBUG:", {
      action,
      count: perf.count,
      feedback: adjusted.feedback
    });
    return adjusted;
  } else if (perf.winRate > 65) {
    const adjusted = {
      confidenceScore: Math.max(0, Math.min(1, confidenceScore * 1.2)),
      positionSize: Math.max(0, Math.min(1, positionSize * 1.2)),
      feedback: "boosted_good_action"
    };
    console.log("FEEDBACK_DEBUG:", {
      action,
      count: perf.count,
      feedback: adjusted.feedback
    });
    return adjusted;
  } else {
    console.log("FEEDBACK_DEBUG:", {
      action,
      count: perf.count,
      feedback: "neutral"
    });
    return {
      confidenceScore,
      positionSize,
      feedback: "neutral"
    };
  }
}

// Enhanced regime detection with volatility
function detectRegime({ marketSentiment, volatility }) {
  const sentiment = (marketSentiment || '').toLowerCase();

  if ((sentiment === 'bullish' || sentiment === 'positive') && (volatility || 0) < 0.03) {
    return 'trend';
  }
  if ((sentiment === 'bullish' || sentiment === 'positive') && (volatility || 0) >= 0.03) {
    return 'breakout';
  }
  if (sentiment === 'bearish' || sentiment === 'negative') {
    return 'defensive';
  }
  return 'sideways';
}

const STRATEGIES = {
  trend: {
    actionBias: 'accumulate',
    riskMultiplier: 1.2,
    description: 'Stable uptrend - accumulate positions with standard risk'
  },
  breakout: {
    actionBias: 'buy',
    riskMultiplier: 0.8,
    description: 'Volatile uptrend - take strong buy signals but reduce position size'
  },
  defensive: {
    actionBias: 'avoid',
    riskMultiplier: 0.5,
    description: 'Bearish market - avoid new positions, reduce exposure'
  },
  sideways: {
    actionBias: 'hold',
    riskMultiplier: 0.6,
    description: 'Neutral conditions - hold existing positions, cautious'
  }
};

function applyStrategy({ action, positionSize, regime, strategy }) {
  if (!strategy) return { action, positionSize };

  // Apply action bias if confidence in original action is low
  let adjustedAction = action;
  if (action === 'hold' || action === 'avoid') {
    adjustedAction = strategy.actionBias;
  }

  // Apply risk multiplier to position size
  const adjustedPositionSize = Math.max(0, Math.min(positionSize * strategy.riskMultiplier, 1));

  console.log('STRATEGY_APPLIED:', {
    regime,
    originalAction: action,
    adjustedAction,
    originalPositionSize: positionSize,
    adjustedPositionSize,
    riskMultiplier: strategy.riskMultiplier
  });

  return {
    action: adjustedAction,
    positionSize: adjustedPositionSize
  };
}

function detectMarketRegime(marketSentiment) {
  const sentiment = (marketSentiment || '').toLowerCase();

  if (sentiment === 'bullish' || sentiment === 'positive') {
    return 'bullish';
  }

  if (sentiment === 'bearish' || sentiment === 'negative') {
    return 'bearish';
  }

  return 'sideways';
}

function applyMarketRegime({
  regime,
  action,
  confidenceScore,
  positionSize
}) {
  if (regime === 'bullish') {
    return {
      action,
      confidenceScore: confidenceScore * 1.1,
      positionSize: Math.max(0, Math.min(positionSize * 1.2, 1))
    };
  }

  if (regime === 'bearish') {
    return {
      action: action === 'buy' ? 'accumulate' : action,
      confidenceScore: confidenceScore * 0.8,
      positionSize: Math.max(0, Math.min(positionSize * 0.6, 1))
    };
  }

  return {
    action: action === 'buy' ? 'hold' : action,
    confidenceScore: confidenceScore * 0.7,
    positionSize: Math.max(0, Math.min(positionSize * 0.5, 1))
  };
}

function buildDecision(marketSentiment, sectorStrength, riskLevel, exposure, weights = null, patterns = null, regime = 'sideways') {
  // Step 1: Normalize inputs safely
  const inputs = normalizeInputs(marketSentiment, sectorStrength, riskLevel, exposure, regime);

  // Step 2: Calculate base score
  const scoreResult = calculateScore(inputs, weights, patterns);

  // Step 3: Apply score penalties for real-world complexity
  const penalizedResult = applyScorePenalties(scoreResult, {
    marketScore: scoreResult.scores.market,
    sectorScore: scoreResult.scores.sector,
    riskScore: scoreResult.scores.risk,
    portfolioScore: scoreResult.scores.portfolio
  });

  // Step 4: Determine action based on final score
  console.log("FINAL SCORES BEFORE ACTION:", scoreResult.scores);
  const action = determineAction(penalizedResult.score, scoreResult.scores);

  // Step 5: Calculate confidence with damping and conflict awareness
  const conflictScore = calculateConflictScore(penalizedResult.contributions);
  const { confidenceScore, confidenceLevel } = calculateAdvancedConfidence({
    finalScore: penalizedResult.score,
    contributions: penalizedResult.contributions,
    patterns: { market: 0, sector: 0, risk: 0 },
    conflictScore
  });
  const confidence = confidenceLevel;
  const { positionSize, sizeLabel } = calculatePositionSize({ action, confidenceScore });

  // Step 6: Generate sophisticated explanation
  const explanation = 'Base decision without patterns.';

  return {
    score: penalizedResult.score,
    action: action,
    confidence: confidence,
    confidenceScore: confidenceScore,
    conflictScore: conflictScore,
    explanation: explanation,
    contributions: penalizedResult.contributions,
    penalties: penalizedResult.penalties,
    penaltyReasons: penalizedResult.penaltyReasons,
    positionSize,
    positionLabel: sizeLabel,
    riskMultiplier: 1
  };
}

async function buildDecisionWithPatternAdjustments(
  marketSentiment,
  sectorStrength,
  riskLevel,
  exposure,
  weights = null,
  patterns = null,
  sector = null,
  volatility = 0.02,
  regime = 'sideways',
  userId = null
) {
  // Get base decision (contributions unchanged)
  const baseDecision = buildDecision(marketSentiment, sectorStrength, riskLevel, exposure, weights, patterns, regime);
  const rawScore = baseDecision.score;
  const patternContributions = {
    market: baseDecision.contributions.market,
    sector: baseDecision.contributions.sector,
    risk: baseDecision.contributions.risk,
    portfolio: baseDecision.contributions.portfolio
  };
  console.log("PATTERN_CONTRIBUTIONS:", patternContributions);
  console.log("RAW_SCORE:", rawScore);

  // If patterns available, apply pattern-aware contribution multipliers
  const hasPatterns = patterns && (
    Object.keys(patterns.market || {}).length > 0 ||
    Object.keys(patterns.sector || {}).length > 0 ||
    Object.keys(patterns.risk || {}).length > 0
  );

  if (hasPatterns) {
    const marketKey = (marketSentiment || 'neutral').toLowerCase();
    const sectorKey = (sector || sectorStrength || 'weak').toLowerCase();
    const riskKey = (riskLevel || 'medium').toLowerCase();

    const marketContribution = baseDecision.contributions.market;
    const sectorContribution = baseDecision.contributions.sector;
    const riskContribution = baseDecision.contributions.risk;

    const marketPattern = patterns.market?.[marketKey]?.avgAccuracy ?? 0;
    const sectorPattern = patterns.sector?.[sectorKey]?.avgAccuracy ?? 0;
    const riskPattern = patterns.risk?.[riskKey]?.avgAccuracy ?? 0;

    console.log('MARKET_PATTERN:', marketPattern);
    console.log('SECTOR_PATTERN:', sectorPattern);
    console.log('RISK_PATTERN:', riskPattern);

    const adjustedContributions = {
      ...baseDecision.contributions,
      market: Math.round(adjustContribution(marketContribution, marketPattern) * 10000) / 10000,
      sector: Math.round(adjustContribution(sectorContribution, sectorPattern) * 10000) / 10000,
      risk: Math.round(adjustContribution(riskContribution, riskPattern) * 10000) / 10000
    };

    const contextContributions = {
      market: scoreMarketContext(marketSentiment),
      regime: scoreRegimeContext(regime),
      risk: scoreRiskContext(riskLevel)
    };
    const contextScore = contextContributions.market + contextContributions.regime + contextContributions.risk;

    console.log('PATTERN_CONTRIBUTIONS:', {
      marketContribution,
      sectorContribution,
      riskContribution,
      portfolioContribution: baseDecision.contributions.portfolio
    });

    console.log("SIGN_AWARE_DEBUG:", {
      market: adjustedContributions.market,
      sector: adjustedContributions.sector,
      risk: adjustedContributions.risk
    });

    const finalScore = Math.round(
      (
        adjustedContributions.market +
        adjustedContributions.sector +
        adjustedContributions.risk +
        adjustedContributions.portfolio +
        contextScore
      ) * 1000
    ) / 1000;

    const afterPatternScore = finalScore;
    console.log("AFTER_PATTERN_SCORE:", afterPatternScore);
    console.log("PATTERN_CONTRIBUTIONS:", adjustedContributions);

    const scaledScore = finalScore * 5;

    console.log("SCALED_SCORE:", scaledScore);
    console.log("FINAL SCORES BEFORE ACTION:", adjustedContributions);

    const finalAction = determineAction(scaledScore, adjustedContributions);
    
    console.log("FINAL_ACTION_CHECK:", {
      finalScore,
      finalAction
    });

    // If conflict detected, return decision without further adjustments
    const hasConflict = calculateConflict(adjustedContributions);
    if (hasConflict) {
      console.log("CONFLICT_OVERRIDE: Skipping regime/risk adjustments for conflicting signals");
      return {
        score: finalScore,
        action: finalAction,
        confidence: 'medium', // default for conflict
        confidenceScore: 0.4,
        positionSize: 0.1, // small position for hold
        positionLabel: 'small',
        marketRegime: detectMarketRegime(marketSentiment),
        riskOverride: 'none',
        decisionFeedback: 'conflict_detected',
        conflictScore: calculateConflictScore(adjustedContributions),
        explanation: 'Conflicting signals detected - holding position',
        contributions: adjustedContributions,
        contextContributions,
        penalties: baseDecision.penalties,
        penaltyReasons: baseDecision.penaltyReasons,
        patternEnhanced: true,
        baseScore: baseDecision.score,
        baseAction: baseDecision.action
      };
    }
    
    const conflictScore = calculateConflictScore(adjustedContributions);
    
    const marketAccuracy = Math.abs(patterns.market?.[marketKey]?.avgAccuracy ?? 0);
    const sectorAccuracy = Math.abs(patterns.sector?.[sectorKey]?.avgAccuracy ?? 0);
    const riskAccuracy = Math.abs(patterns.risk?.[riskKey]?.avgAccuracy ?? 0);
    
    const {
      confidenceScore,
      confidenceLevel
    } = calculateAdvancedConfidence({
      finalScore,
      contributions: adjustedContributions,
      patterns: { market: marketAccuracy, sector: sectorAccuracy, risk: riskAccuracy },
      conflictScore
    });
    
    const {
      positionSize,
      sizeLabel
    } = calculatePositionSize({
      action: finalAction,
      confidenceScore
    });
    
    const riskAdjusted = applyRiskDominance({
      action: finalAction,
      confidenceScore,
      positionSize,
      patterns,
      riskKey
    });
    
    const decisionHistory = []; // TODO: implement decision history fetching
    const actionPerformance = getActionPerformance(decisionHistory);
    const feedbackAdjusted = applyDecisionFeedback({
      action: riskAdjusted.action,
      confidenceScore,
      positionSize: riskAdjusted.positionSize,
      actionPerformance
    });

    const baseMarketRegime = detectMarketRegime(marketSentiment);
    const enhancedRegime = detectRegime({ marketSentiment, volatility });
    const strategy = STRATEGIES[enhancedRegime];
    const regimeAdjusted = applyMarketRegime({
      regime: baseMarketRegime,
      action: riskAdjusted.action,
      confidenceScore: feedbackAdjusted.confidenceScore,
      positionSize: feedbackAdjusted.positionSize
    });

    const strategyAdjusted = applyStrategy({
      action: regimeAdjusted.action,
      positionSize: regimeAdjusted.positionSize,
      regime: enhancedRegime,
      strategy
    });
    
    const afterFeedbackScore = finalScore;
    console.log("AFTER_FEEDBACK_SCORE:", afterFeedbackScore);

    const afterRegimeScore = finalScore;
    console.log("AFTER_REGIME_SCORE:", afterRegimeScore);

    const finalExplanation = 'Pattern-enhanced decision with strategy adaptation.';

    console.log("FINAL_SCORE:", finalScore);
    console.log("CONFIDENCE_SCORE:", regimeAdjusted.confidenceScore);
    console.log("CONFIDENCE_DEBUG:", {
      finalScore,
      confidenceScore,
      confidenceLevel
    });
    
    console.log("POSITION_DEBUG:", {
      action: finalAction,
      confidenceScore,
      positionSize,
      sizeLabel
    });
    
    console.log("RISK_DEBUG:", {
      riskKey,
      riskPattern: patterns.risk?.[riskKey],
      override: riskAdjusted.override
    });

    console.log("FEEDBACK_DEBUG:", {
      action: riskAdjusted.action,
      performance: actionPerformance[riskAdjusted.action],
      feedback: feedbackAdjusted.feedback
    });

    console.log("REGIME_DEBUG:", {
      regime,
      adjustedAction: regimeAdjusted.action,
      adjustedConfidence: regimeAdjusted.confidenceScore,
      adjustedSize: regimeAdjusted.positionSize
    });

    console.log("REGIME:", enhancedRegime);
    console.log("STRATEGY:", {
      name: enhancedRegime,
      ...strategy
    });
    
    const patternBoost = Math.round((finalScore - baseDecision.score) * 10000) / 10000;

    return {
      score: finalScore,
      action: strategyAdjusted.action,
      confidence: confidenceLevel,
      confidenceScore: regimeAdjusted.confidenceScore,
      positionSize: strategyAdjusted.positionSize,
      positionLabel: sizeLabel,
      marketRegime: regime,
      enhancedRegime,
      strategy: enhancedRegime,
      riskMultiplier: strategy?.riskMultiplier ?? 1,
      riskOverride: riskAdjusted.override,
      decisionFeedback: feedbackAdjusted.feedback,
      conflictScore: conflictScore,
      explanation: finalExplanation,
      contributions: adjustedContributions,
      contextContributions,
      penalties: baseDecision.penalties,
      penaltyReasons: baseDecision.penaltyReasons,
      patternEnhanced: true,
      patternBoost,
      baseScore: baseDecision.score,
      baseAction: baseDecision.action
    };
  }

  // Return base decision if no patterns
  const baseRegime = detectMarketRegime(marketSentiment);
  const baseEnhanced = detectRegime({ marketSentiment, volatility });
  return {
    ...baseDecision,
    patternEnhanced: false,
    marketRegime: baseRegime,
    enhancedRegime: baseEnhanced,
    strategy: baseEnhanced
  };
}

export async function buildDecisionAsync(
  marketSentiment,
  sectorStrength,
  riskLevel,
  exposure,
  weights = null,
  sector = null,
  regime = 'sideways',
  userId = null
) {
  console.log('BUILD_DECISION_ASYNC_REGIME:', regime);
  // Use real patterns if userId is available, otherwise fall back to signal patterns
  let patterns;
  if (userId) {
    patterns = await getRealPatterns(userId);
  } else {
    patterns = await getSignalPatterns();
  }
  
  if (!weights) {
    weights = getDynamicWeights ? await getDynamicWeights(userId) : null;
  }
  return buildDecisionWithPatternAdjustments(
    marketSentiment,
    sectorStrength,
    riskLevel,
    exposure,
    weights,
    patterns,
    sector,
    0.02, // default volatility
    regime,
    userId
  );
}

export async function runQuantEngine(input, userId = null) {
  const { marketSentiment, sector, riskLevel, exposure, currentPrice, regime } = input;
  const volatility = input.volatility || 0.02;

  const normalized = normalizeInputs(marketSentiment, sector, riskLevel, exposure, regime);

  const weights = getDynamicWeights ? await getDynamicWeights(userId) : null;

  let patterns = {
    market: {},
    sector: {},
    risk: {}
  };

  try {
    // Use real patterns if userId is available, otherwise fall back to signal patterns
    if (userId) {
      patterns = await getRealPatterns(userId);
    } else {
      patterns = await getSignalPatterns();
    }
  } catch (error) {
    console.warn('Quant engine: failed to load patterns, using fallback defaults.', error);
  }

  const hasPatterns = patterns && (
    Object.keys(patterns.market || {}).length > 0 ||
    Object.keys(patterns.sector || {}).length > 0 ||
    Object.keys(patterns.risk || {}).length > 0
  );

  if (!hasPatterns) {
    patterns = {
      market: {
        bullish: { avgAccuracy: 0.08, winRate: 80 },
        bearish: { avgAccuracy: -0.06, winRate: 20 },
        neutral: { avgAccuracy: 0, winRate: 50 }
      },
      sector: {
        technology: { avgAccuracy: 0.05, winRate: 70 },
        financials: { avgAccuracy: -0.02, winRate: 40 }
      },
      risk: {
        low: { avgAccuracy: 0.06, winRate: 80 },
        medium: { avgAccuracy: 0.02, winRate: 60 },
        high: { avgAccuracy: -0.07, winRate: 20 }
      }
    };

    console.log('USING MOCK PATTERNS');
  }

  const result = await buildDecisionWithPatternAdjustments(
    normalized.marketSentiment,
    normalized.sectorStrength,
    normalized.riskLevel,
    normalized.exposure,
    weights,
    patterns,
    sector,
    volatility,
    regime
  );

  const execution = calculateExecutionPlan(result.action, result.confidenceScore, currentPrice, volatility, regime, input.accountSize);

  let tradeId = null;
  if (execution && !execution.skip) {
    const tradeRecord = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      input: {
        marketSentiment: normalized.marketSentiment,
        sector: normalized.sectorStrength,
        riskLevel: normalized.riskLevel,
        volatility
      },
      decision: {
        action: result.action,
        confidenceScore: result.confidenceScore,
        score: result.score
      },
      execution,
      status: 'open'
    };

    try {
      // Check portfolio state for the user
      const portfolio = await getPortfolioState(userId);

      if (!portfolio.allowNewTrade) {
        console.log('NEW_TRADE_BLOCKED: portfolio heat limit reached', { portfolioHeat: portfolio.portfolioHeat });
        // override action to hold and annotate reason
        tradeRecord.decision.action = 'hold';
        tradeRecord.decision.reason = 'portfolio_heat_limit';
        // adjust position size to zero
        if (tradeRecord.execution) {
          tradeRecord.execution.finalPosition = 0;
        }
      } else {
        // apply size multiplier to final position
        const multiplier = portfolio.sizeMultiplier || 1;
        if (tradeRecord.execution && typeof tradeRecord.execution.finalPosition === 'number') {
          tradeRecord.execution.finalPosition = Math.round(tradeRecord.execution.finalPosition * multiplier * 10000) / 10000;
        }
      }

      await createTradeRecord(tradeRecord);
      tradeId = tradeRecord.id;
      console.log('Trade stored:', tradeId);
    } catch (error) {
      console.error('Failed to store trade:', error);
    }
  }

  return {
    action: result.action,
    confidenceScore: result.confidenceScore,
    score: result.score,
    patternEnhanced: result.patternEnhanced,
    execution,
    tradeId
  };
}

export {
  getDynamicWeights,
  calculateScore,
  applyScorePenalties,
  calculateConflictScore,
  determineAction,
  adjustContribution,
  calculateAdvancedConfidence,
  calculatePositionSize,
  applyRiskDominance,
  getActionPerformance,
  applyDecisionFeedback,
  detectMarketRegime,
  detectRegime,
  applyStrategy,
  applyMarketRegime,
  buildDecision,
  buildDecisionWithPatternAdjustments,
  normalizeInputs,
  convertToScores,
  calculateExecutionPlan,
  calculateConflict
};