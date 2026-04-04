import React from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function AIInsightHero({ insight, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-[#1B2A4A] to-[#2563EB] rounded-2xl p-8 text-white shadow-xl">
        <div className="animate-pulse h-48 bg-white/10 rounded-xl" />
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="bg-gradient-to-br from-[#1B2A4A] to-[#2563EB] rounded-2xl p-8 text-white">
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </div>
          <span className="text-blue-200 text-sm font-medium">
            AI analyst is ready
          </span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">
          Your AI financial brief is one click away.
        </h2>

        <p className="text-blue-100 text-sm leading-relaxed mb-6">
          Our AI analyses live NSE and BSE data, scans financial news, and detects
          opportunities and risks — then explains what it means for your money in plain
          English.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: '📊', text: 'Live market analysis' },
            { icon: '🎯', text: 'Opportunity detection' },
            { icon: '🛡️', text: 'Risk alerts' },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">{item.icon}</div>
              <p className="text-blue-100 text-xs font-medium">{item.text}</p>
            </div>
          ))}
        </div>

        <p className="text-blue-300 text-xs text-center">
          {'Click "Run AI Analysis" above to get your first brief'}
        </p>
      </div>
    );
  }

  const confidence = insight?.confidence || 'low';
  const confidenceClass =
    confidence === 'high'
      ? 'bg-green-400 text-white'
      : confidence === 'medium'
        ? 'bg-yellow-400 text-white'
        : 'bg-gray-400 text-white';

  const createdAt = insight?.created_at ? new Date(insight.created_at) : null;
  const timeAgo = createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : '';

  return (
    <div className="bg-gradient-to-br from-[#1B2A4A] to-[#2563EB] rounded-2xl p-8 text-white shadow-xl">
      <div className="flex items-start justify-between gap-6">
        <div className="text-blue-200 text-xs uppercase tracking-widest font-medium">
          TODAY&apos;S AI INSIGHT
        </div>
        <div
          className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${confidenceClass}`}
        >
          {confidence}
        </div>
      </div>

      <div className="text-2xl font-bold text-white mt-4">{insight.title}</div>
      <div className="text-blue-100 text-sm mt-3 leading-relaxed">{insight.reason}</div>

      <div className="border-t border-white/20 mt-6 pt-6" />

      <div className="flex items-start justify-between gap-6 mt-6">
        <div>
          <div className="text-blue-200 text-xs uppercase tracking-wide">
            SUGGESTED ACTION
          </div>
          <div className="text-white font-semibold text-base mt-1">
            {insight.suggested_action}
          </div>
        </div>

        <div className="text-blue-300 text-xs whitespace-nowrap">{timeAgo}</div>
      </div>
    </div>
  );
}

