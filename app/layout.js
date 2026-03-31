'use client';

import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useState } from "react";
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
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState("");

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const onRunAnalysis = async () => {
    if (running) return;
    setRunning(true);
    try {
      setRunStatus("Collecting market data...");
      await delay(1000);

      setRunStatus("Running AI agents...");
      await fetch("/api/run-all");

      setRunStatus("Storing insights...");
      await delay(500);
    } finally {
      setRunning(false);
      setRunStatus("");
    }
  };

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
                <Link href="/assistant" className="text-white hover:text-blue-300 text-sm">
                  AI Assistant
                </Link>
              </div>

              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                onClick={onRunAnalysis}
                disabled={running}
              >
                <span className="inline-flex items-center gap-2">
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {running ? runStatus : "Run AI Analysis"}
                </span>
              </button>
            </div>
          </div>
        </nav>

        <main className="bg-[#F8FAFC] min-h-screen pt-16">{children}</main>
      </body>
    </html>
  );
}
