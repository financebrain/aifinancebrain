import { fetchNiftyData, fetchTopSectors } from '../lib/data-fetcher.js';
import { callGemini } from '../lib/gemini.js';
import supabase from '../lib/supabase.js';

export async function runRiskAgent() {
  // Step 1: Fetch raw market data
  const [sectors, niftyData] = await Promise.all([fetchTopSectors(), fetchNiftyData()]);

  // Step 2: Build Gemini prompt
  const prompt = `You are a risk management specialist 
protecting Indian retail investors.

Today's data:
- Nifty: ${niftyData.changePercent >= 0 ? '+' : ''}${niftyData.changePercent}%  
- Sectors: ${JSON.stringify(sectors)}

Identify the most important risk signal in today's market.
If markets look genuinely stable, say so with low confidence.
Never manufacture risks that are not in the data.

Respond ONLY with valid JSON, no markdown:
{
  "title": "risk headline under 8 words",
  "risk_area": "specific sector or market area",
  "reason": "2 specific sentences explaining the risk with real numbers",
  "severity": "high or medium or low",
  "confidence": "high or medium or low",
  "suggested_action": "one specific protective action an investor should take"
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
