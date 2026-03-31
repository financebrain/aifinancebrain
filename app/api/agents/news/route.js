import { NextResponse } from 'next/server';

import { runNewsAgent } from '../../../../agents/news-agent.js';

export async function GET(request) {
  try {
    const result = await runNewsAgent();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
