'use client';

import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase'
import { LogOut, User } from 'lucide-react'
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const router = useRouter()

  const [runStatus, setRunStatus] = useState('')
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        supabase.from('profiles')
          .select('full_name, risk_tolerance')
          .eq('id', user.id).single()
          .then(({ data }) => setUserProfile(data))
      }
    })
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_, session) => {
        setUser(session?.user || null)
      })
    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function runAnalysis() {
    if (isRunning) return
    setIsRunning(true)
    const steps = [
      'Collecting market data...',
      'Running Market Agent...',
      'Running News Agent...',
      'Running Opportunity Radar...',
      'Running Risk Shield...',
      'Generating insights...',
    ]
    let i = 0
    setRunStatus(steps[0])
    const interval = setInterval(() => {
      i++
      if (i < steps.length) setRunStatus(steps[i])
    }, 2500)
    try {
      await fetch('/api/run-all')
    } catch(e) { console.log('Run error:', e) }
    clearInterval(interval)
    setRunStatus('Done!')
    setTimeout(() => {
      setRunStatus('')
      setIsRunning(false)
      window.location.reload()
    }, 1000)
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#1B2A4A]">
          <div className="h-full max-w-6xl mx-auto px-4 flex items-center justify-between">
            <div className="text-white font-bold text-xl">AI Financial Brain</div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-white hover:text-blue-300 text-sm">
                  Dashboard
                </Link>
                <Link href="/market-brief" className="text-white hover:text-blue-300 text-sm">
                  Market Brief
                </Link>
                <Link href="/portfolio" className="text-white hover:text-blue-300 text-sm">
                  Portfolio
                </Link>
                <Link href="/assistant" className="text-white hover:text-blue-300 text-sm">
                  AI Assistant
                </Link>
              </div>

              <button
                onClick={runAnalysis}
                disabled={isRunning}
                className={`px-4 py-2 rounded-lg text-sm font-semibold
                  transition-all ${isRunning
                    ? 'bg-blue-400 cursor-not-allowed text-white'
                    : 'bg-[#2563EB] hover:bg-blue-700 text-white'
                  }`}
              >
                {isRunning ? runStatus || 'Running...' : 'Run AI Analysis'}
              </button>

              {user && (
                <div className='flex items-center gap-3 ml-2'>
                  <User size={16} className="text-blue-200 hidden md:block" />
                  <div className='text-right hidden md:block'>
                    <p className='text-white text-xs font-medium'>
                      {userProfile?.full_name || user.email?.split('@')[0]}
                    </p>
                    <p className='text-blue-300 text-xs capitalize'>
                      {userProfile?.risk_tolerance || 'moderate'} investor
                    </p>
                  </div>
                  <button onClick={handleLogout}
                    className='text-blue-200 hover:text-white p-2
                      rounded-lg hover:bg-white/10 transition-colors'>
                    <LogOut size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        <main className="bg-[#F8FAFC] min-h-screen pt-16">{children}</main>
      </body>
    </html>
  );
}
