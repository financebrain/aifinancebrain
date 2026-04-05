export function personalizeDecision(finalDecision, userProfile) {
  if (!userProfile) return { ...finalDecision, personalized: false };

  const personalized = { ...finalDecision };
  
  const risk = (userProfile.risk_tolerance || 'moderate').toLowerCase();
  const capital = userProfile.monthly_investment || 0;
  const goal = (userProfile.investment_goal || '').toLowerCase();

  let minAllocPct = finalDecision.minAlloc ?? 25;
  let maxAllocPct = finalDecision.maxAlloc ?? 40;
  let toneText = '';

  if (risk === 'low') {
    // scale down
    minAllocPct = Math.max(minAllocPct - 15, 10);
    maxAllocPct = Math.max(maxAllocPct - 20, 20);
    toneText = 'Focus on capital protection. ';
  } else if (risk === 'high') {
    // scale up
    minAllocPct = Math.min(minAllocPct + 15, 50);
    maxAllocPct = Math.min(maxAllocPct + 20, 70);
    toneText = 'Adopt an aggressive stance. ';
  }

  let amountText = '';
  if (capital > 0) {
    const minVal = Math.round((capital * minAllocPct) / 100);
    const maxVal = Math.round((capital * maxAllocPct) / 100);
    amountText = ` (₹${minVal.toLocaleString('en-IN')}–₹${maxVal.toLocaleString('en-IN')})`;
  }

  let modifiedAction = personalized.action;
  
  // Remove existing generic allocation terms
  modifiedAction = modifiedAction.replace(/Enter with 25–40% allocation\.\s*/i, '');
  modifiedAction = modifiedAction.replace(/Aggressive entry supported\.\s*/i, '');

  if (modifiedAction.toLowerCase().includes('avoid new positions completely')) {
    personalized.action = `${toneText}${modifiedAction}`.trim();
  } else {
    const allocationAdvice = `Allocate ${minAllocPct}–${maxAllocPct}%${amountText}. `;
    personalized.action = `${toneText}${allocationAdvice}${modifiedAction}`.trim();
  }

  // Handle goal-based summary tracking
  if (goal === 'long-term-growth') {
    personalized.summary = `${personalized.summary} Focus on gradual accumulation.`;
  } else if (goal === 'short-term-profit') {
    personalized.summary = `${personalized.summary} Monitor closely for quick exit.`;
  }

  personalized.personalized = true;
  return personalized;
}
