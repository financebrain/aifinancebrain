'use client'

import { useCallback, useEffect, useState } from 'react'

import supabase from '@/lib/supabase'

import PortfolioCard from '@/components/dashboard/PortfolioCard'
import PortfolioInput from '@/components/dashboard/PortfolioInput'
import Chatbot from '@/components/dashboard/Chatbot'
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
      
      <PortfolioInput />

      <div className="max-w-4xl w-full mt-6">
        {decisionInsight ? (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col gap-6">
            {/* Top: Status Badge */}
            <div className="flex justify-between items-center">
              <span className="px-4 py-1.5 bg-gray-100 text-gray-600 text-[11px] font-bold uppercase tracking-wider rounded-lg">
                Status: {decisionInsight.raw_data?.status || 'Analyzing'}
              </span>
            </div>

            {/* Middle: Insight & Impact */}
            <div className="space-y-4">
              <p className="text-2xl text-gray-900 font-medium leading-snug">
                {decisionInsight.raw_data?.insight}
              </p>
              <p className="text-lg text-gray-500 font-medium">
                {decisionInsight.raw_data?.impact_on_user}
              </p>
            </div>

            {/* Bottom: Action & Next Step */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-3 mt-2">
              <p className="text-xl font-bold text-[#1B2A4A]">
                {decisionInsight.raw_data?.action}
              </p>
              <p className="text-base text-gray-500 font-medium">
                {decisionInsight.raw_data?.next_step}
              </p>
            </div>

            {/* Button: WHY */}
            <div className="pt-2">
              <button 
                onClick={() => setShowWhy(true)}
                className="px-8 py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold tracking-widest transition shadow-sm"
              >
                WHY?
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
      <Chatbot results={results} />
    </div>
  )
}

function WhySection({ results, onClose }) {
  const why = results.finalDecision?.why || {};

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm transition-opacity">
      <div className="bg-[#0b1221] w-full max-w-2xl max-h-[90vh] sm:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl relative text-white animate-in slide-in-from-bottom duration-300 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="sticky top-0 bg-[#0b1221] z-20 px-8 py-6 border-b border-white/10 flex justify-between items-center shadow-sm">
           <div>
               <h2 className="text-xl font-semibold tracking-wide text-white">Decision Logic Breakdown</h2>
           </div>
           
           <button 
             onClick={onClose}
             className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
           >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto w-full space-y-8 custom-scrollbar">
          
          <div>
            <h3 className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-3 border-b border-gray-800/50 pb-2">1. Market Summary</h3>
            <p className="text-gray-200 text-[15px] leading-relaxed">{why.market_summary || 'Awaiting structural breakdown.'}</p>
          </div>

          <div>
            <h3 className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-3 border-b border-gray-800/50 pb-2">2. Sector Movement</h3>
            <p className="text-gray-200 text-[15px] leading-relaxed">{why.sector_analysis || 'Awaiting sector logic.'}</p>
          </div>

          <div>
            <h3 className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-3 border-b border-gray-800/50 pb-2">3. News Impact</h3>
            <p className="text-gray-200 text-[15px] leading-relaxed">{why.news_impact || 'Awaiting macroeconomic signals.'}</p>
          </div>

          <div>
            <h3 className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-3 border-b border-gray-800/50 pb-2">4. Risk Analysis</h3>
            <p className="text-gray-200 text-[15px] leading-relaxed">{why.risk_analysis || 'Awaiting risk calibration.'}</p>
          </div>

          <div>
            <h3 className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-3 border-b border-gray-800/50 pb-2">5. Portfolio Impact</h3>
            <p className="text-gray-200 text-[15px] leading-relaxed">{why.portfolio_impact || 'Awaiting exposure logic.'}</p>
          </div>

        </div>
      </div>
    </div>
  )
}

