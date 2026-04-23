import { getNewsData } from '../lib/news-provider.js';
import { callGemini } from '../lib/gemini.js';
import supabase from '../lib/supabase.js';
import { getUserContext } from '../lib/user-context.js'
import { cleanAndParseJSON, validateJSONStructure } from '../lib/json-utils.js'

export async function runNewsAgent(userId = null, runId = null) {
  // Step 1: Fetch raw market data
  const news = await getNewsData();
  
  // Format with embedded sentiment to guide LLM logic
  const headlinesText = news.map(n => `[${n.sentiment.toUpperCase()}] ${n.title} (Source: ${n.source})`).join(' | ');

  // Step 2: Build Gemini prompt
  const userContext = await getUserContext(userId);
  const prompt = `You are a senior financial news analyst for India.
   Analyze these market headlines and extract key signals.
   Headlines: ${headlinesText}
   
   Respond ONLY with valid JSON, no markdown:
   {
     "title": "key theme in under 10 words",
     "summary": "2 sentence analysis of what these headlines mean for markets",
     "impacted_sectors": ["sector1", "sector2"],
     "sentiment": "bullish" or "bearish" or "neutral",
     "confidence": "high" or "medium" or "low",
     "suggested_action": "one plain English sentence"
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
  if (!validateJSONStructure(parsed, ['title', 'summary', 'sentiment', 'confidence', 'suggested_action'])) {
    throw new Error('Gemini response missing required fields');
  }

  // Step 5: Store in Supabase
  const payload = {
    type: 'news',
    title: parsed.title,
    reason: parsed.summary,
    confidence: parsed.confidence,
    suggested_action: parsed.suggested_action,
    run_id: runId,
    raw_data: {
      headlines: news,
      impacted_sectors: parsed.impacted_sectors,
      sentiment: parsed.sentiment,
    },
  };

  await supabase.from('insights').insert(payload);

  // Step 6: Return insight
  return parsed;
}
