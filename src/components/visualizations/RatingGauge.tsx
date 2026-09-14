import React from 'react';
import type { Response as ResponseType } from '@/lib/types';

interface Props {
  responses: ResponseType[];
}

export function RatingGauge({ responses }: Props) {
  const ratings = responses
    .map((r) => parseInt(r.answer, 10))
    .filter((n) => !isNaN(n) && n >= 1 && n <= 5);

  const total = ratings.length;
  const numericAvg = total > 0 ? ratings.reduce((a, b) => a + b, 0) / total : 0;
  const avgStr = total > 0 ? numericAvg.toFixed(1) : '—';

  // Gauge parameters (Semi-circle arc)
  const size = 280;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const arcLength = Math.PI * radius; // 180 degrees
  const pct = total > 0 ? (numericAvg - 1) / 4 : 0; // 1 to 5 maps to 0 to 1
  const strokeDashoffset = arcLength * (1 - pct);

  let label = 'En attente';
  let colorClass = 'text-slate-500';
  if (numericAvg >= 4.5) {
    label = 'Excellent ! 🌟';
    colorClass = 'text-emerald-600';
  } else if (numericAvg >= 3.8) {
    label = 'Très bon 👍';
    colorClass = 'text-teal-600';
  } else if (numericAvg >= 2.8) {
    label = 'Satisfaisant 🙂';
    colorClass = 'text-amber-600';
  } else if (numericAvg > 0) {
    label = 'À améliorer 💡';
    colorClass = 'text-rose-600';
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center py-6">
      {/* SVG Semi-Circle Gauge */}
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size / 2 + 30} className="overflow-visible">
          {/* Background arc track */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="rgba(226, 232, 240, 0.9)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Filled gradient arc */}
          {total > 0 && (
            <path
              d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
              fill="none"
              stroke="url(#gaugeGradLight)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={arcLength}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          )}

          <defs>
            <linearGradient id="gaugeGradLight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div className="absolute bottom-2 flex flex-col items-center text-center">
          <span className="text-5xl sm:text-6xl font-black text-slate-900 font-mono tracking-tight">
            {avgStr}
          </span>
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mt-1">sur 5</span>
          <span className={`text-base font-bold mt-2 ${colorClass}`}>{label}</span>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-4 text-xs text-slate-500 font-medium">
        <span>Min : 1.0</span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
        <span className="font-bold text-slate-800">{total} avis</span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
        <span>Max : 5.0</span>
      </div>
    </div>
  );
}
