'use client'
import { useEffect, useMemo, useState } from 'react'
import supabase from '@/lib/supabase'
import { ThumbsUp, ThumbsDown, Users, Brain, TrendingUp } from 'lucide-react'

const TYPE_COLORS = {
  market: 'bg-blue-100 text-blue-700',
  news: 'bg-purple-100 text-purple-700',
  sector: 'bg-amber-100 text-amber-700',
  opportunity: 'bg-green-100 text-green-700',
  risk: 'bg-red-100 text-red-700',
}

export default function AdminDashboard() {
  const [feedback, setFeedback] = useState([])
  const [insights, setInsights] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [feedbackRes, insightsRes] = await Promise.all([
          supabase
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('insights')
            .select('id,type,created_at')
            .order('created_at', { ascending: false }),
        ])

        if (cancelled) return

        const fb = feedbackRes.data || []
        const ins = insightsRes.data || []

        setFeedback(fb)
        setInsights(ins)

        const totalFeedback = fb.length
        const helpfulCount = fb.filter((f) => f.rating === 'helpful').length
        const helpfulnessRate = totalFeedback
          ? Math.round((helpfulCount / totalFeedback) * 100)
          : 0

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const insightsToday = ins.filter((i) => {
          const d = new Date(i.created_at)
          return Number.isFinite(d.getTime()) && d >= today
        }).length

        setStats({
          totalInsights: ins.length,
          totalFeedback,
          helpfulnessRate,
          insightsToday,
          helpfulCount,
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const insightCounts = useMemo(() => {
    const counts = {
      market: 0,
      news: 0,
      sector: 0,
      opportunity: 0,
      risk: 0,
    }
    for (const i of insights) {
      if (i?.type && counts[i.type] !== undefined) counts[i.type] += 1
    }
    return counts
  }, [insights])

  async function clearOldInsights() {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const keepIds = new Set((insights || []).slice(0, 20).map((i) => i.id))
    const idsToDelete = (insights || [])
      .filter((i) => !keepIds.has(i.id))
      .filter((i) => new Date(i.created_at) < cutoff)
      .map((i) => i.id)

    if (idsToDelete.length === 0) return

    await supabase.from('insights').delete().in('id', idsToDelete)

    const { data } = await supabase
      .from('insights')
      .select('id,type,created_at')
      .order('created_at', { ascending: false })

    setInsights(data || [])
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">Admin Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Only you see this</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Total Insights Generated
            </p>
            <Brain size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-[#1B2A4A] mt-2">
            {loading ? '—' : stats.totalInsights ?? 0}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Total Feedback Received
            </p>
            <Users size={18} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-[#1B2A4A] mt-2">
            {loading ? '—' : stats.totalFeedback ?? 0}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Helpfulness Rate
            </p>
            <TrendingUp size={18} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-[#1B2A4A] mt-2">
            {loading ? '—' : `${stats.helpfulnessRate ?? 0}%`}
          </p>
          {!loading ? (
            <p className="text-xs text-gray-400 mt-1">
              {stats.helpfulCount ?? 0} helpful votes
            </p>
          ) : null}
        </div>

        <div className="bg-white rounded-xl shadow-md p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Insights Today
            </p>
            <Brain size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-[#1B2A4A] mt-2">
            {loading ? '—' : stats.insightsToday ?? 0}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="font-semibold text-[#1B2A4A]">Insight breakdown</h2>
        <div className="flex flex-wrap gap-2 mt-4">
          {['market', 'news', 'sector', 'opportunity', 'risk'].map((t) => (
            <span
              key={t}
              className={[
                'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium',
                TYPE_COLORS[t] || 'bg-gray-100 text-gray-700',
              ].join(' ')}
            >
              <span className="capitalize">{t}</span>
              <span className="bg-white/60 px-2 py-0.5 rounded-full">
                {loading ? '—' : insightCounts[t]}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-[#1B2A4A]">Feedback</h2>
        </div>

        {loading ? (
          <div className="px-6 py-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : feedback.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-gray-500">
              No feedback yet — share the app with users
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Time', 'Rating', 'Insight ID'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {feedback.slice(0, 50).map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-700 font-mono">
                      {f.created_at
                        ? new Date(f.created_at).toLocaleString('en-IN')
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {f.rating === 'helpful' ? (
                        <span className="inline-flex items-center gap-2 text-green-700 text-sm font-medium">
                          <ThumbsUp size={16} className="text-green-600" />
                          helpful
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-red-700 text-sm font-medium">
                          <ThumbsDown size={16} className="text-red-600" />
                          not_helpful
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-mono">
                      {(f.insight_id || '').toString().slice(0, 8) || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={clearOldInsights}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Clear Old Insights (keep last 20)
        </button>
      </div>
    </div>
  )
}

