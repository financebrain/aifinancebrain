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

async function getPrice(symbol) {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS`);
    const data = await res.json();
    return data.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
  } catch (err) {
    console.error(`Failed to fetch price for ${symbol}:`, err);
    return 0;
  }
}

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

    let portfolio = {}
    if (userId) {
      const { data: holdings, error } = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', userId)

      const stockToSector = {
        INFY: "IT",
        TCS: "IT",
        WIPRO: "IT",

        HDFCBANK: "Banking",
        ICICIBANK: "Banking",
        SBIN: "Banking",

        SUNPHARMA: "Pharma",
        DRREDDY: "Pharma",

        RELIANCE: "Energy",
        ONGC: "Energy"
      }

      for (const h of (holdings || [])) {
        const symbol = h.symbol;
        const qty = Array.isArray(h.quantity) || typeof h.quantity === 'undefined' ? 0 : h.quantity;

        const sector = stockToSector[symbol];
        if (!sector) continue;

        const price = await getPrice(symbol);
        const value = price * qty;

        if (!portfolio[sector]) {
          portfolio[sector] = 0;
        }

        portfolio[sector] += value;
      }

      const total = Object.values(portfolio).reduce((a, b) => a + b, 0)

      if (total > 0) {
        Object.keys(portfolio).forEach(sector => {
          portfolio[sector] = Math.round((portfolio[sector] / total) * 100)
        })
      }
    }

    console.log("FINAL PORTFOLIO:", portfolio)

    const runId = uuidv4();

    console.log("RUNNING AGENTS...")

    const settled = await Promise.allSettled([
      runMarketAgent(userId, runId),
      runNewsAgent(userId, runId),
      runSectorAgent(userId, runId),
      runOpportunityAgent(userId, runId),
      runRiskAgent(userId, runId),
    ]);

    console.log("RAW RESULTS:", settled)

    const toPayload = (result) => {
      if (result.status === 'fulfilled') return result.value;

      console.error("AGENT ERROR:", result.reason);

      return {
        error: result.reason?.message || "Unknown error"
      };
    };

    const [market, news, sector, opportunity, risk] = settled.map(toPayload);



    const finalDecision = buildFinalDecision({
      market,
      news,
      sector,
      opportunity,
      risk,
      portfolio
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
    console.error("ROUTE ERROR:", error);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
