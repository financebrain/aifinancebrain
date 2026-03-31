import { fetchNiftyData, fetchTopSectors } from '../lib/data-fetcher.js';
import { callGemini } from '../lib/gemini.js';
import supabase from '../lib/supabase.js';

export async function runMarketAgent() {
  // Step 1: Fetch raw market data
  const [niftyData, sectors] = await Promise.all([fetchNiftyData(), fetchTopSectors()]);

  // Step 2: Build Gemini prompt
  const prompt = `You are a senior financial analyst for Indian markets.
   Analyze this market data and generate a daily brief.
   
   Nifty 50: price ${niftyData.price}, change ${niftyData.changePercent}%
   Sectors today: ${JSON.stringify(sectors)}
   
   Respond ONLY with a valid JSON object, no markdown, no explanation:
   {
     "title": "brief headline under 10 words",
     "summary": "2-sentence plain English market summary",
     "strong_sectors": ["sector1", "sector2"],
     "weak_sectors": ["sector1"],
     "confidence": "high" or "medium" or "low",
     "suggested_action": "one plain English sentence"
   }`;

  // Step 3: Call Gemini
  await new Promise(resolve => setTimeout(resolve, 4000)); // added  delay to rate limit isuue . remove this in production .
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
    type: 'market',
    title: parsed.title,
    reason: parsed.summary,
    confidence: parsed.confidence,
    suggested_action: parsed.suggested_action,
    raw_data: {
      niftyData,
      sectors,
      strong_sectors: parsed.strong_sectors,
      weak_sectors: parsed.weak_sectors,
    },
  };

  const supabaseInsertResult = await supabase.from('insights').insert(payload).select().single();

  // Step 6: Return insight
  return { ...parsed, supabaseInsertResult };
}
