'use client'
import { useState } from 'react'
import supabase from '@/lib/supabase'

const QUESTIONS = [
  {
    id: 'risk_tolerance',
    question: 'How do you feel about investment risk?',
    subtitle: 'This helps our AI give you the right insights',
    options: [
      {
        value: 'conservative',
        label: 'Play it safe',
        desc: 'I prefer stable returns over high growth',
        emoji: '🛡️',
      },
      {
        value: 'moderate',
        label: 'Balanced approach',
        desc: 'Some risk is okay for better returns',
        emoji: '⚖️',
      },
      {
        value: 'aggressive',
        label: 'Go for growth',
        desc: 'I can handle volatility for higher gains',
        emoji: '🚀',
      },
    ],
  },
  {
    id: 'investment_goal',
    question: 'What is your main financial goal?',
    subtitle: 'Our AI will focus insights on what matters to you',
    options: [
      {
        value: 'long-term-growth',
        label: 'Build long-term wealth',
        desc: 'Growing money over 5-10 years',
        emoji: '🌱',
      },
      {
        value: 'regular-income',
        label: 'Generate regular income',
        desc: 'Dividends and stable returns',
        emoji: '💰',
      },
      {
        value: 'wealth-preservation',
        label: 'Protect what I have',
        desc: 'Safety first, inflation protection',
        emoji: '🔒',
      },
      {
        value: 'learning',
        label: 'Learn and explore',
        desc: 'Understanding markets and investing',
        emoji: '📚',
      },
    ],
  },
  {
    id: 'experience_level',
    question: 'How experienced are you with investing?',
    subtitle: 'We will adjust how we explain things to you',
    options: [
      {
        value: 'beginner',
        label: 'Complete beginner',
        desc: 'New to stocks and investing',
        emoji: '🌟',
      },
      {
        value: 'some',
        label: 'Some experience',
        desc: 'I know basics — SIPs, mutual funds',
        emoji: '📈',
      },
      {
        value: 'experienced',
        label: 'Experienced investor',
        desc: 'Comfortable with stocks and analysis',
        emoji: '🎯',
      },
    ],
  },
]

export default function Onboarding() {
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function selectOption(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    if (step < QUESTIONS.length - 1) {
      setTimeout(() => setStep((s) => s + 1), 400)
    }
  }

  async function finish() {
    setSaving(true)
    setError('')
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user?.id) throw new Error('Not logged in. Please sign in again.')

      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: user.id,
        risk_tolerance: answers.risk_tolerance,
        investment_goal: answers.investment_goal,
        experience_level: answers.experience_level,
        onboarding_complete: true,
      })
      if (upsertError) throw upsertError

      window.location.href = '/'
    } catch (e) {
      console.log('Onboarding finish error:', e.message)
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const q = QUESTIONS[step]
  const progress = (step / QUESTIONS.length) * 100

  const allAnswered =
    Boolean(answers.risk_tolerance) &&
    Boolean(answers.investment_goal) &&
    Boolean(answers.experience_level)

  const isLastStep = step === QUESTIONS.length - 1

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg">
        <div className="text-sm text-gray-400">
          Step {step + 1} of {QUESTIONS.length}
        </div>

        <div className="w-full h-2 bg-gray-100 rounded-full mt-3">
          <div
            className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <h1 className="text-2xl font-bold text-[#1B2A4A] mt-6">
          {q.question}
        </h1>
        <p className="text-gray-500 text-sm mt-2">
          {q.subtitle}
        </p>

        <div className="space-y-3 mt-6">
          {q.options.map((option) => {
            const selected = answers[q.id] === option.value
            return (
              <div
                key={option.value}
                role="button"
                tabIndex={0}
                onClick={() => selectOption(q.id, option.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    selectOption(q.id, option.value)
                  }
                }}
                className={[
                  'cursor-pointer border-2 rounded-xl p-4 flex items-center gap-4 transition-all',
                  selected
                    ? 'border-[#2563EB] bg-blue-50'
                    : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50',
                ].join(' ')}
              >
                <div className="text-3xl">{option.emoji}</div>
                <div>
                  <div className="font-semibold text-[#1B2A4A]">
                    {option.label}
                  </div>
                  <div className="text-sm text-gray-500">
                    {option.desc}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {isLastStep && allAnswered ? (
          <>
          <button
            type="button"
            className="bg-[#1B2A4A] text-white w-full py-3 rounded-xl font-semibold mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={finish}
            disabled={saving}
          >
            {saving ? 'Setting up your AI...' : 'Start My AI Financial Brain'}
          </button>
          {error ? (
            <p className="text-sm text-red-600 mt-3">{error}</p>
          ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}

