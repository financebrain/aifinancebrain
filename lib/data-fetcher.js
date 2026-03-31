import axios from 'axios';

const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';

function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function lastFiniteNumber(arr) {
  if (!Array.isArray(arr)) return 0;
  for (let i = arr.length - 1; i >= 0; i -= 1) {
    const n = arr[i];
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

async function fetchYahooChart(symbol, params) {
  const url = `${YAHOO_CHART_URL}${encodeURIComponent(symbol)}`;
  const res = await axios.get(url, { params });
  return res?.data?.chart?.result?.[0] ?? null;
}

export async function fetchNiftyData() {
  try {
    const result = await fetchYahooChart('^NSEI', { interval: '1d', range: '5d' });
    if (!result) throw new Error('No data');

    const quote = result.indicators?.quote?.[0] ?? {};
    const price = safeNumber(result.meta?.regularMarketPrice ?? lastFiniteNumber(quote.close));
    const prevClose = safeNumber(result.meta?.previousClose ?? lastFiniteNumber(quote.close?.slice(0, -1)));
    const change = safeNumber(price - prevClose);
    const changePercent = safeNumber(prevClose ? (change / prevClose) * 100 : 0);
    const volume = safeNumber(lastFiniteNumber(quote.volume));

    return { price, change, changePercent, volume };
  } catch {
    return { price: 0, change: 0, changePercent: 0, volume: 0 };
  }
}

export async function fetchTopSectors() {
  const sectors = [
    { symbol: '^NSEBANK', name: 'Bank Nifty' },
    { symbol: 'NIFTYMIDCAP150.NS', name: 'Nifty Midcap 150' },
    { symbol: '^CNXIT', name: 'IT Index' },
    { symbol: '^CNXAUTO', name: 'Auto Index' },
  ];

  const results = await Promise.all(
    sectors.map(async ({ symbol, name }) => {
      try {
        const result = await fetchYahooChart(symbol, { interval: '1d', range: '5d' });
        if (!result) throw new Error('No data');

        const price = safeNumber(result.meta?.regularMarketPrice);
        const prevClose = safeNumber(result.meta?.previousClose);
        const changePercent = safeNumber(prevClose ? ((price - prevClose) / prevClose) * 100 : 0);

        return { name, symbol, changePercent };
      } catch {
        return { name, symbol, changePercent: 0 };
      }
    }),
  );

  return results;
}

export async function fetchFinancialNews() {
  try {
    const res = await axios.get('https://economictimes.indiatimes.com/markets/rss.cms', {
      responseType: 'text',
    });

    const xml = String(res?.data ?? '');
    if (!xml) return [];

    const items = xml.split('<item').slice(1);
    const headlines = [];

    for (const itemChunk of items) {
      if (headlines.length >= 8) break;

      const match =
        itemChunk.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ??
        itemChunk.match(/<title>([\s\S]*?)<\/title>/i);

      const title = (match?.[1] ?? '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

      if (title) headlines.push(title);
    }

    return headlines;
  } catch {
    return [];
  }
}
