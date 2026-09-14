import React, { useMemo } from 'react';
import type { Response as ResponseType } from '@/lib/types';
import { MENTI_COLORS } from '@/lib/types';

interface Props {
  responses: ResponseType[];
}

export function WordCloudBubbles({ responses }: Props) {
  const wordStats = useMemo(() => {
    const counts: Record<string, number> = {};
    responses.forEach((r) => {
      const clean = r.answer.trim();
      if (clean) {
        counts[clean] = (counts[clean] ?? 0) + 1;
      }
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = sorted.length > 0 ? sorted[0][1] : 1;
    const min = sorted.length > 0 ? sorted[sorted.length - 1][1] : 1;

    return sorted.map(([word, count], idx) => {
      const ratio = max === min ? 0.5 : (count - min) / (max - min);
      // Diameter from 75px to 160px
      const sizePx = Math.round(75 + ratio * 85);
      const color = MENTI_COLORS[idx % MENTI_COLORS.length];

      return {
        word,
        count,
        sizePx,
        color,
      };
    });
  }, [responses]);

  if (wordStats.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 text-lg">En attente de mots...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-6">
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 min-h-[360px] p-4">
        {wordStats.map((item) => (
          <div
            key={item.word}
            className="group relative rounded-full flex flex-col items-center justify-center text-center p-2 transition-all duration-500 hover:scale-110 cursor-pointer shadow-lg backdrop-blur-md"
            style={{
              width: `${item.sizePx}px`,
              height: `${item.sizePx}px`,
              background: `radial-gradient(circle at 35% 35%, ${item.color.hex}dd, ${item.color.hex}66)`,
              border: `2px solid ${item.color.hex}aa`,
              boxShadow: `0 0 20px ${item.color.hex}33`,
            }}
          >
            <span className="font-extrabold text-white leading-tight px-1 drop-shadow line-clamp-2 text-xs sm:text-sm">
              {item.word}
            </span>
            <span className="mt-0.5 bg-black/40 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white/20">
              {item.count}
            </span>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-slate-400 mt-4 flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
        {responses.length} réponse{responses.length > 1 ? 's' : ''} au total
      </p>
    </div>
  );
}
