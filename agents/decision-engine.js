export function buildFinalDecision({ market, news, sector, opportunity, risk, portfolio = {} }) {
  const strongestSectorRaw = sector?.top_sector || 'Top Sector';
  const strongestSector = strongestSectorRaw.replace(/\s+Index$/i, '').trim();
  const macroSentiment = (news?.sentiment || 'neutral').toLowerCase();
  const riskSeverity = (risk?.severity || 'low').toLowerCase();

  const isPortfolioEmpty = !portfolio || Object.keys(portfolio).length === 0;
  const beginner = isPortfolioEmpty;
  const personalized = !isPortfolioEmpty;
  const exposure = portfolio[strongestSector] || 0;

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

  const topSectorReason = sector?.top_sector_reason || '';
  const topSectorMatch = topSectorReason.match(/([+-]?\d+(?:\.\d+)?)%/);
  const topSectorPercent = topSectorMatch ? parseFloat(topSectorMatch[1]) : 0;
  let isStrongSector = Math.abs(topSectorPercent) >= 0.5;

  let isPositiveNews = (macroSentiment === 'bullish');
  let isLowRisk = (riskSeverity === 'low');
  let isLowExposure = (exposure <= 40);

  let action_type = "observe";
  let action = "No action required. Monitor structural momentum patiently.";
  let urgency = "low";
  let confidence = "medium";
  let next_step = "Continue monitoring broad market alignment without making sudden adjustments.";

  if (isPortfolioEmpty) {
      action_type = "observe";
      action = "Start small. Consider exploring a broad market index ETF as a foundational first step.";
      urgency = "low";
      confidence = "medium";
      next_step = "Take time to understand market mechanics before initiating any starter holdings.";
  } else if (exposure > 40) {
      action_type = "hold";
      action = `Holding current positions is advised due to established exposure in ${strongestSector}.`;
      urgency = "low";
      confidence = "high";
      next_step = `Maintain exact current positioning to preserve asset diversification.`;
  } else if (isStrongSector && isPositiveNews && isLowRisk && isLowExposure) {
      action_type = "buy";
      action = `A thoughtful, gradual allocation can be considered strategically in ${strongestSector}.`;
      urgency = "low";
      confidence = "medium";
      next_step = `Consider establishing a conservative entry into ${strongestSector} while observing overall risk.`;
  } else if (riskSeverity === 'high') {
      action_type = "observe";
      action = "Systemic market caution observed. Focus on capital preservation.";
      urgency = "low";
      confidence = "high";
      next_step = `Observe risk parameters carefully. Avoid adding new exposure at this time.`;
  }

  let status = "neutral";
  if (riskSeverity === 'high' || macroSentiment === 'bearish') {
      status = "cautious";
  } else if (isStrongSector && macroSentiment === 'bullish') {
      status = "optimistic";
  }

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

  if (macroSentiment === 'bearish') insight += " However, weak macro indicators suggest maintaining caution.";
  else if (macroSentiment === 'bullish') insight += " Constructive macro fundamentals provide supportive context.";
  else insight += " Broader market variables remain stable.";

  const why = {
    market_summary: market?.summary || "Overall market structure remains stable.",
    sector_analysis: sector?.rotation_signal || `Capital flow indicates momentum in the ${strongestSector} sector.`,
    news_impact: `Macroeconomic sentiment is currently assessed as ${macroSentiment}.`,
    risk_analysis: risk?.reason || `Detected market risk levels are measured at ${riskSeverity} severity.`,
    portfolio_impact: impact_on_user
  };

  return {
    status,
    insight,
    impact_on_user,
    action,
    action_type,
    urgency,
    next_step,
    confidence,
    beginner,
    personalized,
    why
  };
}
