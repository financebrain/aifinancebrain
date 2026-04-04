import { NextResponse } from 'next/server';

import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

import { runMarketAgent } from '../../../agents/market-agent.js';
import { runNewsAgent } from '../../../agents/news-agent.js';
import { runSectorAgent } from '../../../agents/sector-agent.js';
import { runOpportunityAgent } from '../../../agents/opportunity-agent.js';
import { runRiskAgent } from '../../../agents/risk-agent.js';

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // no-op: this route only needs to READ session cookies
          },
        },
      },
    )
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id || null

    // Delete ALL existing insights before generating fresh ones
    const { error: deleteError } = await supabase
      .from('insights')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (deleteError) {
      console.error('Delete error:', deleteError)
    } else {
      console.log('Cleared all old insights')
    }

    // Small delay to ensure deletion completes
    await new Promise(resolve => setTimeout(resolve, 500))

    // Then run all agents as normal

    const settled = await Promise.allSettled([
      runMarketAgent(userId),
      runNewsAgent(userId),
      runSectorAgent(userId),
      runOpportunityAgent(userId),
      runRiskAgent(userId),
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
