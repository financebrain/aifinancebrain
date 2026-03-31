import { NextResponse } from 'next/server';

import { runMarketAgent } from '../../../../agents/market-agent.js';

export async function GET(request) {
  try {
    const result = await runMarketAgent();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
