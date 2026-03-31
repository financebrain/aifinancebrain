import { fetchNiftyData, fetchTopSectors } from '../lib/data-fetcher.js';
import { callGemini } from '../lib/gemini.js';
import supabase from '../lib/supabase.js';

export async function runRiskAgent() {
  // Step 1: Fetch raw market data
  const [sectors, niftyData] = await Promise.all([fetchTopSectors(), fetchNiftyData()]);

  // Step 2: Build Gemini prompt
  const prompt = `You are a risk management specialist for Indian retail investors.
   Your job is to identify the most important risk right now.
   Market data: Nifty ${niftyData.changePercent}%
   Sector data: ${JSON.stringify(sectors)}
   
   Identify the single most important risk signal in this data.
   If there is no significant risk, confidence should be 'low'.
   Respond ONLY with valid JSON, no markdown:
   {
     "title": "risk alert headline under 10 words",
     "risk_area": "specific sector or market area at risk",
     "reason": "2 sentences explaining the risk clearly",
     "severity": "high" or "medium" or "low",
     "confidence": "high" or "medium" or "low",
     "suggested_action": "one plain English protective action"
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
    type: 'risk',
    title: parsed.title,
    reason: parsed.reason,
    confidence: parsed.confidence,
    suggested_action: parsed.suggested_action,
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
