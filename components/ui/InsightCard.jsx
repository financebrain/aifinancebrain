import React from 'react';

const CONFIDENCE_CLASSES = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
};

const TYPE_BORDER_CLASSES = {
  market: 'border-blue-500',
  opportunity: 'border-green-500',
  risk: 'border-red-500',
  news: 'border-purple-500',
  sector: 'border-amber-500',
};

export default function InsightCard({
  type,
  title,
  reason,
  confidence,
  suggested_action,
  isLoading,
}) {
  const typeBorderClass = TYPE_BORDER_CLASSES[type] || 'border-gray-200';
  const confidenceClass = CONFIDENCE_CLASSES[confidence] || CONFIDENCE_CLASSES.low;

  return (
    <div className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${typeBorderClass}`}>
      {isLoading ? (
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-5 w-16 bg-gray-200 rounded-full" />
          </div>
          <div className="h-5 w-2/3 bg-gray-200 rounded mt-4" />
          <div className="h-4 w-full bg-gray-200 rounded mt-3" />
          <div className="h-4 w-5/6 bg-gray-200 rounded mt-2" />
          <div className="border-t border-gray-100 mt-4 pt-4">
            <div className="h-3 w-28 bg-gray-200 rounded" />
            <div className="h-4 w-4/5 bg-gray-200 rounded mt-3" />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase text-gray-500">{type}</div>
            <div className={`text-xs font-medium px-2 py-1 rounded-full ${confidenceClass}`}>
              {confidence}
            </div>
          </div>

          <div className="text-lg font-semibold text-[#1B2A4A] mt-2">{title}</div>
          <div className="text-sm text-gray-600 mt-2">{reason}</div>

          <div className="border-t border-gray-100 mt-4 pt-4">
            <div className="text-xs uppercase text-gray-400 font-medium">Suggested Action</div>
            <div className="text-sm text-[#1B2A4A] font-medium mt-1">{suggested_action}</div>
          </div>
        </>
      )}
    </div>
  );
}

