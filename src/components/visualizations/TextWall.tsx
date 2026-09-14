import React from 'react';
import { User } from 'lucide-react';
import type { Response as ResponseType } from '@/lib/types';

interface Props {
  responses: ResponseType[];
}

const CARD_TINTS = [
  'border-cyan-200 bg-cyan-50/70 text-cyan-950',
  'border-purple-200 bg-purple-50/70 text-purple-950',
  'border-pink-200 bg-pink-50/70 text-pink-950',
  'border-amber-200 bg-amber-50/70 text-amber-950',
  'border-emerald-200 bg-emerald-50/70 text-emerald-950',
  'border-indigo-200 bg-indigo-50/70 text-indigo-950',
];

export function TextWall({ responses }: Props) {
  if (responses.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 text-lg">En attente de messages...</p>
        <p className="text-slate-500 text-sm mt-1">Les participants peuvent soumettre leurs idées en direct.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 max-h-[55vh] overflow-y-auto pr-1">
        {responses.map((r, i) => {
          const tint = CARD_TINTS[i % CARD_TINTS.length];
          return (
            <div
              key={r.id || i}
              className={`rounded-3xl border-2 p-5 shadow-xs hover:scale-[1.02] hover:shadow-md transition-all duration-300 animate-in fade-in flex flex-col justify-between ${tint}`}
            >
              <p className="text-slate-900 text-base leading-relaxed break-words font-semibold">
                "{r.answer}"
              </p>
              <div className="flex items-center gap-1.5 mt-4 pt-2.5 border-t border-black/5 text-xs text-slate-600 font-medium">
                <User size={13} className="text-slate-400" />
                <span className="truncate">{r.participant_name || 'Participant anonyme'}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-500 font-medium mt-4 flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
        {responses.length} message{responses.length > 1 ? 's' : ''} reçu{responses.length > 1 ? 's' : ''}
      </p>
    </div>
  );
}
