'use client'
import { useState } from 'react'
import { PlusCircle, TrendingUp, Shield, Wallet } from 'lucide-react'

export default function Portfolio() {
  const [holdings] = useState([
    { name: 'Nifty 50 Index ETF', symbol: 'NIFTYBEES', 
      qty: 10, avgPrice: 220, type: 'ETF' },
    { name: 'HDFC Bank', symbol: 'HDFCBANK', 
      qty: 5, avgPrice: 1650, type: 'Stock' },
    { name: 'Kotak Gold ETF', symbol: 'KOTAKGOLD', 
      qty: 20, avgPrice: 55, type: 'ETF' },
  ])

  const totalInvested = holdings.reduce(
    (sum, h) => sum + h.qty * h.avgPrice, 0
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2A4A]">
            My Portfolio
          </h1>
          <p className="text-gray-500 mt-1">
            Track and analyse your investments
          </p>
        </div>
        <button className="flex items-center gap-2 bg-[#2563EB] 
          text-white px-4 py-2 rounded-lg text-sm font-medium
          hover:bg-blue-700 transition-colors">
          <PlusCircle size={16} />
          Add Holding
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Invested', value: '₹' + 
            totalInvested.toLocaleString('en-IN'),
            icon: Wallet, color: 'blue' },
          { label: 'Holdings', value: holdings.length + ' assets',
            icon: TrendingUp, color: 'green' },
          { label: 'Portfolio Health', value: 'Good',
            icon: Shield, color: 'purple' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl shadow-md p-5">
            <p className="text-xs text-gray-500 uppercase 
              tracking-wide font-medium">
              {card.label}
            </p>
            <p className="text-2xl font-bold text-[#1B2A4A] mt-2">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Holdings Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-[#1B2A4A]">
            Your Holdings
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Asset', 'Symbol', 'Type', 'Qty', 
                  'Avg Price', 'Invested'].map(h => (
                  <th key={h} className="text-left px-6 py-3 
                    text-xs font-medium text-gray-500 
                    uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {holdings.map((h, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium 
                    text-[#1B2A4A]">{h.name}</td>
                  <td className="px-6 py-4 text-gray-600 
                    font-mono text-sm">{h.symbol}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-700 
                      text-xs px-2 py-1 rounded-full font-medium">
                      {h.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {h.qty}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    ₹{h.avgPrice.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 font-medium 
                    text-[#1B2A4A]">
                    ₹{(h.qty * h.avgPrice).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-gray-50 text-right">
          <p className="text-sm text-gray-500">
            Portfolio management coming in Phase 2 — 
            add/edit holdings with real-time AI analysis
          </p>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="mt-6 bg-gradient-to-r from-[#1B2A4A] 
        to-[#2563EB] rounded-xl p-6 text-white">
        <h3 className="font-bold text-lg">
          AI Portfolio Analysis — Coming Soon
        </h3>
        <p className="text-blue-100 text-sm mt-1">
          In Phase 2, our AI will analyse your specific holdings, 
          identify risks, and suggest rebalancing based on 
          real market conditions.
        </p>
      </div>

    </div>
  )
}
