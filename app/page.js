'use client'

import { useCallback, useEffect, useState } from 'react'

import supabase from '@/lib/supabase'

import PortfolioCard from '@/components/dashboard/PortfolioCard'
import AIInsightHero from '@/components/dashboard/AIInsightHero'
import MarketSnapshot from '@/components/dashboard/MarketSnapshot'
import OpportunityRadar from '@/components/dashboard/OpportunityRadar'
import RiskAlerts from '@/components/dashboard/RiskAlerts'
import MarketBriefSection from '@/components/dashboard/MarketBriefSection'

export default function Home() {
  const [insights, setInsights] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')
  const [clock, setClock] = useState('')
  const [greeting, setGreeting] = useState('Good morning.')
  const [showWhy, setShowWhy] = useState(false)

  const heroInsight = insights.find((i) => i?.type === 'market') || null
  const decisionInsight = insights.find((i) => i?.type === 'decision') || null
  
  const results = {
    market: insights.find(i => i?.type === 'market')?.raw_data || {},
    sector: insights.find(i => i?.type === 'sector')?.raw_data || {},
    news: insights.find(i => i?.type === 'news')?.raw_data || {},
    opportunity: insights.find(i => i?.type === 'opportunity')?.raw_data || {},
    risk: insights.find(i => i?.type === 'risk')?.raw_data || {},
    finalDecision: decisionInsight?.raw_data || {}
  };

  const loadInsights = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/insights')
      const data = await res.json()
      console.log('Insights loaded:', data)
      if (data.success && Array.isArray(data.data)) {
        setInsights(data.data)
      }
    } catch (e) {
      console.error('Failed to load insights:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInsights()

    const channel = supabase
      .channel('insights-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'insights' },
        (payload) => {
          console.log('New insight detected, reloading...')
          // Instead of mixing old and new state, we rely on the backend's
          // get-latest-run grouping to naturally roll into the newest data:
          loadInsights()
        },
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [loadInsights])

  useEffect(() => {
    const origFetch = window.fetch.bind(window)
    window.fetch = async (...args) => {
      const res = await origFetch(...args)
      try {
        const input = args[0]
        const url = typeof input === 'string' ? input : input?.url ?? ''
        if (String(url).includes('/api/run-all')) {
          await loadInsights()
        }
      } catch {
        /* ignore */
      }
      return res
    }
    return () => {
      window.fetch = origFetch
    }
  }, [loadInsights])

  useEffect(() => {
    function tick() {
      const now = new Date()
      const ist = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(now)
      setClock(ist + ' IST')

      const hour = new Date(
        now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      ).getHours()
      if (hour < 12) setGreeting('Good morning.')
      else if (hour < 17) setGreeting('Good afternoon.')
      else setGreeting('Good evening.')
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-16 px-6">
      
      {/* Top Logo / Title */}
      <div className="max-w-4xl w-full flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A] tracking-tight">{greeting}</h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">Your AI Financial Copilot</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">Engine Active</span>
          </div>
          {insights.length > 0 && (
              <span className="text-xs text-gray-400 font-mono">
                {new Date(insights[0]?.created_at).toLocaleTimeString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
          )}
        </div>
      </div>

      <div className="max-w-4xl w-full">
        {decisionInsight ? (
          <div className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-[2rem] p-8 md:p-12 shadow-2xl border border-white/5 text-white transition-all duration-500 hover:shadow-blue-900/20">
            {/* Background Glow Overlay */}
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-10 relative z-10">
              <h2 className="text-lg font-semibold tracking-widest text-blue-400 uppercase">Today's Decision</h2>
              
              {/* Conditional Badges */}
              <div className="flex gap-3">
                {decisionInsight.raw_data?.beginner && (
                  <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm backdrop-blur-md">
                    Getting Started
                  </span>
                )}
                {decisionInsight.raw_data?.personalized && (
                  <span className="px-4 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm backdrop-blur-md">
                    Based on Your Portfolio
                  </span>
                )}
              </div>
            </div>
            
            {/* Primary Action */}
            <div className="mb-12 relative z-10">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.15] tracking-tight whitespace-pre-wrap">
                {decisionInsight.raw_data?.action || decisionInsight.suggested_action}
              </h1>
            </div>
            
            {/* Context Blocks Removed -> Substituted with Focus UX */}
            <div className="mb-10 relative z-10 w-full max-w-3xl">
              <p className="text-xl md:text-2xl text-blue-200 font-medium leading-relaxed">
                {decisionInsight.raw_data?.reasoning || decisionInsight.reason}
              </p>
            </div>
            
            {/* Footer Metrics / Trigger Button */}
            <div className="pt-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-10 opacity-80 pl-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-blue-300/70 font-bold uppercase tracking-[0.2em]">Confidence</span>
                  <span className="text-base font-black uppercase text-white tracking-widest">
                    {decisionInsight.raw_data?.confidence || decisionInsight.confidence}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setShowWhy(true)}
                className="group relative px-8 py-4 bg-white text-[#0F172A] rounded-full font-bold uppercase tracking-widest text-sm self-start md:self-auto overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative flex items-center gap-3 z-10">
                   See Why
                   <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                   </svg>
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-32 bg-white rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center">
             <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-r-2 border-indigo-400 animate-[spin_1.5s_linear_infinite]"></div>
             </div>
             <h3 className="text-xl font-bold text-gray-800 mb-2">Synthesizing Intelligence</h3>
             <p className="text-gray-500 text-sm">Quantifying market momentum and portfolio structures...</p>
          </div>
        )}
      </div>

      {showWhy && <WhySection results={results} onClose={() => setShowWhy(false)} />}
    </div>
  )
}

function WhySection({ results, onClose }) {
  const isBeginner = results.finalDecision?.beginner === true;
  const isPersonalized = results.finalDecision?.personalized === true;

  // 1. MARKET
  const marketVal = (results.market?.sentiment || 'neutral').toLowerCase();
  const marketStr = marketVal === 'bullish' 
    ? "Market is not overheated → supports decisive breakout buying" 
    : marketVal === 'bearish'
    ? "Market structure is fragile → strictly reduce position sizing"
    : "Market is stabilizing → safe for controlled entry positions";

  // 2. SECTOR
  const topSector = results.sector?.top_sector || 'Core Indices';
  const sectorStr = `Money is moving into ${topSector} → higher probability of short-term continuation`;

  // 3. NEWS
  const newsVal = (results.news?.sentiment || 'neutral').toLowerCase();
  let newsStr = "No strong macro news → price likely driven by technical momentum directly";
  if (newsVal === 'bullish') newsStr = "Positive broad sentiment → supports immediate trend continuation";
  if (newsVal === 'bearish') newsStr = "Negative macro sentiment developing → risk of reversal, avoid aggressive entry";

  // 4. RISK
  const riskVal = (results.risk?.severity || 'medium').toLowerCase();
  let riskStrStr = `${topSector} is within normal bounds → size positions to average standard`;
  if (riskVal === 'high') riskStrStr = `${topSector} is technically extended → enter in very small quantities to avoid immediate drawdown`;
  else if (riskVal === 'low') riskStrStr = `Downside risk metrics are minimal → mathematically optimal zone for entry`;

  // 5. OPPORTUNITY
  const oppStr = isBeginner 
    ? `Best opportunity structurally resides currently in ${topSector} benchmark ETFs or sector leaders.` 
    : (results.opportunity?.reason ? `Target opportunity zone: ${results.opportunity.reason}` : `High-conviction setups isolated to ${topSector} leaders.`);

  // 6. EXPECTATION (MANDATORY)
  const expectedStr = `If ${topSector} continues running → short-term upside returns likely.
If momentum slows unexpectedly → expect a standard technical pullback before the next leg up.`;

  // 7. POSITIONS
  let positionStr = null;
  if (isPersonalized) {
    positionStr = `Based on your existing portfolio map:
You already possess actively correlated exposure → avoid artificially stacking aggressive buying.`;
  } else if (isBeginner || (!isPersonalized && !isBeginner && Object.keys(results.finalDecision?.portfolio || {}).length === 0)) {
    positionStr = `You're starting completely fresh → it is mathematically safe to begin establishing initial small allocation tiers.`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm transition-opacity">
      <div className="bg-[#0b1221] w-full max-w-2xl max-h-[90vh] sm:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl relative text-white animate-in slide-in-from-bottom duration-300 overflow-hidden flex flex-col">
        
        {/* Sticky Header */}
        <div className="sticky top-0 bg-[#0b1221] z-20 px-8 py-6 border-b border-white/5 flex justify-between items-center shadow-sm">
           <div>
               <h2 className="text-2xl font-bold tracking-tight text-white">Decision Intelligence</h2>
           </div>
           
           <button 
             onClick={onClose}
             className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
           >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-8 overflow-y-auto w-full space-y-10 custom-scrollbar">
          
          {/* Personalized Core Injection */}
          {positionStr && (
            <div className="bg-gradient-to-r from-indigo-500/10 to-transparent border-l-4 border-indigo-500 p-5 rounded-r-xl">
              <h3 className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-90">Your Position</h3>
              <p className="text-white text-base leading-relaxed font-semibold whitespace-pre-wrap">
                {positionStr}
              </p>
            </div>
          )}
          
          {/* Market */}
          <div>
            <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">1. Market Interpretation</h3>
            <p className="text-gray-200 text-[15px] leading-relaxed font-medium">
              {marketStr}
            </p>
          </div>

          {/* Sector */}
          <div>
            <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">2. Active Sector Flow</h3>
            <p className="text-gray-200 text-[15px] leading-relaxed font-medium">
              {sectorStr}
            </p>
          </div>

          {/* News */}
          <div>
            <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">3. Macro Sentiment Impact</h3>
            <p className="text-gray-200 text-[15px] leading-relaxed font-medium">
              {newsStr}
            </p>
          </div>

          {/* Opportunity */}
          <div>
            <h3 className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">4. Tactical Opportunity</h3>
            <p className="text-gray-200 text-[15px] leading-relaxed font-medium">
              {oppStr}
            </p>
          </div>

          {/* Risk */}
          <div>
            <h3 className="text-rose-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">5. Exposure Risk Assessment</h3>
            <p className="text-gray-200 text-[15px] leading-relaxed font-medium">
              {riskStrStr}
            </p>
          </div>
          
          {/* Expectations */}
          <div>
            <h3 className="text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">6. What To Expect Next</h3>
            <p className="text-gray-200 text-[15px] leading-relaxed font-medium whitespace-pre-wrap">
              {expectedStr}
            </p>
          </div>

        </div>

        {/* Action Footer Fix - 3 Triggers */}
        <div className="bg-[#0f1526] px-8 py-6 border-t border-white/5 flex flex-col md:flex-row items-center gap-4">
          <button 
            onClick={onClose}
            className="w-full md:w-1/2 py-4 rounded-[1rem] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-white/10 text-white font-bold tracking-widest uppercase text-[13px] shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all active:scale-[0.98]"
          >
            Take Action
          </button>
          
          <div className="w-full md:w-1/2 flex items-center gap-4">
             <button 
               onClick={onClose}
               className="flex-1 py-4 rounded-[1rem] bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold tracking-widest uppercase text-[11px] transition-all"
             >
               Remind Me
             </button>
             <button 
               onClick={onClose}
               className="flex-1 py-4 rounded-[1rem] bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold tracking-widest uppercase text-[11px] transition-all"
             >
               Save for Later
             </button>
          </div>
        </div>

      </div>
    </div>
  )
}

