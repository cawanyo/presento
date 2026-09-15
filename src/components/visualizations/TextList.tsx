import React from 'react';
import { User, Trash2 } from 'lucide-react';
import type { Response as ResponseType } from '@/lib/types';

interface Props {
  responses: ResponseType[];
  onDeleteResponse?: (id: string) => void;
}

export function TextList({ responses, onDeleteResponse }: Props) {
  if (responses.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 text-lg">En attente de réponses...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-2">
      <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
        {responses.map((r, i) => (
          <div
            key={r.id || i}
            className="group flex items-start justify-between gap-3 rounded-2xl bg-white border-2 border-slate-200/90 p-4 transition-all hover:border-slate-300 shadow-xs"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-teal-100">
                <User size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-teal-700">
                    {r.participant_name || 'Participant anonyme'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    #{responses.length - i}
                  </span>
                </div>
                <p className="text-slate-900 font-medium text-sm leading-relaxed">{r.answer}</p>
              </div>
            </div>

            {onDeleteResponse && (
              <button
                onClick={() => onDeleteResponse(r.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex-shrink-0"
                title="Supprimer ce message"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-slate-500 font-medium mt-4 flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
        {responses.length} réponse{responses.length > 1 ? 's' : ''} au total
      </p>
    </div>
  );
}
