'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Newspaper } from 'lucide-react'

export default function MarketBrief() {
const [insights, setInsights] = useState([])
const [isLoading, setIsLoading] = useState(true)

useEffect(() => {
fetch('/api/insights')
.then(r => r.json())
.then(data => {
if (data.success) {
setInsights(data.data.filter(i =>
i.type === 'market' || i.type === 'sector' || i.type === 'news'
))
}
setIsLoading(false)
})
.catch(() => setIsLoading(false))
}, [])

return (
<div className="max-w-4xl mx-auto px-6 py-8">
<div className="mb-8">
<h1 className="text-3xl font-bold text-[#1B2A4A]">
AI Market Brief
</h1>
<p className="text-gray-500 mt-2">
Daily AI-generated market intelligence
</p>
</div>

{isLoading ? (
<div className="space-y-4">
{[1,2,3].map(i => (
<div key={i}
className="bg-white rounded-xl p-6 shadow-md animate-pulse h-32"
/>
))}
</div>
) : insights.length === 0 ? (
<div className="bg-white rounded-xl p-12 shadow-md text-center">
<Newspaper className="mx-auto text-gray-300 mb-4" size={48} />
<p className="text-gray-400">
No market briefs yet. Click Run AI Analysis on the dashboard.
</p>
</div>
) : (
<div className="space-y-4">
{insights.map(insight => (
<div key={insight.id}
className="bg-white rounded-xl p-6 shadow-md border-l-4 border-blue-500"
>
<div className="flex justify-between items-start mb-3">
<span className="text-xs uppercase tracking-wide
text-gray-400 font-medium">
{insight.type}
</span>
<span className={`text-xs px-2 py-1 rounded-full font-medium
${insight.confidence === 'high'
? 'bg-green-100 text-green-800'
: insight.confidence === 'medium'
? 'bg-yellow-100 text-yellow-800'
: 'bg-gray-100 text-gray-600'}`}>
{insight.confidence}
</span>
</div>
<h3 className="text-lg font-semibold text-[#1B2A4A] mb-2">
{insight.title}
</h3>
<p className="text-gray-600 text-sm mb-4">{insight.reason}</p>
<div className="border-t border-gray-100 pt-4">
<p className="text-xs text-gray-400 uppercase
tracking-wide mb-1">
Suggested Action
</p>
<p className="text-sm font-medium text-[#1B2A4A]">
{insight.suggested_action}
</p>
</div>
</div>
))}
</div>
)}
</div>
)
}

