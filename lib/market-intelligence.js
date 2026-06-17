import YahooFinance from 'yahoo-finance2'
import { fetchTopSectors } from './data-fetcher.js'

const yahooFinance = new YahooFinance()
const NIFTY_SYMBOL = '^NSEI'
const INDIA_VIX_SYMBOLS = ['^INDIAVIX', '^VIX']

function safeNumber(value) {
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : null
}

function normalizeSectorName(name) {
  if (!name) return 'general'
  const value = name.toLowerCase()
  if (value.includes('bank')) return 'banking'
  if (value.includes('it')) return 'technology'
  if (value.includes('auto')) return 'auto'
  if (value.includes('pharma')) return 'pharma'
  if (value.includes('energy')) return 'energy'
  if (value.includes('metal')) return 'metal'
  if (value.includes('consumer')) return 'consumer'
  return value.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function determineMarketSentiment(price, dma20) {
  if (price == null || dma20 == null) return 'neutral'
  if (price > dma20) return 'bullish'
  if (price < dma20) return 'bearish'
  return 'neutral'
}

function classifyVolatility(vix) {
  if (vix == null || isNaN(vix)) return 0.18
  if (vix < 15) return 0.12
  if (vix <= 20) return 0.18
  return 0.28
}

function determineRiskLevel(volatility, marketSentiment) {
  if (marketSentiment === 'bearish') return 'high'
  if (volatility >= 0.28) return 'high'
  if (volatility >= 0.18) return 'medium'
  return 'low'
}

function determineRegime({ volatility, trendStrength }) {
  if (volatility >= 0.28) return 'volatile'
  if (trendStrength >= 0.015) return 'trending'
  return 'sideways'
}

function computeTwentyDayMA(closes) {
  if (!Array.isArray(closes) || closes.length === 0) return null
  const validCloses = closes.filter(c => c != null)
  if (validCloses.length === 0) return null
  const slice = validCloses.slice(-20)
  const sum = slice.reduce((acc, value) => acc + value, 0)
  return sum / slice.length
}

async function fetchNiftyCloseHistory() {
  const end = new Date()
  const start = new Date(end.getTime() - 45 * 24 * 60 * 60 * 1000)
  try {
    const history = await yahooFinance.historical(NIFTY_SYMBOL, {
      period1: start,
      period2: end,
      interval: '1d'
    })
    if (!Array.isArray(history)) return []
    return history
      .map(row => safeNumber(row.close))
      .filter(price => price != null)
  } catch (error) {
    console.warn('Failed to fetch Nifty history:', error.message)
    return []
  }
}

async function fetchNiftyPrice() {
  try {
    const quote = await yahooFinance.quote(NIFTY_SYMBOL)
    return safeNumber(quote.regularMarketPrice)
  } catch (error) {
    console.warn('Failed to fetch Nifty quote:', error.message)
    return null
  }
}

async function fetchIndiaVix() {
  for (const symbol of INDIA_VIX_SYMBOLS) {
    try {
      const quote = await yahooFinance.quote(symbol)
      const value = safeNumber(quote.regularMarketPrice)
      if (value != null) return value
    } catch (error) {
      console.warn(`Failed to fetch VIX for ${symbol}:`, error.message)
    }
  }
  return null
}

async function determineTopSector() {
  try {
    const sectors = await fetchTopSectors()
    const ranked = sectors
      .filter(item => item?.changePercent != null)
      .sort((a, b) => b.changePercent - a.changePercent)

    if (ranked.length === 0) return 'general'
    return normalizeSectorName(ranked[0].name)
  } catch (error) {
    console.warn('Failed to fetch top sector:', error.message)
    return 'general'
  }
}

export async function getMarketContext() {
  const [niftyPrice, closes, vixValue, sector] = await Promise.all([
    fetchNiftyPrice(),
    fetchNiftyCloseHistory(),
    fetchIndiaVix(),
    determineTopSector()
  ])

  const dma20 = computeTwentyDayMA(closes)
  const marketSentiment = determineMarketSentiment(niftyPrice, dma20)
  const volatility = classifyVolatility(vixValue)
  const trendStrength = dma20 && niftyPrice ? Math.abs(niftyPrice - dma20) / dma20 : 0
  const regime = determineRegime({ volatility, trendStrength })
  const riskLevel = determineRiskLevel(volatility, marketSentiment)

  const marketContext = {
    marketSentiment,
    sector,
    riskLevel,
    volatility,
    regime
  }

  console.log('MARKET_CONTEXT:', marketContext)

  return marketContext
}
