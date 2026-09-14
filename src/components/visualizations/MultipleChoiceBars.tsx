import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { Response as ResponseType } from '@/lib/types';
import { MENTI_COLORS } from '@/lib/types';

interface Props {
  options: string[];
  responses: ResponseType[];
  correctOption?: number | null;
  isQuiz?: boolean;
  revealed?: boolean;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function MultipleChoiceBars({
  options,
  responses,
  correctOption = null,
  isQuiz = false,
  revealed = false,
}: Props) {
  const counts: Record<string, number> = {};
  options.forEach((opt) => (counts[opt] = 0));
  responses.forEach((r) => {
    counts[r.answer] = (counts[r.answer] ?? 0) + 1;
  });

  const total = responses.length;
  const maxCount = Math.max(...Object.values(counts), 1);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Vertical columns container */}
      <div className="w-full flex items-end justify-center gap-3 sm:gap-6 min-h-[340px] max-h-[420px] pb-4 pt-10 px-2">
        {options.map((opt, i) => {
          const count = counts[opt] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const color = MENTI_COLORS[i % MENTI_COLORS.length];
          const isCorrect = isQuiz && correctOption === i;
          const isWrong = isQuiz && revealed && correctOption !== null && correctOption !== i;

          // Compute height percentage (relative to maxCount, minimum 6% for aesthetic rounded base)
          const heightPercent = total === 0 ? 6 : Math.max(6, Math.round((count / maxCount) * 100));

          return (
            <div
              key={i}
              className={`flex-1 max-w-[130px] flex flex-col items-center justify-end h-full transition-all duration-500 ${
                isWrong ? 'opacity-35 scale-95' : 'opacity-100 scale-100'
              }`}
            >
              {/* Percentage & Vote count floating above column */}
              <div className="flex flex-col items-center mb-2.5 transition-all duration-500">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 drop-shadow-xs">
                  {pct}%
                </span>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 shadow-xs mt-0.5">
                  {count} vote{count > 1 ? 's' : ''}
                </span>
              </div>

              {/* Animated Rising Column */}
              <div className="w-full relative flex items-end justify-center h-[240px]">
                <div
                  className={`w-full rounded-2xl transition-all duration-700 ease-out shadow-md relative overflow-hidden flex flex-col justify-start items-center p-2 ${
                    isCorrect && revealed
                      ? 'bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 ring-4 ring-emerald-400/80 shadow-emerald-500/30'
                      : `bg-gradient-to-t ${color.from} ${color.to}`
                  }`}
                  style={{
                    height: `${heightPercent}%`,
                    boxShadow: isCorrect && revealed ? '0 0 25px rgba(16,185,129,0.4)' : undefined,
                  }}
                >
                  {/* Subtle glass reflection overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-2xl" />

                  {/* Icon badge if revealed quiz */}
                  {revealed && isCorrect && (
                    <div className="relative z-10 bg-white text-emerald-600 rounded-full p-1 shadow-md animate-bounce">
                      <CheckCircle2 size={18} />
                    </div>
                  )}
                  {revealed && isWrong && (
                    <div className="relative z-10 bg-white/40 text-rose-700 rounded-full p-0.5">
                      <XCircle size={16} />
                    </div>
                  )}
                </div>
              </div>

              {/* Option label & Letter pill below column */}
              <div className="mt-4 flex flex-col items-center text-center w-full">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs mb-1.5 shadow-xs ${
                    isCorrect && revealed
                      ? 'bg-emerald-500 text-white font-black'
                      : 'bg-slate-100 border border-slate-200 text-slate-800'
                  }`}
                >
                  {LETTERS[i] || i + 1}
                </div>
                <p
                  className={`text-xs sm:text-sm font-semibold line-clamp-2 px-1 ${
                    isCorrect && revealed
                      ? 'text-emerald-700 font-bold'
                      : 'text-slate-800'
                  }`}
                  title={opt}
                >
                  {opt}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs font-medium text-slate-500 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
        <span>{total} réponse{total > 1 ? 's' : ''} enregistrée{total > 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
