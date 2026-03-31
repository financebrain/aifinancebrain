import React, { useMemo, useState } from 'react';
import { ChevronDown, Newspaper } from 'lucide-react';

export default function MarketBriefSection({ insights, isLoading }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const safeInsights = Array.isArray(insights) ? insights : [];

  const mostRecent = useMemo(() => safeInsights[0] || null, [safeInsights]);

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <button
        type="button"
        className="w-full text-left bg-[#F8FAFC] border-b border-gray-100 px-6 py-4 flex justify-between items-center"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Newspaper className="text-[#1D4ED8]" />
          <div className="text-[#1B2A4A] font-bold">Daily AI Market Brief</div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500 transition-transform duration-200">
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
          />
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </div>
      </button>

      {!isExpanded ? (
        <div className="px-6 py-4">
          {isLoading ? (
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
          ) : mostRecent ? (
            <div className="text-sm text-gray-600 truncate">
              {mostRecent.summary || mostRecent.reason || mostRecent.title}
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              Run analysis to see market brief
            </div>
          )}
        </div>
      ) : (
        <div className="px-6 pb-6">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-20 bg-gray-100 animate-pulse rounded-xl" />
              <div className="h-20 bg-gray-100 animate-pulse rounded-xl" />
            </div>
          ) : safeInsights.length === 0 ? (
            <div className="text-sm text-gray-600">No details yet.</div>
          ) : (
            safeInsights.map((ins, idx) => (
              <div
                key={ins.id ?? `${ins.type ?? 'insight'}-${idx}`}
                className="mb-4 border-b border-gray-100 pb-4"
              >
                <div className="uppercase text-xs text-gray-400 font-medium">
                  {ins.type}
                </div>
                <div className="text-base font-semibold text-[#1B2A4A] mt-1">
                  {ins.title}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {ins.reason}
                </div>
                <div className="text-sm text-blue-600 font-medium mt-2">
                  {ins.suggested_action}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

