import React from 'react';
import { TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function OpportunityRadar({ opportunities, isLoading }) {
  const safeOpps = Array.isArray(opportunities) ? opportunities : [];

  const confidenceClass = (confidence) => {
    if (confidence === 'high') return 'bg-green-500 text-white';
    if (confidence === 'medium') return 'bg-yellow-400 text-white';
    return 'bg-gray-200 text-gray-700';
  };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="bg-[#16A34A] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <TrendingUp className="text-white" size={18} />
          <div className="text-white font-bold text-lg ml-2">Opportunity Radar</div>
        </div>
        <div className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
          {safeOpps.length} signals
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            <div className="border border-green-100 rounded-xl p-4 bg-green-50 animate-pulse">
              <div className="h-4 w-2/3 bg-green-100 rounded" />
              <div className="h-4 w-5/6 bg-green-100 rounded mt-2" />
              <div className="h-3 w-3/4 bg-green-100 rounded mt-3" />
              <div className="h-3 w-2/4 bg-green-100 rounded mt-2" />
            </div>
            <div className="border border-green-100 rounded-xl p-4 bg-green-50 animate-pulse">
              <div className="h-4 w-2/3 bg-green-100 rounded" />
              <div className="h-4 w-5/6 bg-green-100 rounded mt-2" />
              <div className="h-3 w-3/4 bg-green-100 rounded mt-3" />
              <div className="h-3 w-2/4 bg-green-100 rounded mt-2" />
            </div>
          </div>
        ) : safeOpps.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-500 text-sm font-medium">
              Scanning for opportunities...
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Click Run AI Analysis to detect high-confidence opportunities in
              today&apos;s market
            </p>
          </div>
        ) : (
          <div>
            {safeOpps.map((opp, idx) => {
              const createdAt = opp?.created_at ? new Date(opp.created_at) : null;
              const timeAgo = createdAt
                ? formatDistanceToNow(createdAt, { addSuffix: true })
                : '';

              return (
                <div
                  key={opp.id ?? `${opp.type ?? 'opportunity'}-${idx}`}
                  className="border border-green-100 rounded-xl p-4 mb-3 bg-green-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-bold text-[#1B2A4A]">{opp.asset || opp.title}</div>
                    <div
                      className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${
                        confidenceClass(opp.confidence)
                      }`}
                    >
                      {opp.confidence}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mt-2">{opp.reason}</div>

                  <div className="mt-3 text-sm">
                    <span className="font-bold text-[#1B2A4A]">Action: </span>
                    <span className="text-sm text-green-700 font-medium">
                      {opp.suggested_action}
                    </span>
                  </div>

                  <div className="text-xs text-gray-400 mt-2">{timeAgo}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

