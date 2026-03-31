import { fetchFinancialNews } from '../lib/data-fetcher.js';
import { callGemini } from '../lib/gemini.js';
import supabase from '../lib/supabase.js';

export async function runNewsAgent() {
  // Step 1: Fetch raw market data
  const headlines = await fetchFinancialNews();

  // Step 2: Build Gemini prompt
  const prompt = `You are a senior financial news analyst for India.
   Analyze these market headlines and extract key signals.
   Headlines: ${headlines.join(' | ')}
   
   Respond ONLY with valid JSON, no markdown:
   {
     "title": "key theme in under 10 words",
     "summary": "2 sentence analysis of what these headlines mean for markets",
     "impacted_sectors": ["sector1", "sector2"],
     "sentiment": "bullish" or "bearish" or "neutral",
     "confidence": "high" or "medium" or "low",
     "suggested_action": "one plain English sentence"
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
    type: 'news',
    title: parsed.title,
    reason: parsed.summary,
    confidence: parsed.confidence,
    suggested_action: parsed.suggested_action,
    raw_data: {
      headlines,
      impacted_sectors: parsed.impacted_sectors,
      sentiment: parsed.sentiment,
    },
  };

  await supabase.from('insights').insert(payload);

  // Step 6: Return insight
  return parsed;
}
