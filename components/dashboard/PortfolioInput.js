'use client'

import { useState, useEffect } from 'react'
import supabase from '@/lib/supabase'

export default function PortfolioInput() {
  const [holdings, setHoldings] = useState([])
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [quantity, setQuantity] = useState('')
  const [userId, setUserId] = useState(null)
  
  useEffect(() => {
    async function loadUserAndHoldings() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        setUserId(session.user.id)
        fetchHoldings(session.user.id)
      }
    }
    loadUserAndHoldings()
  }, [])

  async function fetchHoldings(uid) {
    const { data } = await supabase
      .from('holdings')
      .select('*')
      .eq('user_id', uid)
    if (data) {
      setHoldings(data)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!userId || !symbol || !quantity) return

    const newHolding = {
      user_id: userId,
      name: name || symbol,
      symbol: symbol.toUpperCase(),
      quantity: Number(quantity)
    }

    const { error } = await supabase.from('holdings').insert(newHolding)
    if (!error) {
      setName('')
      setSymbol('')
      setQuantity('')
      fetchHoldings(userId)
    } else {
      console.error(error)
    }
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('holdings').delete().eq('id', id)
    if (!error) {
      fetchHoldings(userId)
    }
  }

  if (!userId) return null

  return (
    <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 mt-6">
      <h2 className="text-xl font-bold text-[#1B2A4A] mb-4">Your Portfolio</h2>
      
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 mb-8">
        <input 
          type="text" 
          placeholder="Stock Name (e.g. Infosys)" 
          value={name} 
          onChange={e => setName(e.target.value)}
          className="flex-1 border p-2 rounded"
        />
        <input 
          type="text" 
          placeholder="Symbol (e.g. INFY)" 
          value={symbol} 
          onChange={e => setSymbol(e.target.value)}
          required
          className="w-32 border p-2 rounded uppercase"
        />
        <input 
          type="number" 
          placeholder="Quantity" 
          value={quantity} 
          onChange={e => setQuantity(e.target.value)}
          required
          className="w-32 border p-2 rounded"
        />
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition">
          Add Holding
        </button>
      </form>

      {holdings.length > 0 ? (
        <div className="space-y-2">
          {holdings.map(h => (
            <div key={h.id} className="flex justify-between items-center bg-gray-50 p-4 border rounded">
              <div>
                <span className="font-bold text-[#1B2A4A] mr-2">{h.symbol}</span>
                <span className="text-gray-500">— {h.quantity} shares</span>
                {h.name && h.name !== h.symbol && <span className="text-sm text-gray-400 ml-2">({h.name})</span>}
              </div>
              <button onClick={() => handleDelete(h.id)} className="text-red-500 hover:text-red-700 text-sm font-semibold">
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">No holdings added yet. Start by adding a stock above.</p>
      )}
    </div>
  )
}
