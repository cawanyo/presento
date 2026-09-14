import React from 'react';
import { Star } from 'lucide-react';
import type { Response as ResponseType } from '@/lib/types';

interface Props {
  responses: ResponseType[];
}

export function RatingStars({ responses }: Props) {
  const ratings = responses
    .map((r) => parseInt(r.answer, 10))
    .filter((n) => !isNaN(n) && n >= 1 && n <= 5);

  const total = ratings.length;
  const avg = total > 0 ? (ratings.reduce((a, b) => a + b, 0) / total).toFixed(1) : '—';
  const numericAvg = total > 0 ? ratings.reduce((a, b) => a + b, 0) / total : 0;

  const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  ratings.forEach((r) => (dist[r] = (dist[r] ?? 0) + 1));
  const maxDist = Math.max(...Object.values(dist), 1);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center py-4">
      {/* Huge Score Header */}
      <div className="text-center mb-8">
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-6xl sm:text-7xl font-black text-amber-500 font-mono tracking-tight drop-shadow-xs">
            {avg}
          </span>
          <span className="text-3xl font-bold text-slate-400">/ 5</span>
        </div>

        {/* Dynamic Star Row based on average */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {[1, 2, 3, 4, 5].map((star) => {
            const fillPct = Math.max(0, Math.min(1, numericAvg - (star - 1)));
            return (
              <div key={star} className="relative">
                <Star size={32} className="text-slate-200" />
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fillPct * 100}%` }}
                >
                  <Star size={32} className="text-amber-400 fill-amber-400" />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-sm text-slate-500 mt-2 font-medium">
          {total} note{total > 1 ? 's' : ''} exprimée{total > 1 ? 's' : ''}
        </p>
      </div>

      {/* Distribution Bars */}
      <div className="w-full space-y-2.5 max-w-lg bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = dist[star];
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-14 justify-end flex-shrink-0">
                <span className="text-sm font-bold text-slate-700 font-mono">{star}</span>
                <Star size={14} className="text-amber-400 fill-amber-400" />
              </div>

              <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700 ease-out"
                  style={{ width: `${(count / maxDist) * 100}%` }}
                />
              </div>

              <div className="w-16 text-right flex-shrink-0 flex items-center justify-end gap-1.5">
                <span className="text-xs text-slate-400">{count}</span>
                <span className="text-xs font-bold text-slate-800 font-mono w-9">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
