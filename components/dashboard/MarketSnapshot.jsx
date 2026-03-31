import React, { useEffect, useState } from 'react';

export default function MarketSnapshot() {
  const [indicators, setIndicators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMarketData() {
      try {
        const res = await fetch('/api/market-data');
        const data = await res.json();
        if (data.success) setIndicators(data.indicators);
      } catch (e) {
        console.log('Market data fetch failed:', e);
      } finally {
        setIsLoading(false);
      }
    }

    loadMarketData();
    const interval = setInterval(loadMarketData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {isLoading ? (
        <>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm px-5 py-4 min-w-[130px] animate-pulse"
            >
              <div className="h-3 w-16 bg-gray-200 rounded" />
              <div className="h-5 w-20 bg-gray-200 rounded mt-3" />
              <div className="h-4 w-14 bg-gray-200 rounded mt-2" />
            </div>
          ))}
        </>
      ) : (
        indicators.map((item) => {
          const changeClass = item.positive ? 'text-green-600' : 'text-red-600';
          const arrow = item.positive ? '▲' : '▼';

          return (
            <div
              key={item.name}
              className="bg-white rounded-xl shadow-sm px-5 py-4 min-w-[130px]"
            >
              <div className="text-xs text-gray-500 uppercase tracking-wide">{item.name}</div>
              <div className="text-lg font-bold text-[#1B2A4A] mt-1">{item.value}</div>
              <div className={`text-sm font-medium mt-1 ${changeClass}`}>
                {arrow} {item.change}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

