export function buildFinalDecision({ market, news, sector, opportunity, risk }) {
  const marketData = market || {};
  const newsData = news || {};
  const sectorData = sector || {};
  const oppData = opportunity || {};
  const riskData = risk || {};

  const strongestSectorRaw = sectorData.top_sector || 'Top Sector';
  const secondSectorRaw = sectorData.second_sector || '';
  const weakSectorRaw = sectorData.weak_sector || 'Weak Sector';
  const riskSeverity = (riskData.severity || 'low').toLowerCase();
  const oppConfidence = (oppData.confidence || 'low').toLowerCase();
  const topSectorReason = sectorData.top_sector_reason || '';
  const secondSectorReason = sectorData.second_sector_reason || '';
  const weakSectorReason = sectorData.weak_sector_reason || '';
  
  // Clean names (remove " Index" for sharper phrasing)
  const strongestSector = strongestSectorRaw.replace(/\s+Index$/i, '');
  const secondSector = secondSectorRaw.replace(/\s+Index$/i, '');
  const weakSector = weakSectorRaw.replace(/\s+Index$/i, '');

  // Fetch actual percentage values from raw data if available
  const rawSectors = marketData.supabaseInsertResult?.data?.raw_data?.sectors || [];
  let topSectorPercent = null;
  let secondSectorPercent = null;
  let weakSectorPercent = null;
  const niftyPercentRaw = marketData.supabaseInsertResult?.data?.raw_data?.niftyData?.changePercent;

  if (rawSectors.length > 0) {
    const topS = rawSectors.find(s => s.name.toLowerCase().includes(strongestSectorRaw.toLowerCase()) || strongestSectorRaw.toLowerCase().includes(s.name.toLowerCase()));
    if (topS) topSectorPercent = topS.changePercent;

    if (secondSectorRaw) {
      const secondS = rawSectors.find(s => s.name.toLowerCase().includes(secondSectorRaw.toLowerCase()) || secondSectorRaw.toLowerCase().includes(s.name.toLowerCase()));
      if (secondS) secondSectorPercent = secondS.changePercent;
    }

    const weakS = rawSectors.find(s => s.name.toLowerCase().includes(weakSectorRaw.toLowerCase()) || weakSectorRaw.toLowerCase().includes(s.name.toLowerCase()));
    if (weakS) weakSectorPercent = weakS.changePercent;
  }

  // Fallback to regex if raw data is missing
  if (topSectorPercent === null) {
    const topSectorMatch = topSectorReason.match(/([+-]?\d+(?:\.\d+)?)%/);
    topSectorPercent = topSectorMatch ? parseFloat(topSectorMatch[1]) : null;
  }
  
  if (secondSectorPercent === null && secondSectorReason) {
    const match = secondSectorReason.match(/([+-]?\d+(?:\.\d+)?)%/);
    secondSectorPercent = match ? parseFloat(match[1]) : null;
  }

  if (weakSectorPercent === null) {
    const weakSectorMatch = weakSectorReason.match(/([+-]?\d+(?:\.\d+)?)%/);
    weakSectorPercent = weakSectorMatch ? parseFloat(weakSectorMatch[1]) : null;
    
    // Fix sign accuracy if parsed regex misses negative sign but text implies drop
    if (weakSectorPercent !== null && weakSectorPercent > 0) {
       const lowerReason = weakSectorReason.toLowerCase();
       if (lowerReason.includes('fell') || lowerReason.includes('down') || lowerReason.includes('declin') || lowerReason.includes('drop') || lowerReason.includes('los')) {
           weakSectorPercent = -weakSectorPercent;
       }
    }
  }

  const niftyPercent = niftyPercentRaw !== undefined ? niftyPercentRaw : undefined;

  // Sign formatter Helper
  const formatPercent = (val) => {
    if (val === null || val === undefined) return '';
    return val > 0 ? `+${val}%` : `${val}%`;
  };

  const topSectorChangeStr = formatPercent(topSectorPercent);
  const secondSectorChangeStr = formatPercent(secondSectorPercent);
  const weakSectorChangeStr = formatPercent(weakSectorPercent);
  const niftyChangeStr = formatPercent(niftyPercent);

  // Dynamic Confidence logic
  let confidence = "low";
  if (oppConfidence === "high" && riskSeverity === "low") {
    confidence = "high";
  } else if (riskSeverity === "medium") {
    confidence = "medium";
  }

  // Macro News Sentiment Integration -> Confidence Scaling
  const macroSentiment = (newsData.sentiment || '').toLowerCase();
  if (macroSentiment === 'bearish') {
     if (confidence === 'high') confidence = 'medium';
     else if (confidence === 'medium') confidence = 'low';
  } else if (macroSentiment === 'bullish') {
     if (confidence === 'low') confidence = 'medium';
     else if (confidence === 'medium') confidence = 'high';
  }

  const isWeakMarket = (niftyPercent !== undefined && niftyPercent < 0) || newsData.sentiment === 'bearish';
  const isDivergence = (topSectorPercent !== null && niftyPercent !== undefined && topSectorPercent > niftyPercent + 0.2);
  const moveNoun = isDivergence ? "sharp divergence" : "move";

  // Signal Weigher
  const getWeight = (val) => {
    if (val === null || val === undefined) return 'NONE';
    const abs = Math.abs(val);
    if (abs > 2) return 'STRONG';
    if (abs >= 0.5) return 'MEDIUM';
    return 'WEAK';
  };

  const topWeight = getWeight(topSectorPercent);
  const secondWeight = getWeight(secondSectorPercent);
  const weakWeight = getWeight(weakSectorPercent);

  // Summary Construction Blocks
  // Summary Construction Blocks
  let summaryText = '';

  const mainStr = topWeight === 'STRONG' ? `The ${strongestSector} sector is showing a strong breakout (${topSectorChangeStr})` 
    : `The ${strongestSector} sector is leading the market (${topSectorChangeStr})`;

  const outperfStr = niftyPercent !== undefined 
    ? (topSectorPercent - niftyPercent > 1 ? `, significantly outperforming the broader market (Nifty ${niftyChangeStr}).` : `, outperforming the broader market (Nifty ${niftyChangeStr}).`)
    : `.`;

  // 1. Strong sector signal
  summaryText += mainStr + outperfStr;

  // 2. Macro confirmation (or warning)
  // 2. Macro confirmation (or warning)
  const text = (news?.summary || "").toLowerCase()

  const hasRecovery =
    text.includes("rally") ||
    text.includes("gain") ||
    text.includes("gains") ||
    text.includes("recovery") ||
    text.includes("positive") ||
    text.includes("losing streak")

  const hasPolicy =
    text.includes("rbi") ||
    text.includes("central bank") ||
    text.includes("rupee")

  const hasRisk =
    text.includes("uncertain") ||
    text.includes("risk") ||
    text.includes("concern")

  let macro = ""

  if (hasRecovery && hasPolicy) {
    macro = "broader market recovery with policy support"
  } else if (hasRecovery) {
    macro = "broader market recovery momentum"
  } else if (hasPolicy) {
    macro = "policy-driven stability"
  } else if (hasRisk) {
    macro = "macro uncertainty"
  } else {
    macro = "mixed macro signals"
  }

  console.log("MACRO SIGNAL:", macro)

  if (macroSentiment === 'bullish') {
    summaryText += ` This move is supported by improving macro sentiment, including ${macro}.`;
  } else if (macroSentiment === 'bearish') {
    summaryText += ` Macro conditions remain weak, including ${macro}, which may limit upside.`;
  } else {
    summaryText += ` Macro signals remain mixed, including ${macro}, which may create uncertainty in continuation.`;
  }

  // 3. Secondary sectors
  if (secondSectorPercent !== null && secondSector) {
    if (secondWeight === 'STRONG') {
       summaryText += ` Broad strength is also visible in ${secondSector} (${secondSectorChangeStr}).`;
    } else if (secondWeight === 'MEDIUM') {
       summaryText += ` Secondary strength is seen in ${secondSector} (${secondSectorChangeStr}).`;
    } else if (secondWeight === 'WEAK' && topWeight === 'STRONG') {
       summaryText += ` Minor positive momentum is visible in ${secondSector} (${secondSectorChangeStr}), but the move is primarily driven by ${strongestSector}.`;
    }
  }

  // 4. Sector Rotation (Risk / Weakness Tracking)
  if (weakSectorPercent !== null && weakSectorPercent <= -1) {
     summaryText += ` Significant weakness in ${weakSector} (${weakSectorChangeStr}) highlights active sector rotation.`;
  } else if (weakSectorPercent !== null && weakSectorPercent < -0.5) {
     summaryText += ` Weakness in ${weakSector} (${weakSectorChangeStr}) indicates ongoing rotation.`;
  }

  let title = "Market Analysis";
  let implicationText = ``;
  let action = "Maintain current allocations.";

  if (topWeight === 'STRONG') {
     title = `Dominant ${strongestSector} Breakout`;
     implicationText = `The absolute magnitude of this move confirms strong structural momentum and institutional focus.`;
     action = `Consider aggressive entry or scaling up allocations specifically in ${strongestSector} leading names.`;
  } else if (topWeight === 'MEDIUM') {
     title = `Steady ${strongestSector} Leadership`;
     implicationText = `Trends suggest constructive rotation with moderate conviction.`;
     action = `Opportunistic buying in ${strongestSector} on dips supported. Maintain core holdings.`;
  } else {
     title = `Indecisive Market Rotation`;
     implicationText = `Fragmented leadership implies lack of broad institutional conviction.`;
     action = `Avoid chasing breakouts. Focus strictly on defensive positioning until a clear leader emerges.`;
  }

  // Override with risk context
  if (isWeakMarket && riskSeverity === 'high') {
     title = `High Risk: Systemic Weakness`;
     implicationText = `Any localized sector strength is overshadowed by broader market deterioration.`;
     action = `Halt new positions. Tighten aggregate stop losses immediately.`;
  } else if (riskSeverity === 'medium' && topWeight === 'STRONG') {
     title = `Strong ${strongestSector} Momentum with Pullback Risk`;
     implicationText += ` However, extended positioning increases the likelihood of a short-term pullback.`;
     action = `Enter with 25–40% allocation. Avoid chasing the rally; add exclusively on consolidation.`;
  }

  // Base Allocation logic parameterization
  let minAlloc = 25;
  let maxAlloc = 40;

  // Fundamental Constraints overriding Technical Actions
  if (macro.includes("recovery")) {
     minAlloc += 5;
     maxAlloc += 5;
     action += ` Momentum is supported by macro conditions.`;
  } else if (macro.includes("uncertainty")) {
     minAlloc -= 10;
     maxAlloc -= 10;
     action = action.replace(/Aggressive entry/gi, 'Moderate entry');
     action += ` Maintain caution due to macro uncertainty.`;
  }

  // Strip native text allocations entirely to prevent duplication downstream
  action = action.replace(/Enter with \d+–\d+% allocation\.\s*/gi, '');

  const summary = `${summaryText} ${implicationText}`;

  return {
    title,
    summary,
    action,
    confidence,
    minAlloc,
    maxAlloc
  };
}
