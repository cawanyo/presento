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

export function MultipleChoiceHorizontal({
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
    <div className="w-full max-w-2xl mx-auto space-y-3.5">
      {options.map((opt, i) => {
        const count = counts[opt] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const color = MENTI_COLORS[i % MENTI_COLORS.length];
        const isCorrect = isQuiz && correctOption === i;
        const isWrong = isQuiz && revealed && correctOption !== null && correctOption !== i;

        return (
          <div
            key={i}
            className={`group relative rounded-2xl bg-white border-2 border-slate-200/90 p-3.5 overflow-hidden transition-all duration-300 shadow-xs ${
              isCorrect && revealed
                ? 'ring-2 ring-emerald-500 bg-emerald-50/50 border-emerald-500'
                : isWrong
                ? 'opacity-40'
                : 'hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            {/* Animated progress fill layer */}
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out opacity-20 rounded-2xl ${
                isCorrect && revealed ? 'bg-emerald-500' : color.bg
              }`}
              style={{ width: `${pct}%` }}
            />

            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <span
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs ${
                    isCorrect && revealed
                      ? 'bg-emerald-600 text-white font-black ring-2 ring-emerald-300'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}
                >
                  {LETTERS[i] || i + 1}
                </span>
                <span
                  className={`text-base font-bold truncate ${
                    isCorrect && revealed ? 'text-emerald-800' : 'text-slate-900'
                  }`}
                >
                  {opt}
                </span>
                {revealed && isCorrect && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={14} /> Correct
                  </span>
                )}
                {revealed && isWrong && (
                  <span className="text-xs text-rose-500">
                    <XCircle size={14} />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-slate-500 font-medium">
                  {count} vote{count > 1 ? 's' : ''}
                </span>
                <span className="text-xl font-black text-slate-900 font-mono min-w-[3.5rem] text-right">
                  {pct}%
                </span>
              </div>
            </div>

            {/* Micro bottom progress bar */}
            <div className="relative z-10 mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isCorrect && revealed
                    ? 'bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                    : `bg-gradient-to-r ${color.from} ${color.to}`
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}

      <p className="text-center text-xs text-slate-500 font-medium pt-2 flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
        {total} réponse{total > 1 ? 's' : ''} au total
      </p>
    </div>
  );
}
