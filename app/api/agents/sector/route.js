import { NextResponse } from 'next/server';

import { runSectorAgent } from '../../../../agents/sector-agent.js';

export async function GET(request) {
  try {
    const result = await runSectorAgent();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
