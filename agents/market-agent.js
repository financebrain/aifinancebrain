import { fetchNiftyData, fetchTopSectors } from '../lib/data-fetcher.js';
import { callGemini } from '../lib/gemini.js';
import supabase from '../lib/supabase.js';

export async function runMarketAgent() {
  // Step 1: Fetch raw market data
  const [niftyData, sectors] = await Promise.all([fetchNiftyData(), fetchTopSectors()]);

  // Step 2: Build Gemini prompt
  const prompt = `You are a senior financial analyst at a 
top Indian investment firm. Write the daily morning brief 
for retail investors who trust you completely.

Today's market data:
- Nifty 50: ₹${niftyData.price} 
  (${niftyData.changePercent >= 0 ? '+' : ''}${niftyData.changePercent}% today)
- Sector movements: ${JSON.stringify(sectors)}

Write as a trusted advisor. Be specific with real numbers.
Explain what this means for a regular investor in plain English.

Respond ONLY with valid JSON, absolutely no markdown or extra text:
{
  "title": "punchy headline capturing today's key theme (max 8 words)",
  "summary": "2 confident sentences explaining what is happening today and why it matters. Use actual numbers. Mention specific sectors.",
  "strong_sectors": ["sector1", "sector2"],
  "weak_sectors": ["sector1"],
  "key_signal": "the single most important thing an investor should know today",
  "confidence": "high",
  "suggested_action": "one specific plain English sentence — what should a retail investor pay attention to today"
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
