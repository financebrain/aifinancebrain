import { NextResponse } from 'next/server';

import { runRiskAgent } from '../../../../agents/risk-agent.js';

export async function GET(request) {
  try {
    const result = await runRiskAgent();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
