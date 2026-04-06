export function applyPortfolioContext(personalizedDecision, portfolios, topSector) {
  if (!portfolios || portfolios.length === 0 || !topSector) {
    return personalizedDecision;
  }

  const cleanTopSector = topSector.replace(/\s+Index$/i, '').trim();
  if (!cleanTopSector) return personalizedDecision;

  let sectorExposure = 0;
  for (const item of portfolios) {
    if (!item.sector) continue;
    const itemSector = item.sector.toLowerCase();
    const targetSector = cleanTopSector.toLowerCase();
    
    // Flexible matching to ensure we catch variations like "Information Technology" vs "IT" 
    // or "Banking" vs "Bank"
    if (itemSector.includes(targetSector) || targetSector.includes(itemSector)) {
      let alloc = parseFloat(item.allocation || 0);
      // Handles decimal representation if stored as 0.45 instead of 45
      if (alloc > 0 && alloc <= 1) {
        alloc = alloc * 100;
      }
      sectorExposure += alloc;
    }
  }

  if (sectorExposure > 40) {
    const updated = { ...personalizedDecision };
    const exposureRounded = Math.round(sectorExposure);

    // STRICT PORTFOLIO OVERRIDE
    updated.action_type = "hold";
    updated.urgency = "medium";
    updated.allocation_hint = null; // strip any pre-set hints
    updated.action = "Maintain current allocations and observe parameters.";
    updated.impact_on_user = `You possess dangerously high exposure to ${cleanTopSector} (${exposureRounded}%). Restrict new structural buy orders to preserve asset diversification.`;
    updated.next_step = `Maintain exact current positioning without making any sudden risk-adjustments.`;

    updated.portfolio_adjusted = true;
    return updated;
  }

  return personalizedDecision;
}
