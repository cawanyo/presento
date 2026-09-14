import React, { useMemo } from 'react';
import { Trophy, Medal } from 'lucide-react';
import type { Response as ResponseType } from '@/lib/types';
import { MENTI_COLORS } from '@/lib/types';

interface Props {
  responses: ResponseType[];
}

export function WordCloudRanking({ responses }: Props) {
  const ranking = useMemo(() => {
    const counts: Record<string, number> = {};
    responses.forEach((r) => {
      const clean = r.answer.trim();
      if (clean) counts[clean] = (counts[clean] ?? 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = sorted.length > 0 ? sorted[0][1] : 1;

    return sorted.slice(0, 10).map(([word, count], i) => ({
      rank: i + 1,
      word,
      count,
      pct: Math.round((count / max) * 100),
      color: MENTI_COLORS[i % MENTI_COLORS.length],
    }));
  }, [responses]);

  if (ranking.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 text-lg">En attente de mots...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3 py-2">
      {ranking.map((item) => {
        return (
          <div
            key={item.word}
            className={`flex items-center gap-4 rounded-2xl bg-white border-2 p-3.5 transition-all duration-300 shadow-xs ${
              item.rank === 1
                ? 'border-amber-400 bg-amber-50/50 shadow-sm shadow-amber-500/10'
                : item.rank === 2
                ? 'border-slate-300 bg-slate-50/60'
                : item.rank === 3
                ? 'border-amber-600/30 bg-amber-50/30'
                : 'border-slate-200'
            }`}
          >
            {/* Rank badge */}
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
              {item.rank === 1 ? (
                <Trophy className="text-amber-500" size={24} />
              ) : item.rank === 2 ? (
                <Medal className="text-slate-400" size={22} />
              ) : item.rank === 3 ? (
                <Medal className="text-amber-700" size={20} />
              ) : (
                <span className="text-sm font-bold text-slate-400 font-mono">#{item.rank}</span>
              )}
            </div>

            {/* Word and progress */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-base text-slate-900 truncate">{item.word}</span>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full font-mono border border-slate-200">
                  {item.count} vote{item.count > 1 ? 's' : ''}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    item.rank === 1
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : `bg-gradient-to-r ${item.color.from} ${item.color.to}`
                  }`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}

      <p className="text-center text-xs text-slate-500 font-medium pt-2 flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
        {responses.length} réponses au total
      </p>
    </div>
  );
}
