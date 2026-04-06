export function personalizeDecision(finalDecision, userProfile) {
  if (finalDecision.beginner) return { ...finalDecision };
  
  if (!userProfile) return { ...finalDecision, personalized: false };

  const personalized = { ...finalDecision };
  
  const goal = (userProfile.investment_goal || '').toLowerCase();
  const risk = (userProfile.risk_tolerance || 'moderate').toLowerCase();

  // Purely goal-based insight tracking without corrupting hard Action parameters
  if (goal === 'long-term-growth') {
    personalized.insight = `${personalized.insight} Note: This aligns with your long-term accumulation plans.`;
  } else if (goal === 'short-term-profit') {
    if (personalized.action_type === 'buy') {
        personalized.action = `Potential near-term strength observed. ${personalized.action}`;
    }
  }

  // Slight Risk Context
  if (risk === 'low' && personalized.action_type === 'buy') {
    personalized.action = `Focus firmly on capital preservation. ${personalized.action}`;
    delete personalized.allocation_hint; // Enforce extreme safety
  }

  personalized.personalized = true;
  return personalized;
}
