import React from 'react';
import { ChevronUp } from 'lucide-react';

export default function PortfolioCard() {
  return (
    <div className="bg-gradient-to-r from-[#1B2A4A] to-[#2563EB] rounded-xl p-8 text-white">
      <div className="text-blue-200 text-sm uppercase tracking-wide">Portfolio Overview</div>
      <div className="text-4xl font-bold mt-2">₹2,05,000</div>

      <div className="flex items-center gap-3 mt-4">
        <div className="flex items-center gap-1 text-green-300 text-sm font-medium">
          <ChevronUp className="h-4 w-4" />
          <span>+₹2,870 today</span>
        </div>
        <div className="text-xs px-2 py-1 rounded-full bg-white/10 text-white font-medium">+1.4%</div>
      </div>

      <div className="border-t border-white/20 mt-6 pt-6" />

      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-white/10 text-white text-xs px-3 py-1 rounded-full">Index Funds 40%</div>
        <div className="bg-white/10 text-white text-xs px-3 py-1 rounded-full">Banking 30%</div>
        <div className="bg-white/10 text-white text-xs px-3 py-1 rounded-full">Technology 30%</div>
      </div>
    </div>
  );
}

