'use client'
import { useState } from 'react'
<<<<<<< HEAD
=======
import { useRouter } from 'next/navigation'
>>>>>>> 3e09d0247db7c68b3c5df453e44ad3c460e724bc
import supabase from '@/lib/supabase'
import { Brain, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function Login() {
<<<<<<< HEAD
=======
  const router = useRouter()

>>>>>>> 3e09d0247db7c68b3c5df453e44ad3c460e724bc
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: email.split('@')[0] } },
        })
        if (error) throw error
<<<<<<< HEAD
        window.location.href = '/onboarding'
=======
        router.push('/onboarding')
>>>>>>> 3e09d0247db7c68b3c5df453e44ad3c460e724bc
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
<<<<<<< HEAD
        window.location.href = '/'
=======
        router.push('/')
>>>>>>> 3e09d0247db7c68b3c5df453e44ad3c460e724bc
      }
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B2A4A] to-[#2563EB] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Brain size={40} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-[#1B2A4A] mt-3">
            AI Financial Brain
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-blue-400"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 pl-10 pr-10 focus:outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}

          <button
            type="submit"
            className="w-full bg-[#1B2A4A] text-white py-3 rounded-xl font-semibold hover:bg-blue-900 transition disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>

          <div className="text-center text-sm text-gray-500">
            {isSignup ? 'Already have an account? ' : 'New to AI Financial Brain? '}
            <button
              type="button"
              onClick={() => setIsSignup((v) => !v)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {isSignup ? 'Sign in' : 'Create account'}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            AI-generated insights for educational purposes only.
            <br />
            Not SEBI-registered investment advice.
          </p>
        </form>
      </div>
    </div>
  )
}

