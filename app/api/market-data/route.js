import { NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
const yahooFinance = new YahooFinance()

function safeNum(v) {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

export async function GET() {
  const symbols = [
    { key: 'nifty',     yahoo: '^NSEI',    name: 'NIFTY 50'  },
    { key: 'banknifty', yahoo: '^NSEBANK', name: 'BANK NIFTY'},
    { key: 'it',        yahoo: '^CNXIT',   name: 'IT INDEX'  },
    { key: 'gold',      yahoo: 'GC=F',     name: 'GOLD'      },
    { key: 'usdinr',    yahoo: 'INR=X',    name: 'USD/INR'   },
  ]

  const results = await Promise.allSettled(
    symbols.map(s => yahooFinance.quote(s.yahoo))
  )

  const indicators = symbols.map((s, i) => {
    if (results[i].status === 'rejected') {
      return { name: s.name, value: '--', change: '--', positive: true }
    }
    const q = results[i].value
    const price  = safeNum(q.regularMarketPrice)
    const change = safeNum(q.regularMarketChangePercent)

    let value
    if (s.key === 'gold') {
      value = '₹' + Math.round(price * 83).toLocaleString('en-IN')
    } else if (s.key === 'usdinr') {
      value = price.toFixed(2)
    } else {
      value = price > 1000
        ? price.toLocaleString('en-IN', { maximumFractionDigits: 0 })
        : price.toFixed(2)
    }

    return {
      name: s.name,
      value,
      change: (change >= 0 ? '+' : '') + change.toFixed(2) + '%',
      positive: change >= 0,
    }
  })

  return NextResponse.json({ success: true, indicators })
}
