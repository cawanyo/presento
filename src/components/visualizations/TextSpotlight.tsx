import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, User, Quote, Trash2 } from 'lucide-react';
import type { Response as ResponseType } from '@/lib/types';
import { Button } from '@/components/ui/Button';

interface Props {
  responses: ResponseType[];
  onDeleteResponse?: (id: string) => void;
}

export function TextSpotlight({ responses, onDeleteResponse }: Props) {
  const [index, setIndex] = useState(0);

  if (responses.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 text-lg">En attente de réponses...</p>
      </div>
    );
  }

  const safeIdx = Math.min(index, responses.length - 1);
  const current = responses[safeIdx];

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(responses.length - 1, i + 1));

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center py-6">
      {/* Spotlight Card */}
      <div className="relative w-full rounded-3xl bg-white border-2 border-slate-200 p-8 sm:p-12 shadow-xl shadow-slate-200/50 text-center transition-all min-h-[260px] flex flex-col items-center justify-center">
        {onDeleteResponse && (
          <button
            onClick={() => onDeleteResponse(current.id)}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 shadow-xs cursor-pointer transition-colors"
            title="Supprimer ce message"
          >
            <Trash2 size={16} />
          </button>
        )}

        <Quote className="text-teal-500/30 mb-4" size={48} />

        <p className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 leading-snug tracking-tight mb-6">
          "{current.answer}"
        </p>

        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-4 py-1.5 rounded-full text-sm font-bold text-slate-700">
          <User size={15} className="text-teal-600" />
          <span>{current.participant_name || 'Participant anonyme'}</span>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex items-center gap-4 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={safeIdx === 0}
          className="border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-30"
        >
          <ChevronLeft size={18} /> Précédent
        </Button>

        <span className="text-sm font-bold text-slate-700 px-3 py-1 bg-white rounded-full border border-slate-200 font-mono shadow-xs">
          {safeIdx + 1} / {responses.length}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={goNext}
          disabled={safeIdx === responses.length - 1}
          className="border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-30"
        >
          Suivant <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  );
}
