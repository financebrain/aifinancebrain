import { fetchNiftyData, fetchTopSectors } from '../lib/data-fetcher.js';
import { callGemini } from '../lib/gemini.js';
import supabase from '../lib/supabase.js';

export async function runSectorAgent() {
  // Step 1: Fetch raw market data
  const [sectors, niftyData] = await Promise.all([fetchTopSectors(), fetchNiftyData()]);

  // Step 2: Build Gemini prompt
  const prompt = `You are a sector rotation analyst for Indian markets.

Today's data:
- Nifty overall: ${niftyData.changePercent >= 0 ? '+' : ''}${niftyData.changePercent}%
- All sectors: ${JSON.stringify(sectors)}

Identify which sectors are gaining and losing investor interest today.
Be specific with actual percentage numbers from the data above.

Respond ONLY with valid JSON, no markdown:
{
  "title": "sector theme in 4-6 words",
  "top_sector": "name of strongest sector",
  "top_sector_reason": "specific sentence with exact percentage why this sector leads",
  "weak_sector": "name of weakest sector", 
  "weak_sector_reason": "specific sentence with exact percentage",
  "rotation_signal": "one sentence on where money is moving today with numbers",
  "confidence": "high or medium or low",
  "suggested_action": "specific action mentioning actual sector names and ETFs"
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
    type: 'sector',
    title: parsed.title,
    reason: parsed.rotation_signal,
    confidence: parsed.confidence,
    suggested_action: parsed.suggested_action,
    raw_data: {
      niftyData,
      sectors,
      top_sector: parsed.top_sector,
      top_sector_reason: parsed.top_sector_reason,
      weak_sector: parsed.weak_sector,
      weak_sector_reason: parsed.weak_sector_reason,
      rotation_signal: parsed.rotation_signal,
    },
  };

  await supabase.from('insights').insert(payload);

  // Step 6: Return insight
  return parsed;
}
