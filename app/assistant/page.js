'use client'

import { useState } from 'react'
import { Send, Bot, User } from 'lucide-react'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

export default function Assistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Good ${getGreeting()}. I am your personal AI financial analyst.

I have access to live NSE and BSE market data and your portfolio information. Here are some things you can ask me:

- "What is happening in the market today?"
- "Should I be worried about IT stocks?"
- "Where should I invest ₹5,000 this week?"
- "Explain what Bank Nifty means for my money"

What would you like to know?`,
    },
  ])
const [input, setInput] = useState('')
const [isLoading, setIsLoading] = useState(false)

const sendMessage = async () => {
if (!input.trim() || isLoading) return

const userMessage = { role: 'user', content: input }
setMessages(prev => [...prev, userMessage])
setInput('')
setIsLoading(true)

try {
const response = await fetch('/api/assistant', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ message: input })
})
const data = await response.json()
setMessages(prev => [...prev, {
role: 'assistant',
content: data.reply || 'Sorry, I could not process that.'
}])
} catch (error) {
setMessages(prev => [...prev, {
role: 'assistant',
content: 'Error connecting to AI. Please try again.'
}])
}
setIsLoading(false)
}

return (
<div className="max-w-3xl mx-auto px-6 py-8">
<div className="mb-6">
<h1 className="text-3xl font-bold text-[#1B2A4A]">
AI Financial Assistant
</h1>
<p className="text-gray-500 mt-2">
Ask anything about markets, investing, or your portfolio
</p>
</div>

<div className="bg-white rounded-xl shadow-md flex flex-col h-[600px]">
<div className="flex-1 overflow-y-auto p-6 space-y-4">
{messages.map((msg, i) => (
<div key={i}
className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
>
{msg.role === 'assistant' && (
<div className="w-8 h-8 bg-blue-600 rounded-full flex
items-center justify-center flex-shrink-0">
<Bot size={16} className="text-white" />
</div>
)}
<div className={`max-w-[80%] px-4 py-3 rounded-xl text-sm
${msg.role === 'user'
? 'bg-[#1B2A4A] text-white rounded-br-none'
: 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
{msg.content}
</div>
{msg.role === 'user' && (
<div className="w-8 h-8 bg-gray-300 rounded-full flex
items-center justify-center flex-shrink-0">
<User size={16} className="text-gray-600" />
</div>
)}
</div>
))}
{isLoading && (
<div className="flex gap-3">
<div className="w-8 h-8 bg-blue-600 rounded-full flex
items-center justify-center">
<Bot size={16} className="text-white" />
</div>
<div className="bg-gray-100 px-4 py-3 rounded-xl rounded-bl-none">
<div className="flex gap-1">
<span className="w-2 h-2 bg-gray-400 rounded-full
animate-bounce" style={{animationDelay:'0ms'}} />
<span className="w-2 h-2 bg-gray-400 rounded-full
animate-bounce" style={{animationDelay:'150ms'}} />
<span className="w-2 h-2 bg-gray-400 rounded-full
animate-bounce" style={{animationDelay:'300ms'}} />
</div>
</div>
</div>
)}
</div>

<div className="border-t border-gray-100 p-4 flex gap-3">
<input
type="text"
value={input}
onChange={e => setInput(e.target.value)}
onKeyDown={e => e.key === 'Enter' && sendMessage()}
placeholder="Ask anything — market trends, where to invest, what risks to watch..."
className="flex-1 border border-gray-200 rounded-lg px-4 py-2
text-sm focus:outline-none focus:border-blue-400"
/>
<button
onClick={sendMessage}
disabled={isLoading || !input.trim()}
className="bg-[#1B2A4A] text-white px-4 py-2 rounded-lg
hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
<Send size={16} />
</button>
</div>
</div>
</div>
)
}

