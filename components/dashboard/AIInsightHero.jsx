import React from 'react';
import { Sparkles } from 'lucide-react';
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
      <div className="bg-white rounded-2xl p-10 shadow-md border border-blue-50 text-center">
        <Sparkles className="mx-auto text-[#1B2A4A] h-10 w-10" />
        <div className="mt-4 text-[#1B2A4A] font-semibold">
          Run AI Analysis to get your first insight
        </div>
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

