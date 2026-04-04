import { NextResponse } from 'next/server';

import { runOpportunityAgent } from '../../../../agents/opportunity-agent.js';

export async function GET(request) {
  try {
    const result = await runOpportunityAgent();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
