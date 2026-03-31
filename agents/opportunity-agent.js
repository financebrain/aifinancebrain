import { fetchNiftyData, fetchTopSectors } from '../lib/data-fetcher.js';
import { callGemini } from '../lib/gemini.js';
import supabase from '../lib/supabase.js';

export async function runOpportunityAgent() {
  // Step 1: Fetch raw market data
  const [sectors, niftyData] = await Promise.all([fetchTopSectors(), fetchNiftyData()]);

  // Step 2: Build Gemini prompt
  const prompt = `You are an opportunity detection specialist for Indian markets.
   Your job is to find the single best investment opportunity right now.
   Market data: Nifty ${niftyData.changePercent}%
   Sector data: ${JSON.stringify(sectors)}
   
   Identify the ONE best opportunity based on this data.
   Respond ONLY with valid JSON, no markdown:
   {
     "title": "opportunity headline under 10 words",
     "asset": "specific ETF or index name",
     "reason": "2 sentences explaining why this is an opportunity now",
     "confidence": "high" or "medium" or "low",
     "time_horizon": "short-term (days)" or "medium-term (weeks)",
     "suggested_action": "specific plain English action to consider"
   }`;

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
