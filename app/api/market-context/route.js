import { NextResponse } from 'next/server'
import { getMarketContext } from '../../../lib/market-intelligence.js'

export async function GET() {
  try {
    const context = await getMarketContext()
    return NextResponse.json(context)
  } catch (error) {
    console.error('MARKET_CONTEXT_ERROR:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
