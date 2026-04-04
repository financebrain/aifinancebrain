'use client'

import { useState, useEffect } from 'react'
import supabase from '@/lib/supabase'
import { TrendingUp, Plus } from 'lucide-react'
import Link from 'next/link'

export default function PortfolioCard() {
  const [holdings, setHoldings] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase
          .from('holdings')
          .select('*')
          .eq('user_id', user.id)
        setHoldings(data || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const totalInvested = holdings.reduce(
    (sum, h) => sum + (h.quantity * h.avg_buy_price),
    0,
  )

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#1B2A4A] to-[#2563EB] rounded-2xl p-6 animate-pulse h-48" />
    )
  }

  if (holdings.length === 0) {
    return (
      <div className="bg-gradient-to-br from-[#1B2A4A] to-[#2563EB] rounded-2xl p-6 text-white">
        <p className="text-blue-200 text-xs uppercase tracking-widest font-medium mb-3">
          PORTFOLIO
        </p>
        <h3 className="text-xl font-bold text-white mb-2">
          Add your investments
        </h3>
        <p className="text-blue-100 text-sm mb-5 leading-relaxed">
          Tell the AI what you own so it can personalise every insight specifically for your portfolio.
        </p>
        <Link
          href="/portfolio"
          className="flex items-center justify-center gap-2 bg-white text-[#1B2A4A] font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-blue-50 transition-colors w-full"
        >
          <Plus size={16} />
          Add Your Holdings
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-[#1B2A4A] to-[#2563EB] rounded-2xl p-6 text-white">
      <p className="text-blue-200 text-xs uppercase tracking-widest font-medium">
        PORTFOLIO OVERVIEW
      </p>
      <p className="text-4xl font-bold text-white mt-2">
        ₹{Math.round(totalInvested).toLocaleString('en-IN')}
      </p>
      <p className="text-blue-200 text-sm mt-1">
        Total invested across {holdings.length} holdings
      </p>

      <div className="border-t border-white/20 mt-4 pt-4">
        <div className="space-y-2">
          {holdings.slice(0, 3).map((h, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-blue-100 text-sm">
                {h.name}
              </span>
              <span className="text-white text-sm font-medium">
                ₹{Math.round(h.quantity * h.avg_buy_price).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
          {holdings.length > 3 && (
            <p className="text-blue-300 text-xs">
              +{holdings.length - 3} more holdings
            </p>
          )}
        </div>
      </div>

      <Link
        href="/portfolio"
        className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl mt-4 transition-colors w-full"
      >
        <TrendingUp size={14} />
        Manage Portfolio
      </Link>
    </div>
  )
}
