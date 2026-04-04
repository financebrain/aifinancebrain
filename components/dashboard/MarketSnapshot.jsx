'use client'
import { useState, useEffect } from 'react'

export default function MarketSnapshot() {
  const [indicators, setIndicators] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/market-data')
        const data = await res.json()
        if (data.success && data.indicators) {
          setIndicators(data.indicators)
          setLastFetch(
            new Date().toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
            })
          )
        }
      } catch (e) {
        console.log('Market snapshot error:', e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

<<<<<<< HEAD
  const header = (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </div>
        <span className="text-sm font-semibold text-[#1B2A4A]">
          Live Markets
        </span>
      </div>
      {lastFetch && (
        <span className="text-xs text-gray-400">
          Updated {lastFetch} IST
        </span>
      )}
    </div>
  )

  if (loading) {
    return (
      <div>
        {header}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="min-w-[130px] bg-white rounded-xl p-4 shadow-sm animate-pulse h-20"
            />
          ))}
        </div>
=======
  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[1,2,3,4,5].map(i => (
          <div key={i}
            className="min-w-[130px] bg-white rounded-xl p-4 
              shadow-sm animate-pulse h-20"
          />
        ))}
>>>>>>> 3e09d0247db7c68b3c5df453e44ad3c460e724bc
      </div>
    )
  }

  return (
    <div>
<<<<<<< HEAD
      {header}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {indicators.map((ind, i) => (
          <div
            key={i}
            className={`min-w-[130px] bg-white rounded-xl shadow-sm px-5 py-4 flex-shrink-0 border-l-4 ${
              ind.positive ? 'border-green-400' : 'border-red-400'
            }`}
=======
      <div className="flex gap-3 overflow-x-auto pb-2">
        {indicators.map((ind, i) => (
          <div key={i}
            className="min-w-[130px] bg-white rounded-xl 
              shadow-sm px-5 py-4 flex-shrink-0"
>>>>>>> 3e09d0247db7c68b3c5df453e44ad3c460e724bc
          >
            <p className="text-xs text-gray-500 uppercase 
              tracking-wide font-medium">
              {ind.name}
            </p>
            <p className="text-lg font-bold text-[#1B2A4A] mt-1">
              {ind.value}
            </p>
            <p className={`text-sm font-medium mt-1 ${
              ind.positive ? 'text-green-600' : 'text-red-500'
            }`}>
              {ind.positive ? '▲' : '▼'} {ind.change}
            </p>
          </div>
        ))}
      </div>
<<<<<<< HEAD
=======
      {lastFetch && (
        <p className="text-xs text-gray-400 mt-2 ml-1">
          Last updated {lastFetch} IST
        </p>
      )}
>>>>>>> 3e09d0247db7c68b3c5df453e44ad3c460e724bc
    </div>
  )
}

