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

export function MultipleChoiceCards({
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

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((opt, i) => {
          const count = counts[opt] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const color = MENTI_COLORS[i % MENTI_COLORS.length];
          const isCorrect = isQuiz && correctOption === i;
          const isWrong = isQuiz && revealed && correctOption !== null && correctOption !== i;

          return (
            <div
              key={i}
              className={`relative rounded-3xl bg-white border-2 p-5 overflow-hidden transition-all duration-500 shadow-sm ${
                isCorrect && revealed
                  ? 'border-emerald-500 ring-4 ring-emerald-500/20 shadow-emerald-500/10'
                  : isWrong
                  ? 'border-slate-200 opacity-40 scale-[0.98]'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              {/* Background color tint */}
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
                style={{ backgroundColor: isCorrect && revealed ? '#10b981' : color.hex }}
              />

              <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0 ${
                      isCorrect && revealed
                        ? 'bg-emerald-600 text-white font-black'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {LETTERS[i] || i + 1}
                  </span>
                  <h3
                    className={`font-bold text-lg leading-snug line-clamp-2 ${
                      isCorrect && revealed ? 'text-emerald-800' : 'text-slate-900'
                    }`}
                  >
                    {opt}
                  </h3>
                </div>

                {revealed && isCorrect && (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200 flex-shrink-0 animate-pulse">
                    <CheckCircle2 size={15} /> Bonne réponse
                  </span>
                )}
                {revealed && isWrong && (
                  <span className="text-rose-500 flex-shrink-0">
                    <XCircle size={18} />
                  </span>
                )}
              </div>

              {/* Stat footer */}
              <div className="relative z-10 flex items-end justify-between mt-auto pt-2">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Votes</span>
                  <p className="text-lg font-bold text-slate-800 font-mono">{count}</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-slate-900 font-mono">{pct}%</span>
                </div>
              </div>

              {/* Progress bar line */}
              <div className="relative z-10 mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    isCorrect && revealed
                      ? 'bg-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                      : `bg-gradient-to-r ${color.from} ${color.to}`
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400 font-medium mt-5 flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
        {total} participant{total > 1 ? 's' : ''} ont voté
      </p>
    </div>
  );
}
