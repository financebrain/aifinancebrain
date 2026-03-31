import React from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import InsightCard from '../ui/InsightCard.jsx';

export default function InsightFeed({ insights, isLoading, error }) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-[#1B2A4A]">Could not load insights</div>
            <div className="text-sm text-red-700 mt-1">Check your API keys and try again.</div>
            <div className="text-xs text-gray-500 mt-2">{error?.message}</div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <InsightCard isLoading={true} />
        <InsightCard isLoading={true} />
        <InsightCard isLoading={true} />
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-14 text-gray-400">
        <Sparkles className="h-12 w-12 text-gray-300" />
        <div className="mt-3">No insights yet. Click Run AI Analysis to get started.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, idx) => {
        const createdAt = insight?.created_at ? new Date(insight.created_at) : null;
        const timeAgo = createdAt
          ? formatDistanceToNow(createdAt, { addSuffix: true })
          : null;

        return (
          <div
            key={insight.id ?? `${insight.type ?? 'insight'}-${idx}`}
            className="relative"
          >
            {timeAgo ? (
              <div className="absolute top-4 right-4 text-xs text-gray-400">{timeAgo}</div>
            ) : null}

            <InsightCard
              type={insight.type}
              title={insight.title}
              reason={insight.reason}
              confidence={insight.confidence}
              suggested_action={insight.suggested_action}
              isLoading={false}
            />
          </div>
        );
      })}
    </div>
  );
}

