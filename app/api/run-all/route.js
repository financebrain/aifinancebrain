import { NextResponse } from 'next/server';

import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

import { runMarketAgent } from '../../../agents/market-agent.js';
import { runNewsAgent } from '../../../agents/news-agent.js';
import { runSectorAgent } from '../../../agents/sector-agent.js';
import { runOpportunityAgent } from '../../../agents/opportunity-agent.js';
import { runRiskAgent } from '../../../agents/risk-agent.js';
import { buildFinalDecision } from '../../../agents/decision-engine.js';
import { personalizeDecision } from '../../../agents/personalization-engine.js';
import { applyPortfolioContext } from '../../../agents/portfolio-exposure-engine.js';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request) {
  try {
    const cookieStore = await cookies()
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

    const runId = uuidv4();

    const settled = await Promise.allSettled([
      runMarketAgent(userId, runId),
      runNewsAgent(userId, runId),
      runSectorAgent(userId, runId),
      runOpportunityAgent(userId, runId),
      runRiskAgent(userId, runId),
    ]);

    const toPayload = (result) => {
      if (result.status === 'fulfilled') return result.value;
      return { error: result.reason?.message };
    };

    const [market, news, sector, opportunity, risk] = settled.map(toPayload);

    const finalDecision = buildFinalDecision({
      market,
      news,
      sector,
      opportunity,
      risk
    });

    let userProfile = null;
    let userPortfolios = [];
    if (userId) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (profileData) userProfile = profileData;

      const { data: portfoliosData } = await supabase.from('portfolios').select('*').eq('user_id', userId);
      if (portfoliosData) userPortfolios = portfoliosData;
    }

    let personalizedDecision = personalizeDecision(finalDecision, userProfile);

    // Contextualize overexposure dynamically against highest momentum sector
    if (sector?.top_sector) {
      personalizedDecision = applyPortfolioContext(personalizedDecision, userPortfolios, sector.top_sector);
    }

    await supabase.from('insights').insert({
      type: 'decision',
      title: personalizedDecision.title,
      reason: personalizedDecision.summary,
      confidence: personalizedDecision.confidence,
      suggested_action: personalizedDecision.action,
      run_id: runId,
      raw_data: personalizedDecision
    });

    return NextResponse.json({
      success: true,
      results: { market, news, sector, opportunity, risk },
      finalDecision: personalizedDecision,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
