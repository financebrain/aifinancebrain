'use client'

import { useEffect, useState } from 'react'

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

  const heroInsight = insights.find((i) => i?.type === 'market') || null
  const opportunities = insights.filter((i) => i?.type === 'opportunity')
  const risks = insights.filter((i) => i?.type === 'risk')
  const marketInsights = insights.filter((i) =>
    ['market', 'sector', 'news'].includes(i?.type),
  )

  useEffect(() => {
    let cancelled = false
    let channel = null

    const load = async () => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/insights')
        const json = await res.json()
        if (cancelled) return
        setInsights(Array.isArray(json?.data) ? json.data : [])
      } catch {
        if (cancelled) return
        setInsights([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    setLastUpdated(new Date().toLocaleTimeString())

    channel = supabase
      .channel('insights-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'insights' },
        (payload) => {
          setInsights((prev) => [payload.new, ...prev].slice(0, 20))
          setLastUpdated(new Date().toLocaleTimeString())
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

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
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Row 1 — Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-4xl font-bold text-[#1B2A4A] tracking-tight">
                {greeting}
              </h1>
              <span className="text-gray-400 text-base font-mono">
                {clock}
              </span>
            </div>
            <p className="text-gray-500 mt-2 text-base">
              Here is what is happening in Indian markets right now.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </div>
              <span className="text-xs text-green-600 font-medium">
                AI analyst active
              </span>
            </div>
            {insights.length > 0 && (
              <p className="text-xs text-gray-400">
                Last analysed{' '}
                {new Date(insights[0]?.created_at).toLocaleTimeString(
                  'en-IN',
                  {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit',
                    minute: '2-digit',
                  },
                )}{' '}
                IST
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Row 2 — Market Snapshot */}
      <MarketSnapshot />

      {/* Row 3 — Two column grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left */}
        <div className="lg:col-span-2">
          <AIInsightHero insight={heroInsight} isLoading={isLoading} />
        </div>

        {/* Right */}
        <div className="lg:col-span-1">
          <PortfolioCard />
        </div>
      </div>

      {/* Row 4 — Two column grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left */}
        <div className="lg:col-span-1">
          <OpportunityRadar
            opportunities={opportunities}
            isLoading={isLoading}
          />
        </div>

        {/* Right */}
        <div className="lg:col-span-1">
          <RiskAlerts risks={risks} isLoading={isLoading} />
        </div>
      </div>

      {/* Row 5 — Full width */}
      <MarketBriefSection insights={marketInsights} isLoading={isLoading} />
    </div>
  )
}

