'use client'
import { useState, useEffect } from 'react'
import supabase from '@/lib/supabase'
import {
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
  Shield,
  X,
  AlertCircle,
} from 'lucide-react'

const ASSET_TYPES = ['Stock', 'ETF', 'Mutual Fund', 'Gold', 'Other']

export default function Portfolio() {
  const [holdings, setHoldings] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({
    name: '',
    symbol: '',
    quantity: '',
    avg_buy_price: '',
    asset_type: 'Stock',
  })

  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      setUser(user || null)
      if (user) {
        await fetchHoldings(user.id)
      } else {
        setHoldings([])
        setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  async function fetchHoldings(userId) {
    const { data } = await supabase
      .from('holdings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setHoldings(data || [])
    setLoading(false)
  }

  async function addHolding() {
    if (!form.name || !form.symbol || !form.quantity || !form.avg_buy_price) {
      setError('Please fill all fields')
      return
    }
    setSaving(true)
    setError('')
    const { error } = await supabase.from('holdings').insert({
      user_id: user.id,
      name: form.name.trim(),
      symbol: form.symbol.trim().toUpperCase(),
      quantity: parseFloat(form.quantity),
      avg_buy_price: parseFloat(form.avg_buy_price),
      asset_type: form.asset_type,
    })
    if (error) {
      setError(error.message)
    } else {
      setForm({
        name: '',
        symbol: '',
        quantity: '',
        avg_buy_price: '',
        asset_type: 'Stock',
      })
      setShowForm(false)
      fetchHoldings(user.id)
    }
    setSaving(false)
  }

  async function deleteHolding(id) {
    await supabase.from('holdings').delete().eq('id', id)
    fetchHoldings(user.id)
  }

  const totalInvested = holdings.reduce(
    (sum, h) => sum + h.quantity * h.avg_buy_price,
    0
  )

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2A4A]">
            My Portfolio
          </h1>
          <p className="text-gray-500 mt-1">
            Track and analyse your investments
          </p>
        </div>
        <button
          className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          onClick={() => setShowForm(true)}
          type="button"
        >
          <Plus size={16} />
          Add Holding
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          {
            label: 'Total Invested',
            value: '₹' + totalInvested.toLocaleString('en-IN'),
            icon: Wallet,
            color: 'blue',
          },
          {
            label: 'Holdings',
            value: holdings.length + ' assets',
            icon: TrendingUp,
            color: 'green',
          },
          {
            label: 'Portfolio Health',
            value: 'Good',
            icon: Shield,
            color: 'purple',
          },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl shadow-md p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              {card.label}
            </p>
            <p className="text-2xl font-bold text-[#1B2A4A] mt-2">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[#1B2A4A]">
                Add Holding
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setError('')
                }}
                className="p-2 rounded-lg hover:bg-gray-50 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm text-gray-600 font-medium">
                  Asset Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. HDFC Bank, Nifty 50 ETF"
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 font-medium">
                  Symbol
                </label>
                <input
                  value={form.symbol}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, symbol: e.target.value }))
                  }
                  placeholder="e.g. HDFCBANK, NIFTYBEES"
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 font-medium">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, quantity: e.target.value }))
                    }
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-medium">
                    Average Buy Price ₹
                  </label>
                  <input
                    type="number"
                    value={form.avg_buy_price}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, avg_buy_price: e.target.value }))
                    }
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 font-medium">
                  Asset Type
                </label>
                <select
                  value={form.asset_type}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, asset_type: e.target.value }))
                  }
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400 bg-white"
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle size={16} className="mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold"
                  onClick={() => {
                    setShowForm(false)
                    setError('')
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 bg-[#2563EB] text-white py-3 rounded-xl font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={addHolding}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Add to Portfolio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-[#1B2A4A]">
            Your Holdings
          </h2>
        </div>

        {loading ? (
          <div className="px-6 py-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : holdings.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-gray-500">
              No holdings yet. Add your first investment.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              onClick={() => setShowForm(true)}
            >
              <Plus size={16} />
              Add Holding
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    'Asset',
                    'Symbol',
                    'Type',
                    'Qty',
                    'Avg Price',
                    'Invested',
                    'Actions',
                  ].map((h) => (
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
                {holdings.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-[#1B2A4A]">
                      {h.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                      {h.symbol}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                        {h.asset_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {h.quantity}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      ₹{Number(h.avg_buy_price).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 font-medium text-[#1B2A4A]">
                      ₹{(h.quantity * h.avg_buy_price).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => deleteHolding(h.id)}
                        className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-400 mt-6">
        AI Portfolio Analysis coming in next update — your holdings are already
        informing your AI insights
      </p>
    </div>
  )
}
