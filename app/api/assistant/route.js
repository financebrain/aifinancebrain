import { callGemini } from '@/lib/gemini'
import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(request) {
  try {
    const { message } = await request.json()

    if (!message || message.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    // Fetch recent insights to give the AI context
    const { data: recentInsights } = await supabase
      .from('insights')
      .select('type, title, reason, confidence, suggested_action')
      .order('created_at', { ascending: false })
      .limit(5)

    const insightContext = recentInsights?.length
      ? 'Recent AI analysis of Indian markets:\n' +
        recentInsights.map(i =>
          `${i.type.toUpperCase()}: ${i.title} — ${i.reason}`
        ).join('\n')
      : 'No recent market analysis available yet.'

    const prompt = `You are an AI financial assistant for Indian retail investors.
You have access to the latest AI-generated market intelligence below.
Answer the user's question clearly, specifically, and in plain English.
Focus on Indian markets — NSE, BSE, Nifty, mutual funds, ETFs.
Always be helpful, never alarmist.
End every response with: "Note: This is AI-generated information for awareness only, not SEBI-registered investment advice."

${insightContext}

User question: ${message}

Give a direct, helpful answer in 3-5 sentences maximum.`

    const reply = await callGemini(prompt)

    return NextResponse.json({ success: true, reply })
  } catch (error) {
    console.error('Assistant error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
