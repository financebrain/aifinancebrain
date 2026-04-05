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
    let matched = false;

    // We locate the exact string injected by the personalization engine 
    // to dynamically throttle the recommended cash amount down to the minimum bracket
    updated.action = updated.action.replace(/Allocate (\d+)–(\d+)%\s*\((₹[^)]+)[^)]*\)\.\s*/i, (match, minPct, maxPct, minAmt) => {
      matched = true;
      // Truncate out the max range and just recommend the strict minimum or diversification
      return `You already have high ${cleanTopSector} exposure (${exposureRounded}%). Limit new allocation to ${minAmt} or diversify. `;
    });

    if (!matched) {
      updated.action = updated.action.replace(/Allocate (\d+)–(\d+)%\.\s*/i, (match, minPct, maxPct) => {
        matched = true;
        return `You already have high ${cleanTopSector} exposure (${exposureRounded}%). Limit new allocation size drastically or diversify. `;
      });
    }

    if (!matched && !updated.action.toLowerCase().includes('avoid')) {
      updated.action = `You already have high ${cleanTopSector} exposure (${exposureRounded}%). Limit new allocation or diversify. ` + updated.action;
    }

    updated.portfolio_adjusted = true;
    return updated;
  }

  return personalizedDecision;
}
