import { getMarketData } from '../lib/data-provider.js';
import { callGemini } from '../lib/gemini.js';
import supabase from '../lib/supabase.js';
import { getUserContext } from '../lib/user-context.js'
import { cleanAndParseJSON, validateJSONStructure } from '../lib/json-utils.js'

export async function runRiskAgent(userId = null, runId = null) {
  // Step 1: Fetch raw market data
  const data = await getMarketData();
  const niftyData = data.nifty;
  const sectors = data.sectors;

  // Step 2: Build Gemini prompt
  const userContext = await getUserContext(userId)
  const prompt = `You are a risk management specialist 
protecting Indian retail investors.

Today's data:
- Nifty: ${niftyData.changePercent >= 0 ? '+' : ''}${niftyData.changePercent}%  
- Sectors: ${JSON.stringify(sectors)}

Identify the most important risk signal in today's market.
If markets look genuinely stable, say so with low confidence.
Never manufacture risks that are not in the data.

TONE CONSTRAINTS - STRICTLY ENFORCED:
- Ensure all outputs align with a calm financial advisory tone.
- NEVER use phrases like "strong buy", "best stock", "short sell", or "don't miss opportunity".
- INSTEAD, use phrases like: "can be considered", "showing strength", "monitor closely", or "may present opportunity" where appropriate.

Respond ONLY with valid JSON, no markdown:
{
  "title": "risk headline under 8 words",
  "risk_area": "specific sector or market area",
  "reason": "2 specific sentences explaining the risk with real numbers",
  "severity": "high or medium or low",
  "confidence": "high or medium or low",
  "suggested_action": "one specific protective action an investor should take"
}
${userContext}`;

  // Step 3: Call Gemini
  const rawResponse = await callGemini(prompt);

  // Step 4: Parse JSON response
  const parsed = cleanAndParseJSON(rawResponse);

  if (!parsed) {
    throw new Error('Failed to parse Gemini response as valid JSON');
  }

  // Validate required fields
  if (!validateJSONStructure(parsed, ['title', 'risk_area', 'reason', 'severity', 'confidence', 'suggested_action'])) {
    throw new Error('Gemini response missing required fields');
  }

  // Step 5: Store in Supabase
  const payload = {
    type: 'risk',
    title: parsed.title,
    reason: parsed.reason,
    confidence: parsed.confidence,
    suggested_action: parsed.suggested_action,
    run_id: runId,
    raw_data: {
      niftyData,
      sectors,
      risk_area: parsed.risk_area,
      severity: parsed.severity,
    },
  };

  await supabase.from('insights').insert(payload);

  // Step 6: Return insight
  return parsed;
}
