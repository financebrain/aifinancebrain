import { fetchNiftyData, fetchTopSectors } from '../lib/data-fetcher.js';
import { callGemini } from '../lib/gemini.js';
import supabase from '../lib/supabase.js';

export async function runMarketAgent() {
  // Step 1: Fetch raw market data
  const [niftyData, sectors] = await Promise.all([fetchNiftyData(), fetchTopSectors()]);

  // Step 2: Build Gemini prompt
  const prompt = `You are a senior financial analyst at a top Indian investment firm.
You are writing the daily morning brief for retail investors.
Write with confidence, clarity, and human warmth.

Market data today:
- Nifty 50: ₹${niftyData.price} (${niftyData.changePercent > 0 ? '+' : ''}${niftyData.changePercent}% today)
- Sector performance: ${JSON.stringify(sectors)}

Write a morning brief that feels like it comes from a trusted financial advisor.
Be specific — mention actual numbers, actual sector names.
Be helpful — tell people what this means for their money.

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "title": "engaging headline that captures the key market theme today (under 10 words)",
  "summary": "2 sentences explaining what is happening in markets today and why it matters for investors. Be specific with numbers and sector names.",
  "strong_sectors": ["list", "of", "strong", "sectors"],
  "weak_sectors": ["list", "of", "weak", "sectors"],
  "key_signal": "the single most important thing happening in markets today",
  "confidence": "high or medium or low",
  "suggested_action": "one specific, actionable sentence — what should a regular investor pay attention to or do today"
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
