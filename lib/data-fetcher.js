import axios from 'axios'

// ── Safe number helper ────────────────────────────────────
function safeNumber(v) {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : Math.round(n * 100) / 100
}

// ── Fetch Nifty data using yahoo-finance2 package ────────
// First install: npm install yahoo-finance2
import YahooFinance from 'yahoo-finance2'
const yahooFinance = new YahooFinance()

export async function fetchNiftyData() {
  try {
    const quote = await yahooFinance.quote('^NSEI')
    return {
      price: safeNumber(quote.regularMarketPrice),
      change: safeNumber(quote.regularMarketChange),
      changePercent: safeNumber(quote.regularMarketChangePercent),
      volume: quote.regularMarketVolume || 0,
    }
  } catch (e) {
    console.log('Nifty fetch failed:', e.message)
    return {
      price: 22800,
      change: 45,
      changePercent: 0.2,
      volume: 125000000,
      isEstimated: true,
    }
  }
}

export async function fetchTopSectors() {
  const symbols = [
    { symbol: '^NSEBANK', name: 'Bank Nifty' },
    { symbol: '^CNXIT',   name: 'IT Index'   },
    { symbol: '^CNXAUTO', name: 'Auto Index' },
    { symbol: '^NSEI',    name: 'Nifty 50'   },
  ]

  const results = await Promise.all(
    symbols.map(async ({ symbol, name }) => {
      try {
        const quote = await yahooFinance.quote(symbol)
        const changePercent = safeNumber(
          quote.regularMarketChangePercent
        )
        console.log(`${name}: ${changePercent}%`)
        return { name, symbol, changePercent }
      } catch (e) {
        console.log(`${name} failed:`, e.message)
        return { name, symbol, changePercent: 0.2, isEstimated: true }
      }
    })
  )
  return results
}


