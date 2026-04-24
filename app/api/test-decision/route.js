import { buildDecision } from '@/agents/decision-engine';
import { getDynamicWeights } from '@/lib/decision-memory';

export async function GET() {
  const input = {
    marketSentiment: 'bullish',
    sectorStrength: 'strong',
    riskLevel: 'high',
    exposure: 60
  };

  const weights = await getDynamicWeights();
  const result = buildDecision(input.marketSentiment, input.sectorStrength, input.riskLevel, input.exposure, weights);

  return Response.json({
    action: result.action,
    confidence: result.confidence,
    conflictScore: result.conflictScore,
    explanation: result.explanation
  });
}
