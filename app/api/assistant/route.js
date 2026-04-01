// v2 - updated for Groq provider

import { NextResponse } from 'next/server'
import { callGemini } from '@/lib/gemini'
import supabase from '@/lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const message = body?.message?.trim()

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is empty' },
        { status: 400 }
      )
    }

    // Get recent insights for context
    const { data: insights } = await supabase
      .from('insights')
      .select('type, title, reason, suggested_action, confidence')
      .order('created_at', { ascending: false })
      .limit(6)

    const context = insights?.length
      ? 'Latest AI market intelligence:\n' +
        insights.map(i =>
          `[${i.type.toUpperCase()}] ${i.title}: ${i.reason}`
        ).join('\n')
      : 'No recent market analysis available.'

    const prompt = `You are a friendly, knowledgeable AI financial assistant 
for Indian retail investors. You work for AI Financial Brain.

Your job is to help users understand markets and make better 
financial decisions. Always be clear, specific, and encouraging.
Never be alarmist. Always mention this is educational information,
not SEBI-registered investment advice.

Current market intelligence from our AI agents:
${context}

User question: ${message}

Reply in 2-4 sentences. Be specific and helpful.
End with: "Note: AI-generated insights for awareness only, 
not SEBI-registered investment advice."`

    const reply = await callGemini(prompt)

    return NextResponse.json({ success: true, reply })
  } catch (error) {
    console.error('Assistant error:', error.message)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
