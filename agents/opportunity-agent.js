import { getMarketData } from '../lib/data-provider.js';
import { callGemini } from '../lib/gemini.js';
import supabase from '../lib/supabase.js';
import { getUserContext } from '../lib/user-context.js'

export async function runOpportunityAgent(userId = null, runId = null) {
  // Step 1: Fetch raw market data
  const data = await getMarketData();
  const niftyData = data.nifty;
  const sectors = data.sectors;

  // Step 2: Build Gemini prompt
  const userContext = await getUserContext(userId)
  const prompt = `You are an opportunity detection specialist 
for Indian equity markets.

Today's data:
- Nifty: ${niftyData.changePercent >= 0 ? '+' : ''}${niftyData.changePercent}%
- Sectors: ${JSON.stringify(sectors)}

Find the ONE best investment opportunity in Indian markets today.
Be specific — name actual ETFs available in India like:
Nifty 50 Index ETF, Bank Nifty ETF, Nippon India Banking ETF,
ICICI Prudential IT ETF, Kotak Gold ETF, etc.

TONE CONSTRAINTS - STRICTLY ENFORCED:
- Ensure all outputs align with a calm financial advisory tone.
- NEVER use phrases like "strong buy", "best stock", "short sell", or "don't miss opportunity".
- INSTEAD, use phrases like: "can be considered", "showing strength", "monitor closely", or "may present opportunity" where appropriate.

Respond ONLY with valid JSON, no markdown:
{
  "title": "specific opportunity headline (max 8 words)",
  "asset": "specific Indian ETF or index name",
  "reason": "2 specific sentences with real numbers explaining why this is an opportunity RIGHT NOW",
  "confidence": "high or medium or low",
  "time_horizon": "short-term (days) or medium-term (weeks)",
  "suggested_action": "specific plain English action like: 'This sector is showing strength' or 'May be monitored for potential exposure'. DO NOT suggest allocating specific ₹ ranges."
}
${userContext}`;

  // Step 3: Call Gemini
  const rawResponse = await callGemini(prompt);

  // Step 4: Parse JSON response
  let parsed;
  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    throw new Error('Gemini response not valid JSON');
  }

  // Step 5: Store in Supabase
  const payload = {
    type: 'opportunity',
    title: parsed.title,
    reason: parsed.reason,
    confidence: parsed.confidence,
    suggested_action: parsed.suggested_action,
    run_id: runId,
    raw_data: {
      niftyData,
      sectors,
      asset: parsed.asset,
      time_horizon: parsed.time_horizon,
    },
  };

  await supabase.from('insights').insert(payload);

  // Step 6: Return insight
  return parsed;
}
