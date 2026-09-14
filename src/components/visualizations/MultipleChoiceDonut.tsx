import React, { useState } from 'react';
import type { Response as ResponseType } from '@/lib/types';
import { MENTI_COLORS } from '@/lib/types';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  options: string[];
  responses: ResponseType[];
  correctOption?: number | null;
  isQuiz?: boolean;
  revealed?: boolean;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function MultipleChoiceDonut({
  options,
  responses,
  correctOption = null,
  isQuiz = false,
  revealed = false,
}: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const counts: Record<string, number> = {};
  options.forEach((opt) => (counts[opt] = 0));
  responses.forEach((r) => {
    counts[r.answer] = (counts[r.answer] ?? 0) + 1;
  });

  const total = responses.length;

  // SVG parameters
  const size = 260;
  const strokeWidth = 38;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  // Prepare segments
  const segments = options.map((opt, i) => {
    const count = counts[opt] ?? 0;
    const pct = total > 0 ? count / total : 0;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset * circumference;
    currentOffset += pct;

    const color = MENTI_COLORS[i % MENTI_COLORS.length];
    const isCorrect = isQuiz && correctOption === i;

    return {
      index: i,
      label: opt,
      count,
      pct: Math.round(pct * 100),
      strokeDasharray,
      strokeDashoffset,
      color: isCorrect && revealed ? '#10b981' : color.hex,
      isCorrect,
    };
  });

  const activeSegment = hoveredIdx !== null ? segments[hoveredIdx] : null;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 py-4">
      {/* SVG Donut */}
      <div className="relative flex items-center justify-center flex-shrink-0">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(226, 232, 240, 0.8)"
            strokeWidth={strokeWidth}
          />
          {total > 0 &&
            segments.map((seg) => (
              <circle
                key={seg.index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={hoveredIdx === seg.index ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(seg.index)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            ))}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          {activeSegment ? (
            <div className="animate-in fade-in duration-200">
              <span className="text-3xl font-black text-slate-900 font-mono">{activeSegment.pct}%</span>
              <p className="text-xs text-slate-700 font-bold max-w-[120px] truncate">{activeSegment.label}</p>
              <span className="text-[10px] text-slate-500 font-semibold">{activeSegment.count} votes</span>
            </div>
          ) : (
            <div>
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">{total}</span>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">votes</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend list */}
      <div className="flex-1 w-full max-w-sm space-y-2.5">
        {segments.map((seg) => {
          const isSelected = hoveredIdx === seg.index;
          return (
            <div
              key={seg.index}
              onMouseEnter={() => setHoveredIdx(seg.index)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-50 border-teal-500 shadow-sm scale-[1.02]'
                  : 'bg-white border-slate-200 hover:bg-slate-50/80 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-xs"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-xs font-bold text-slate-400 w-4">{LETTERS[seg.index]}</span>
                <span className="text-sm font-semibold text-slate-800 truncate">{seg.label}</span>
                {revealed && seg.isCorrect && (
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 ml-1" />
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-xs text-slate-400">{seg.count}</span>
                <span className="text-sm font-bold text-slate-900 font-mono w-10 text-right">{seg.pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
