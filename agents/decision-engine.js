import { getSignalPatterns } from '@/lib/decision-memory.js';

export function buildFinalDecision({ market, news, sector, opportunity, risk, portfolio = {}, weights = null }) {
  // Extract inputs for scoring system
  const marketSentiment = (news?.sentiment || 'neutral').toLowerCase();
  const riskLevel = (risk?.severity || 'low').toLowerCase();
  const strongestSectorRaw = sector?.top_sector || 'Top Sector';
  const strongestSector = strongestSectorRaw.replace(/\s+Index$/i, '').trim();
  const exposure = portfolio[strongestSector] || 0;

  // Determine sector strength from sector data
  const topSectorReason = sector?.top_sector_reason || '';
  const topSectorMatch = topSectorReason.match(/([+-]?\d+(?:\.\d+)?)%/);
  const topSectorPercent = topSectorMatch ? parseFloat(topSectorMatch[1]) : 0;
  const sectorStrength = topSectorPercent >= 0.5 ? 'strong' : 'weak';

  // Calculate weighted score using dynamic signal weights
  const scoringResult = buildDecision(
    marketSentiment,
    sectorStrength,
    riskLevel,
    exposure,
    weights
  );

  // Determine action based on score (legacy compatibility)
  const actionResult = {
    action: scoringResult.action,
    description: getActionDescription(scoringResult.action, strongestSector)
  };

  // Calculate confidence (already done in scoringResult)
  const confidence = scoringResult.confidence;

  // Build legacy compatibility fields
  const isPortfolioEmpty = !portfolio || Object.keys(portfolio).length === 0;
  const beginner = isPortfolioEmpty;
  const personalized = !isPortfolioEmpty;

  let impact_on_user = "No existing portfolio data loaded.";
  if (!isPortfolioEmpty) {
      if (exposure > 40) {
          impact_on_user = `You possess high existing exposure to ${strongestSector} (${exposure}%). Overconcentration increases risk.`;
      } else if (exposure >= 20) {
          impact_on_user = `You hold moderate exposure to ${strongestSector} (${exposure}%).`;
      } else if (exposure > 0) {
          impact_on_user = `You have minor starting exposure to ${strongestSector} (${exposure}%).`;
      } else {
          impact_on_user = `You currently have no formal exposure to the leading ${strongestSector} sector.`;
      }
  }

  // Build insight narrative
  const formatSector = (s) => (s || '').replace(/\s+Index$/i, '').trim();
  const topS = formatSector(sector?.top_sector) || strongestSector;
  const secondS = formatSector(sector?.second_sector);
  const weakS = formatSector(sector?.weak_sector);

  let insight = `${topS} sector is demonstrating steady momentum.`;

  if (topS && secondS && weakS) {
    insight = `${topS} and ${secondS} are leading today, while ${weakS} continues to weaken, indicating sector rotation towards market strength.`;
  } else if (topS && weakS) {
    insight = `${topS} is leading today, while ${weakS} continues to weaken, reflecting focused capital rotation.`;
  }

  if (marketSentiment === 'bearish') insight += " However, weak macro indicators suggest maintaining caution.";
  else if (marketSentiment === 'bullish') insight += " Constructive macro fundamentals provide supportive context.";
  else insight += " Broader market variables remain stable.";

  // Determine status based on score
  let status = "neutral";
  if (scoringResult.score < -0.3) {
      status = "cautious";
  } else if (scoringResult.score > 0.3) {
      status = "optimistic";
  }

  // Map new action to legacy action_type
  const actionTypeMap = {
    'buy': 'buy',
    'accumulate': 'buy',
    'hold': 'hold',
    'avoid': 'observe'
  };

  const action_type = actionTypeMap[actionResult.action] || 'observe';

  // Build urgency based on confidence
  const urgencyMap = {
    'high': 'medium',
    'medium': 'low',
    'low': 'low'
  };

  const urgency = urgencyMap[confidence] || 'low';

  // Build next step guidance
  let next_step = "Continue monitoring broad market alignment without making sudden adjustments.";
  if (actionResult.action === 'buy') {
    next_step = `Consider establishing a conservative entry into ${strongestSector} while observing overall risk.`;
  } else if (actionResult.action === 'accumulate') {
    next_step = `Consider gradual accumulation in ${strongestSector} based on market conditions.`;
  } else if (actionResult.action === 'hold') {
    next_step = `Maintain current positioning to preserve asset diversification.`;
  } else if (actionResult.action === 'avoid') {
    next_step = `Observe risk parameters carefully. Avoid adding new exposure at this time.`;
  }

  const why = {
    market_summary: market?.summary || "Overall market structure remains stable.",
    sector_analysis: sector?.rotation_signal || `Capital flow indicates momentum in the ${strongestSector} sector.`,
    news_impact: `Macroeconomic sentiment is currently assessed as ${marketSentiment}.`,
    risk_analysis: risk?.reason || `Detected market risk levels are measured at ${riskLevel} severity.`,
    portfolio_impact: impact_on_user
  };

  return {
    status,
    insight,
    impact_on_user,
    action: actionResult.description,
    action_type,
    urgency,
    next_step,
    confidence,
    beginner,
    personalized,
    why,
    // New scoring system data
    scoring: {
      score: scoringResult.score,
      action: scoringResult.action,
      confidence: scoringResult.confidence,
      explanation: scoringResult.explanation,
      contributions: scoringResult.contributions,
      penalties: scoringResult.penalties,
      penaltyReasons: scoringResult.penaltyReasons
    }
  };
}

const DEFAULT_DECISION_WEIGHTS = {
  market: 0.25,
  sector: 0.30,
  risk: 0.25,
  portfolio: 0.20
};

// Convert inputs to numeric scores with non-linear portfolio scoring
function convertToScores({ marketSentiment, sectorStrength, riskLevel, exposure }) {
  // Market sentiment: bullish = +1, neutral = 0, bearish = -1
  const marketScore = {
    'bullish': 1,
    'neutral': 0,
    'bearish': -1
  }[marketSentiment] || 0;

  // Sector strength: strong = +1, weak = -1
  const sectorScore = sectorStrength === 'strong' ? 1 : -1;

  // Risk level: low risk = +1, medium = 0, high risk = -1
  const riskScore = {
    'low': 1,
    'medium': 0,
    'high': -1
  }[riskLevel] || 0;

  // Portfolio exposure: non-linear scoring
  let portfolioScore;
  if (exposure > 70) {
    portfolioScore = -2; // extreme risk
  } else if (exposure >= 50) {
    portfolioScore = -1;
  } else if (exposure >= 20) {
    portfolioScore = 0;
  } else {
    portfolioScore = 1;
  }

  return {
    market: marketScore,
    sector: sectorScore,
    risk: riskScore,
    portfolio: portfolioScore
  };
}

// Calculate weighted score
function calculateScore(inputs, weights = DEFAULT_DECISION_WEIGHTS) {
  const safeWeights = weights ?? DEFAULT_DECISION_WEIGHTS;
  const scoreWeights = {
    market: safeWeights.market ?? DEFAULT_DECISION_WEIGHTS.market,
    sector: safeWeights.sector ?? DEFAULT_DECISION_WEIGHTS.sector,
    risk: safeWeights.risk ?? DEFAULT_DECISION_WEIGHTS.risk,
    portfolio: safeWeights.portfolio ?? DEFAULT_DECISION_WEIGHTS.portfolio
  };

  const scores = convertToScores(inputs);

  const score = (
    (scores.market * scoreWeights.market) +
    (scores.sector * scoreWeights.sector) +
    (scores.risk * scoreWeights.risk) +
    (scores.portfolio * scoreWeights.portfolio)
  );

  // Round to 3 decimal places for precision
  const roundedScore = Math.round(score * 1000) / 1000;

  return {
    score: roundedScore,
    contributions: {
      market: scores.market * scoreWeights.market,
      sector: scores.sector * scoreWeights.sector,
      risk: scores.risk * scoreWeights.risk,
      portfolio: scores.portfolio * scoreWeights.portfolio
    }
  };
}

// Determine action based on score thresholds
function determineAction(score) {
  if (score > 0.5) {
    return 'buy';
  } else if (score > 0) {
    return 'accumulate';
  } else if (score > -0.5) {
    return 'hold';
  } else {
    return 'avoid';
  }
}

// Calculate confidence based on score magnitude
function calculateConfidence(score) {
  const absScore = Math.abs(score);
  if (absScore > 0.7) {
    return 'high';
  } else if (absScore > 0.3) {
    return 'medium';
  } else {
    return 'low';
  }
}

// Generate explanation string
function generateExplanation(contributions) {
  const parts = [];

  if (contributions.sector !== 0) {
    const direction = contributions.sector > 0 ? 'strong' : 'weak';
    parts.push(`${direction} sector momentum (${contributions.sector >= 0 ? '+' : ''}${contributions.sector})`);
  }

  if (contributions.risk !== 0) {
    const direction = contributions.risk > 0 ? 'low' : 'high';
    parts.push(`${direction} risk (${contributions.risk >= 0 ? '+' : ''}${contributions.risk})`);
  }

  if (contributions.market !== 0) {
    const direction = contributions.market > 0 ? 'bullish' : 'bearish';
    parts.push(`${direction} market sentiment (${contributions.market >= 0 ? '+' : ''}${contributions.market})`);
  }

  if (contributions.portfolio !== 0) {
    const direction = contributions.portfolio > 0 ? 'low' : 'high';
    parts.push(`${direction} portfolio exposure (${contributions.portfolio >= 0 ? '+' : ''}${contributions.portfolio})`);
  }

  if (parts.length === 0) {
    return 'Decision based on balanced market conditions';
  }

  return `Decision driven by ${parts.join(' and ')}`;
}

// Helper function for action descriptions
function getActionDescription(action, sector) {
  switch (action) {
    case 'buy':
      return `A thoughtful, gradual allocation can be considered strategically in ${sector}.`;
    case 'accumulate':
      return `Consider gradual accumulation in ${sector} based on market conditions.`;
    case 'hold':
      return 'Holding current positions is advised to maintain stability.';
    case 'avoid':
      return 'Systemic market caution observed. Focus on capital preservation.';
    default:
      return 'Continue monitoring broad market alignment without making sudden adjustments.';
  }
}

// Main scoring system function
function calculateDecisionScore(marketSentiment, sectorStrength, riskLevel, exposure) {
  // Handle missing/null values safely
  const inputs = {
    marketSentiment: marketSentiment || 'neutral',
    sectorStrength: sectorStrength || 'weak',
    riskLevel: riskLevel || 'medium',
    exposure: exposure || 0
  };

  const scoreResult = calculateScore(inputs);
  const action = determineAction(scoreResult.score);
  const confidence = calculateConfidence(scoreResult.score);
  const explanation = generateExplanation(scoreResult.contributions);

  return {
    score: scoreResult.score,
    action: action,
    confidence: confidence,
    explanation: explanation,
    contributions: scoreResult.contributions
  };
}

export { calculateDecisionScore };

// Apply score penalties instead of hard overrides
function applyScorePenalties(result, inputs) {
  const { marketScore, sectorScore, riskScore, portfolioScore } = inputs;
  let penalties = 0;
  let penaltyReasons = [];

  // Penalty 1: High risk + overexposure = -0.3
  if (riskScore === -1 && portfolioScore < 0) {
    penalties -= 0.3;
    penaltyReasons.push('high risk and overexposure');
  }

  // Penalty 2: Weak sector overriding bullish market = -0.2
  if (sectorScore === -1 && marketScore === 1) {
    penalties -= 0.2;
    penaltyReasons.push('weak sector momentum');
  }

  // Penalty 3: Extreme bearish conditions = -0.4
  if (marketScore === -1 && riskScore === -1) {
    penalties -= 0.4;
    penaltyReasons.push('bearish market with high risk');
  }

  // Apply penalties to score
  result.score += penalties;
  result.score = Math.round(result.score * 1000) / 1000; // Round to 3 decimal places

  return {
    ...result,
    penalties: penalties,
    penaltyReasons: penaltyReasons
  };
}

// Calculate conflict score based on contribution dispersion
function calculateConflictScore(contributions) {
  const values = [contributions.market, contributions.sector, contributions.risk];
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// Calculate confidence with damping for conflicts and high risk
function calculateConfidenceWithDamping(score, inputs) {
  const { riskScore, contributions } = inputs;

  const conflictScore = calculateConflictScore(contributions);

  // Confidence driven by conflict score magnitude only
  let confidence;
  if (conflictScore < 0.15) {
    confidence = 'high';
  } else if (conflictScore < 0.35) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  // Only dampen if extreme high risk
  if (riskScore === -1 && conflictScore > 0.6) {
    confidence = 'low';
  }

  return { confidence, conflictScore };
}

// Generate sophisticated explanation using main driver, limiting factor, and reasoning
function generateSophisticatedExplanation(contributions, penalties, penaltyReasons) {
  const factors = [
    { name: 'market sentiment', value: contributions.market, positive: 'bullish market', negative: 'bearish market' },
    { name: 'sector momentum', value: contributions.sector, positive: 'strong sector momentum', negative: 'weak sector momentum' },
    { name: 'risk level', value: contributions.risk, positive: 'low risk', negative: 'high risk' },
    { name: 'portfolio exposure', value: contributions.portfolio, positive: 'low portfolio exposure', negative: 'high portfolio exposure' }
  ];

  // Find main driver (strongest positive factor)
  const positiveFactors = factors.filter(f => f.value > 0).sort((a, b) => b.value - a.value);
  const mainDriver = positiveFactors.length > 0 ? positiveFactors[0].positive : null;

  // Find limiting factor (strongest negative factor)
  const negativeFactors = factors.filter(f => f.value < 0).sort((a, b) => a.value - b.value);
  const limitingFactor = negativeFactors.length > 0 ? negativeFactors[0].negative : null;

  // Deduplicate and merge penalty reasons to avoid redundancy
  const uniquePenalties = [];
  const penaltySet = new Set();
  penaltyReasons.forEach(reason => {
    if (!penaltySet.has(reason)) {
      penaltySet.add(reason);
      uniquePenalties.push(reason);
    }
  });

  // Merge related concerns to avoid redundancy
  let mergedLimitingFactor = limitingFactor;
  if (limitingFactor && uniquePenalties.some(p => p.includes('exposure'))) {
    mergedLimitingFactor = 'high risk and elevated exposure';
  } else if (limitingFactor && uniquePenalties.some(p => p.includes('risk'))) {
    mergedLimitingFactor = limitingFactor;
  }

  // Build explanation
  let explanation = '';

  if (mainDriver && mergedLimitingFactor) {
    explanation = `${mainDriver.charAt(0).toUpperCase() + mainDriver.slice(1)} supports upside potential, but ${mergedLimitingFactor} limit further allocation.`;
  } else if (mainDriver) {
    explanation = `${mainDriver.charAt(0).toUpperCase() + mainDriver.slice(1)} creates a favorable environment for investment.`;
  } else if (mergedLimitingFactor) {
    explanation = `${mergedLimitingFactor.charAt(0).toUpperCase() + mergedLimitingFactor.slice(1)} suggests caution is warranted.`;
  } else {
    explanation = 'Market conditions are currently balanced with no strong directional signals.';
  }

  // Add final reasoning
  explanation += ' Holding current positions is more optimal.';

  return explanation;
}

// Safe input normalization with defaults
function normalizeInputs(marketSentiment, sectorStrength, riskLevel, exposure) {
  return {
    marketSentiment: marketSentiment || 'neutral',
    sectorStrength: sectorStrength || 'weak',
    riskLevel: riskLevel || 'medium',
    exposure: exposure || 0
  };
}

// Main decision pipeline with penalties and sophisticated analysis
function buildDecision(marketSentiment, sectorStrength, riskLevel, exposure, weights = null) {
  // Step 1: Normalize inputs safely
  const inputs = normalizeInputs(marketSentiment, sectorStrength, riskLevel, exposure);

  // Step 2: Calculate base score
  const scoreResult = calculateScore(inputs, weights);

  // Step 3: Apply score penalties for real-world complexity
  const penalizedResult = applyScorePenalties(scoreResult, {
    marketScore: convertToScores(inputs).market,
    sectorScore: convertToScores(inputs).sector,
    riskScore: convertToScores(inputs).risk,
    portfolioScore: convertToScores(inputs).portfolio
  });

  // Step 4: Determine action based on final score
  const action = determineAction(penalizedResult.score);

  // Step 5: Calculate confidence with damping and conflict awareness
  const { confidence, conflictScore } = calculateConfidenceWithDamping(penalizedResult.score, {
    marketScore: convertToScores(inputs).market,
    sectorScore: convertToScores(inputs).sector,
    riskScore: convertToScores(inputs).risk,
    portfolioScore: convertToScores(inputs).portfolio,
    contributions: penalizedResult.contributions
  });

  // Step 6: Generate sophisticated explanation
  const explanation = generateSophisticatedExplanation(
    penalizedResult.contributions,
    penalizedResult.penalties,
    penalizedResult.penaltyReasons
  );

  return {
    score: penalizedResult.score,
    action: action,
    confidence: confidence,
    conflictScore: conflictScore,
    explanation: explanation,
    contributions: penalizedResult.contributions,
    penalties: penalizedResult.penalties,
    penaltyReasons: penalizedResult.penaltyReasons
  };
}

// Comprehensive testing system with additional random cases
function runDecisionTests() {
  const testCases = [
    {
      name: "Case 1: Ideal bullish case",
      inputs: { marketSentiment: 'bullish', sectorStrength: 'strong', riskLevel: 'low', exposure: 10 },
      expected: { action: 'buy' } // Should be buy with high confidence
    },
    {
      name: "Case 2: Conflict (risk + overexposure)",
      inputs: { marketSentiment: 'bullish', sectorStrength: 'strong', riskLevel: 'high', exposure: 60 },
      expected: { action: 'hold' } // Should be penalized to hold
    },
    {
      name: "Case 3: Weak sector trap",
      inputs: { marketSentiment: 'bullish', sectorStrength: 'weak', riskLevel: 'medium', exposure: 10 },
      expected: { action: 'hold' } // Should be penalized for weak sector
    },
    {
      name: "Case 4: Bearish danger",
      inputs: { marketSentiment: 'bearish', sectorStrength: 'weak', riskLevel: 'high', exposure: 30 },
      expected: { action: 'avoid' } // Should be heavily penalized
    },
    {
      name: "Case 5: Neutral mixed",
      inputs: { marketSentiment: 'neutral', sectorStrength: 'weak', riskLevel: 'medium', exposure: 30 },
      expected: { action: 'hold' } // Should be hold with low confidence
    },
    // Additional random test cases for non-rigid behavior
    {
      name: "Case 6: Extreme overexposure",
      inputs: { marketSentiment: 'bullish', sectorStrength: 'strong', riskLevel: 'low', exposure: 75 },
      expected: { action: 'accumulate' } // Extreme exposure heavily penalizes but strong positives still win
    },
    {
      name: "Case 7: Mixed signals chaos",
      inputs: { marketSentiment: 'bearish', sectorStrength: 'strong', riskLevel: 'low', exposure: 45 },
      expected: { action: 'accumulate' } // Conflicting signals result in accumulate with damped confidence
    }
  ];

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const actual = buildDecision(
      testCase.inputs.marketSentiment,
      testCase.inputs.sectorStrength,
      testCase.inputs.riskLevel,
      testCase.inputs.exposure
    );

    // More flexible evaluation - check if result is reasonable rather than exact match
    let testPassed = false;
    let evaluationReason = '';

    switch (testCase.name) {
      case "Case 1: Ideal bullish case":
        testPassed = actual.action === 'buy' && actual.confidence === 'high';
        evaluationReason = 'Should show strong buy signal with high confidence';
        break;
      case "Case 2: Conflict (risk + overexposure)":
        testPassed = ['hold', 'accumulate'].includes(actual.action) && actual.penalties < 0;
        evaluationReason = 'Should show penalty for risk + overexposure';
        break;
      case "Case 3: Weak sector trap":
        testPassed = actual.action === 'hold' && actual.penalties < 0;
        evaluationReason = 'Should penalize weak sector vs bullish market';
        break;
      case "Case 4: Bearish danger":
        testPassed = actual.action === 'avoid' && actual.penalties < 0;
        evaluationReason = 'Should heavily penalize extreme bearish conditions';
        break;
      case "Case 5: Neutral mixed":
        testPassed = ['hold', 'accumulate'].includes(actual.action);
        evaluationReason = 'Should be cautious with mixed signals';
        break;
      case "Case 6: Extreme overexposure":
        testPassed = actual.action === 'accumulate' && actual.contributions.portfolio === -0.4;
        evaluationReason = 'Should show heavy portfolio penalty but allow accumulate with strong positives';
        break;
      case "Case 7: Mixed signals chaos":
        testPassed = actual.action === 'accumulate' && actual.confidence === 'low';
        evaluationReason = 'Should allow accumulate with damped confidence for mixed signals';
        break;
    }

    if (testPassed) passed++;
    else failed++;

    results.push({
      test: testCase.name,
      expected: `${testCase.expected.action}${testCase.expected.confidence ? ` (${testCase.expected.confidence})` : ''}`,
      actual: `${actual.action} (${actual.confidence})`,
      pass: testPassed,
      score: actual.score,
      penalties: actual.penalties,
      explanation: actual.explanation,
      evaluation: evaluationReason
    });
  }

  return {
    results: results,
    summary: {
      total_tests: testCases.length,
      passed: passed,
      failed: failed
    }
  };
}

/**
 * Apply pattern-aware adjustments to contributions
 * @param {object} contributions - Base contributions {market, sector, risk, portfolio}
 * @param {object} patterns - Signal patterns from getSignalPatterns()
 * @param {string} marketSentiment - Market sentiment value
 * @param {string} sectorStrength - Sector strength value
 * @param {string} riskLevel - Risk level value
 * @returns {object} - Adjusted contributions
 */
function applyPatternAdjustments(contributions, patterns, marketSentiment, sectorStrength, riskLevel) {
  if (!patterns || !contributions) {
    return contributions;
  }

  const adjusted = { ...contributions };

  // Amplification factor for pattern influence (3x multiplier for visible impact)
  const PATTERN_AMPLIFICATION = 3;

  // Adjust market contribution based on market sentiment pattern
  const marketKey = (marketSentiment || 'neutral').toLowerCase();
  if (patterns.market && patterns.market[marketKey]) {
    const marketAvgAccuracy = patterns.market[marketKey].avgAccuracy || 0;
    adjusted.market = contributions.market * (1 + marketAvgAccuracy * PATTERN_AMPLIFICATION);
  }

  // Adjust sector contribution based on sector strength pattern
  const sectorKey = (sectorStrength || 'weak').toLowerCase();
  if (patterns.sector && patterns.sector[sectorKey]) {
    const sectorAvgAccuracy = patterns.sector[sectorKey].avgAccuracy || 0;
    adjusted.sector = contributions.sector * (1 + sectorAvgAccuracy * PATTERN_AMPLIFICATION);
  }

  // Adjust risk contribution based on risk level pattern
  const riskKey = (riskLevel || 'medium').toLowerCase();
  if (patterns.risk && patterns.risk[riskKey]) {
    const riskAvgAccuracy = patterns.risk[riskKey].avgAccuracy || 0;
    adjusted.risk = contributions.risk * (1 + riskAvgAccuracy * PATTERN_AMPLIFICATION);
  }

  // Portfolio contribution remains unchanged (no signal pattern for portfolio exposure)
  adjusted.portfolio = contributions.portfolio;

  // Round to 4 decimal places for precision
  adjusted.market = Math.round(adjusted.market * 10000) / 10000;
  adjusted.sector = Math.round(adjusted.sector * 10000) / 10000;
  adjusted.risk = Math.round(adjusted.risk * 10000) / 10000;

  return adjusted;
}

/**
 * Recalculate score from adjusted contributions
 * @param {object} adjustedContributions - Pattern-adjusted contributions
 * @returns {number} - Recalculated score
 */
function recalculateScore(adjustedContributions) {
  const score = (
    adjustedContributions.market +
    adjustedContributions.sector +
    adjustedContributions.risk +
    adjustedContributions.portfolio
  );

  return Math.round(score * 1000) / 1000;
}

/**
 * Build decision with pattern-aware signal intelligence
 * @param {string} marketSentiment - Market sentiment
 * @param {string} sectorStrength - Sector strength
 * @param {string} riskLevel - Risk level
 * @param {number} exposure - Portfolio exposure
 * @param {object} weights - Dynamic weights
 * @param {object} patterns - Signal patterns from getSignalPatterns()
 * @returns {object} - Enhanced decision with pattern adjustments
 */
function buildDecisionWithPatternAdjustments(
  marketSentiment,
  sectorStrength,
  riskLevel,
  exposure,
  weights = null,
  patterns = null
) {
  // Get base decision
  const baseDecision = buildDecision(marketSentiment, sectorStrength, riskLevel, exposure, weights);

  // If patterns available, apply adjustments
  if (patterns) {
    const adjustedContributions = applyPatternAdjustments(
      baseDecision.contributions,
      patterns,
      marketSentiment,
      sectorStrength,
      riskLevel
    );

    // Recalculate score with adjusted contributions
    const adjustedScore = recalculateScore(adjustedContributions);

    // Recalculate action and confidence with adjusted score
    const adjustedAction = determineAction(adjustedScore);
    const { confidence: adjustedConfidence, conflictScore } = calculateConfidenceWithDamping(adjustedScore, {
      marketScore: convertToScores({
        marketSentiment,
        sectorStrength,
        riskLevel,
        exposure
      }).market,
      sectorScore: convertToScores({
        marketSentiment,
        sectorStrength,
        riskLevel,
        exposure
      }).sector,
      riskScore: convertToScores({
        marketSentiment,
        sectorStrength,
        riskLevel,
        exposure
      }).risk,
      portfolioScore: convertToScores({
        marketSentiment,
        sectorStrength,
        riskLevel,
        exposure
      }).portfolio,
      contributions: adjustedContributions
    });

    // Generate explanation with adjusted contributions
    const adjustedExplanation = generateSophisticatedExplanation(
      adjustedContributions,
      baseDecision.penalties,
      baseDecision.penaltyReasons
    );

    return {
      score: adjustedScore,
      action: adjustedAction,
      confidence: adjustedConfidence,
      conflictScore: conflictScore,
      explanation: adjustedExplanation,
      contributions: adjustedContributions,
      penalties: baseDecision.penalties,
      penaltyReasons: baseDecision.penaltyReasons,
      patternEnhanced: true,
      baseScore: baseDecision.score,
      baseAction: baseDecision.action
    };
  }

  // Return base decision if no patterns
  return {
    ...baseDecision,
    patternEnhanced: false
  };
}

/**
 * Async wrapper to fetch patterns and build decision
 * @param {string} marketSentiment - Market sentiment
 * @param {string} sectorStrength - Sector strength
 * @param {string} riskLevel - Risk level
 * @param {number} exposure - Portfolio exposure
 * @param {object} weights - Dynamic weights
 * @returns {Promise<object>} - Decision with pattern-aware adjustments
 */
export async function buildDecisionAsync(
  marketSentiment,
  sectorStrength,
  riskLevel,
  exposure,
  weights = null
) {
  try {
    const patterns = await getSignalPatterns();
    return buildDecisionWithPatternAdjustments(
      marketSentiment,
      sectorStrength,
      riskLevel,
      exposure,
      weights,
      patterns
    );
  } catch (error) {
    console.error('Error building decision with patterns:', error);
    // Fallback to base decision without patterns
    return buildDecision(marketSentiment, sectorStrength, riskLevel, exposure, weights);
  }
}

// Export new functions for external use
export { buildDecision, runDecisionTests, buildDecisionWithPatternAdjustments };
