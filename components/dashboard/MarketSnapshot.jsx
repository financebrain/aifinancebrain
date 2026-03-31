import React from 'react';

const INDICATORS = [
  { name: 'Nifty 50', value: '24,850', change: '+0.8%', positive: true },
  { name: 'Bank Nifty', value: '53,200', change: '+1.2%', positive: true },
  { name: 'IT Index', value: '38,100', change: '-0.5%', positive: false },
  { name: 'Gold', value: '₹71,500', change: '+0.3%', positive: true },
  { name: 'USD/INR', value: '83.45', change: '+0.1%', positive: false },
];

export default function MarketSnapshot() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {INDICATORS.map((item) => {
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
      })}
    </div>
  );
}

