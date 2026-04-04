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
        <nav className="fixed top-0 left-0 right-0 z-50 
          bg-[#1B2A4A] shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              
              {/* Logo */}
              <span className="text-white font-bold text-lg 
                whitespace-nowrap">
                AI Financial Brain
              </span>
              
              {/* Desktop nav */}
              <div className="hidden md:flex items-center gap-6">
                <Link href="/" className="text-blue-200 
                  hover:text-white text-sm transition-colors">
                  Dashboard
                </Link>
                <Link href="/market-brief" className="text-blue-200 
                  hover:text-white text-sm transition-colors">
                  Market Brief
                </Link>
                <Link href="/portfolio" className="text-blue-200 
                  hover:text-white text-sm transition-colors">
                  Portfolio
                </Link>
                <Link href="/assistant" className="text-blue-200 
                  hover:text-white text-sm transition-colors">
                  AI Assistant
                </Link>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-2">
                <button
                  onClick={runAnalysis}
                  disabled={isRunning}
                  className={`px-3 py-1.5 rounded-lg text-xs 
                    font-semibold transition-all whitespace-nowrap
                    ${isRunning
                      ? 'bg-blue-400 cursor-not-allowed text-white'
                      : 'bg-[#2563EB] hover:bg-blue-700 text-white'
                    }`}
                >
                  {isRunning 
                    ? (runStatus || 'Running...') 
                    : 'Run AI Analysis'}
                </button>
                
                {/* Mobile menu - simple links */}
                <div className="flex md:hidden items-center gap-3 
                  ml-1">
                  <Link href="/" className="text-blue-200 text-xs">
                    Home
                  </Link>
                  <Link href="/assistant" className="text-blue-200 
                    text-xs">
                    Chat
                  </Link>
                </div>
              </div>
              
            </div>
          </div>
        </nav>

        <main className="bg-[#F8FAFC] min-h-screen pt-14">{children}</main>
      </body>
    </html>
  );
}
