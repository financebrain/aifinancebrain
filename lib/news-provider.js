export async function getNewsData() {
  let newsItems = [];

  // 1. PRIMARY: NewsAPI
  try {
    const key = process.env.NEXT_PUBLIC_NEWS_API_KEY || process.env.NEWS_API_KEY;
    if (key && key !== 'your_api_key_here') {
      const res = await fetch(
        `https://newsapi.org/v2/everything?q="Indian stock market" OR Nifty OR Sensex OR RBI&sortBy=publishedAt&language=en&apiKey=${key}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.articles) {
          data.articles.forEach(article => {
            newsItems.push({
              title: article.title,
              summary: article.description || '',
              source: article.source?.name || 'NewsAPI'
            });
          });
        }
      }
    }
  } catch (e) {
    console.log("NewsAPI fetch failed");
  }

  // 2. SECONDARY: Yahoo Finance News
  try {
    const YahooFinance = (await import('yahoo-finance2')).default;
    const res = await YahooFinance.search('^NSEI', { newsCount: 10 });
    if (res.news) {
      res.news.forEach(item => {
        newsItems.push({
           title: item.title,
           summary: item.publisher || '',
           source: 'Yahoo Finance'
        });
      });
    }
  } catch (e) {
    console.log("Yahoo Finance News fetch failed");
  }

  // 3. FALLBACK: Static Safe Data
  if (newsItems.length === 0) {
    console.log("External APIs failed, returning static safe data");
    newsItems = [
      {
        title: "Nifty 50 approaches key structural resistance level",
        summary: "Institutional buying persists despite slightly stretched near-term valuations.",
        source: "Static Fallback"
      },
      {
        title: "RBI likely to hold repo rates in upcoming monetary policy",
        summary: "Inflation targeting remains priority as domestic growth robust.",
        source: "Static Fallback"
      },
      {
        title: "IT spending recovery triggers strong inflow into Indian tech stocks",
        summary: "Midcap and large-cap IT counters lead the ongoing market rotation.",
        source: "Static Fallback"
      }
    ];
  }

  // 4. FILTER RELEVANT: Retain strict domestic financial context
  const isRelevant = (text) => {
    if (!text) return false;
    const lower = text.toLowerCase();
    const keywords = ['india', 'indian', 'nifty', 'sensex', 'rbi', 'rupee', 'bse', 'nse', 'sector', 'bank', 'tcs', 'infosys', 'reliance', 'stock', 'market', 'economy', 'financial'];
    return keywords.some(kw => lower.includes(kw));
  };

  let filteredNews = newsItems.filter(item => {
     if (item.source === 'Static Fallback') return true;
     return isRelevant(item.title) || isRelevant(item.summary);
  });

  // Remove generic global noise / Deduplicate
  const seen = new Set();
  filteredNews = filteredNews.filter(item => {
     if (seen.has(item.title)) return false;
     seen.add(item.title);
     return true;
  });

  // 5. ADVANCED SENTIMENT ENGINE
  const analyzeSentiment = (text) => {
      const lower = text.toLowerCase();
      const bullishWords = ['surge', 'gain', 'rally', 'jump', 'up', 'buy', 'growth', 'profit', 'outperform', 'high', 'breakout'];
      const bearishWords = ['fall', 'drop', 'slump', 'crash', 'down', 'sell', 'loss', 'underperform', 'low', 'fear', 'inflation', 'risk', 'headwind'];
      
      let score = 0;
      bullishWords.forEach(w => { if (lower.includes(w)) score++; });
      bearishWords.forEach(w => { if (lower.includes(w)) score--; });
      
      if (score > 0) return 'bullish';
      if (score < 0) return 'bearish';
      return 'neutral';
  };

  // 6. MERGE AND LIMIT RESULTS (5-7 Items)
  const finalNews = filteredNews.slice(0, 7).map(item => ({
      title: item.title,
      summary: item.summary,
      source: item.source,
      sentiment: analyzeSentiment(`${item.title} ${item.summary}`)
  }));

  console.log(`MERGED NEWS SOURCES: Extracted ${finalNews.length} high-signal headlines.`);

  return finalNews;
}
