import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function RiskAlerts({ risks, isLoading }) {
  const safeRisks = Array.isArray(risks) ? risks : [];

  const severityClass = (severity) => {
    if (severity === 'high') return 'bg-red-100 text-red-700';
    if (severity === 'medium') return 'bg-orange-100 text-orange-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="bg-[#DC2626] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <ShieldAlert className="text-white" size={18} />
          <div className="text-white font-bold text-lg ml-2">Risk Shield</div>
        </div>
        <div className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
          {safeRisks.length} alerts
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            <div className="border border-red-100 rounded-xl p-4 bg-red-50 animate-pulse">
              <div className="h-4 w-2/3 bg-red-100 rounded" />
              <div className="h-4 w-1/3 bg-red-100 rounded mt-2" />
              <div className="h-3 w-4/5 bg-red-100 rounded mt-3" />
              <div className="h-3 w-3/5 bg-red-100 rounded mt-2" />
            </div>
            <div className="border border-red-100 rounded-xl p-4 bg-red-50 animate-pulse">
              <div className="h-4 w-2/3 bg-red-100 rounded" />
              <div className="h-4 w-1/3 bg-red-100 rounded mt-2" />
              <div className="h-3 w-4/5 bg-red-100 rounded mt-3" />
              <div className="h-3 w-3/5 bg-red-100 rounded mt-2" />
            </div>
          </div>
        ) : safeRisks.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-green-600 text-sm font-medium">
              No alerts right now
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Run AI Analysis to check for risks in current market
            </p>
          </div>
        ) : (
          <div>
            {safeRisks.map((risk, idx) => {
              const createdAt = risk?.created_at ? new Date(risk.created_at) : null;
              const timeAgo = createdAt
                ? formatDistanceToNow(createdAt, { addSuffix: true })
                : '';

              return (
                <div
                  key={risk.id ?? `${risk.type ?? 'risk'}-${idx}`}
                  className="border border-red-100 rounded-xl p-4 mb-3 bg-red-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="text-red-600 mt-0.5" size={14} />
                      <div className="font-bold text-[#1B2A4A]">
                        {risk.risk_area || risk.title}
                      </div>
                    </div>
                    <div
                      className={`text-xs px-2 py-1 rounded-full font-medium uppercase ${
                        severityClass(risk.severity)
                      }`}
                    >
                      {risk.severity}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mt-2">{risk.reason}</div>

                  <div className="mt-3 text-sm">
                    <span className="font-bold text-[#1B2A4A]">Protect: </span>
                    <span className="text-sm text-red-700 font-medium">
                      {risk.suggested_action}
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

