import React, { useMemo } from 'react';
import type { Response as ResponseType } from '@/lib/types';
import { MENTI_COLORS } from '@/lib/types';

interface Props {
  responses: ResponseType[];
}

export function WordCloudOrganized({ responses }: Props) {
  const wordStats = useMemo(() => {
    const counts: Record<string, number> = {};
    responses.forEach((r) => {
      const clean = r.answer.trim().toLowerCase();
      if (clean) {
        // Keep original casing for primary display if possible
        counts[clean] = (counts[clean] ?? 0) + 1;
      }
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = sorted.length > 0 ? sorted[0][1] : 1;
    const min = sorted.length > 0 ? sorted[sorted.length - 1][1] : 1;

    // Pseudo-random but deterministic placement for organic cloud feeling
    return sorted.map(([word, count], idx) => {
      // Scale from 1.25rem (min) up to 4.2rem (max)
      const ratio = max === min ? 0.5 : (count - min) / (max - min);
      const fontSize = 1.25 + ratio * 3.0; // rem
      const color = MENTI_COLORS[idx % MENTI_COLORS.length];
      const rotation = idx % 5 === 0 ? -4 : idx % 7 === 0 ? 3 : 0; // slight organic tilt

      return {
        word,
        count,
        fontSize,
        color,
        rotation,
      };
    });
  }, [responses]);

  if (wordStats.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 text-lg">En attente de mots...</p>
        <p className="text-slate-500 text-sm mt-1">Les mots envoyés formeront un nuage interactif en direct.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto min-h-[380px] flex flex-col items-center justify-center p-6">
      {/* Cloud words container */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 max-w-3xl py-4 select-none">
        {wordStats.map((item, i) => (
          <div
            key={item.word}
            className="group relative inline-flex items-center transition-all duration-300 hover:scale-110 cursor-pointer"
            style={{
              transform: `rotate(${item.rotation}deg)`,
            }}
          >
            <span
              className="font-black tracking-tight transition-all duration-500 drop-shadow-sm"
              style={{
                fontSize: `${item.fontSize}rem`,
                color: item.color.hex,
                textShadow: `0 0 25px ${item.color.hex}44`,
              }}
            >
              {item.word}
            </span>

            {/* Hover tooltip showing count */}
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 border border-slate-700 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-lg pointer-events-none whitespace-nowrap z-20">
              {item.count} mention{item.count > 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
        <span>
          {responses.length} mot{responses.length > 1 ? 's' : ''} soumis · {wordStats.length} mot{wordStats.length > 1 ? 's' : ''} uniques
        </span>
      </div>
    </div>
  );
}
