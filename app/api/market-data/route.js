import axios from 'axios'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const symbols = [
      { key: 'nifty', yahoo: '%5ENSEI', name: 'NIFTY 50' },
      { key: 'banknifty', yahoo: '%5ENSEBANK', name: 'BANK NIFTY' },
      { key: 'it', yahoo: '%5ECNXIT', name: 'IT INDEX' },
      { key: 'gold', yahoo: 'GOLD=F', name: 'GOLD' },
      { key: 'usdinr', yahoo: 'INR%3DX', name: 'USD/INR' },
    ]

    const results = await Promise.allSettled(
      symbols.map(s =>
        axios.get(
          `https://query1.finance.yahoo.com/v8/finance/chart/${s.yahoo}`,
          { params: { interval: '1d', range: '2d' },
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000 }
        )
      )
    )

    const indicators = symbols.map((s, i) => {
      if (results[i].status === 'rejected') {
        return { name: s.name, value: '--', change: '0%', positive: true }
      }
      const chart = results[i].value.data.chart.result[0]
      const closes = chart.indicators.quote[0].close
      const latest = closes[closes.length - 1]
      const prev = closes[closes.length - 2] || latest
      const changePercent = ((latest - prev) / prev * 100).toFixed(2)
      const isGold = s.key === 'gold'
      const value = isGold
        ? '₹' + Math.round(latest * 83).toLocaleString('en-IN')
        : latest > 1000
          ? latest.toFixed(0)
          : latest.toFixed(2)
      return {
        name: s.name,
        value,
        change: (changePercent > 0 ? '+' : '') + changePercent + '%',
        positive: parseFloat(changePercent) >= 0
      }
    })

    return NextResponse.json({ success: true, indicators })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
