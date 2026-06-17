import { buildDecisionAsync } from '../lib/quant-engine.js';

export async function buildFinalDecision({ market, news, sector, opportunity, risk, portfolio = {}, weights = null, userId = null }) {
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

  // Calculate weighted score using pattern-adjusted contributions (async with pattern intelligence)
  const scoringResult = await buildDecisionAsync(
    marketSentiment,
    sectorStrength,
    riskLevel,
    exposure,
    weights,
    strongestSector.toLowerCase(),
    market?.regime || 'sideways',
    userId
  );

  // DEBUG: Log pattern boost impact
  if (scoringResult.patternEnhanced) {
    console.log({
      baseScore: Number(scoringResult.baseScore ?? 0).toFixed(4),
      patternBoost: Number(scoringResult.patternBoost ?? 0).toFixed(4),
      finalScore: Number(scoringResult.score ?? 0).toFixed(4),
      actionShift: `${scoringResult.baseAction} → ${scoringResult.action}`,
      patternEnhanced: true
    });
  }

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

// Helper function for action descriptions
function getActionDescription(action, sector) {
  switch (action) {
    case 'buy':
      return `A thoughtful, gradual allocation can be considered strategically in ${sector}.`;
    case 'accumulate':
      return `Consider gradual accumulation in ${sector} based on market conditions.`;
    case 'hold':
      return 'Holding current positions is advised to maintain stability.';
    default:
      return 'Market conditions suggest maintaining current positions.';
  }
}
