import { NextResponse } from 'next/server';

import supabase from '@/lib/supabase'

import { runMarketAgent } from '../../../agents/market-agent.js';
import { runNewsAgent } from '../../../agents/news-agent.js';
import { runSectorAgent } from '../../../agents/sector-agent.js';
import { runOpportunityAgent } from '../../../agents/opportunity-agent.js';
import { runRiskAgent } from '../../../agents/risk-agent.js';

export async function GET(request) {
  try {
    // Delete today's insights to prevent duplicates
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    await supabase
      .from('insights')
      .delete()
      .gte('created_at', today.toISOString())

    const settled = await Promise.allSettled([
      runMarketAgent(),
      runNewsAgent(),
      runSectorAgent(),
      runOpportunityAgent(),
      runRiskAgent(),
    ]);

    const toPayload = (result) => {
      if (result.status === 'fulfilled') return result.value;
      return { error: result.reason?.message };
    };

    const [market, news, sector, opportunity, risk] = settled.map(toPayload);

    return NextResponse.json({
      success: true,
      results: { market, news, sector, opportunity, risk },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
