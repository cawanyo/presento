import React from 'react';
import type { TextBlock, ChartLayout } from '@/lib/types';
import { Quote, Sparkles } from 'lucide-react';

interface Props {
  title: string;
  textBlocks: TextBlock[];
  layout: ChartLayout;
}

export function TextSlideView({ title, textBlocks, layout }: Props) {
  const isCentered = layout === 'slide_centered';
  const isCards = layout === 'slide_cards';

  // Fallback if no blocks
  const blocks = textBlocks.length > 0 ? textBlocks : [
    { id: '1', type: 'subtitle' as const, text: 'Points clés & informations', align: 'center' as const },
    { id: '2', type: 'paragraph' as const, text: 'Partagez vos idées et vos réflexions avec votre public.', align: 'center' as const }
  ];

  if (isCards) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-4">
        {/* Slide Title */}
        {title && (
          <div className="text-center mb-6 max-w-2xl">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-0.5 rounded-full uppercase tracking-wider mb-2">
              <Sparkles size={12} /> Diapositive
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {title}
            </h2>
          </div>
        )}

        {/* Blocks Grid / Cards */}
        <div className="w-full grid sm:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1">
          {blocks.map((block) => {
            const alignClass =
              block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left';

            return (
              <div
                key={block.id}
                className="bg-white/95 rounded-2xl border-2 border-slate-200/90 p-5 shadow-md shadow-slate-200/50 flex flex-col justify-center transition-all hover:border-teal-400 hover:shadow-lg"
              >
                {block.type === 'title' && (
                  <h3 className={`text-xl sm:text-2xl font-black text-slate-900 tracking-tight ${alignClass}`}>
                    {block.text}
                  </h3>
                )}
                {block.type === 'subtitle' && (
                  <h4 className={`text-base sm:text-lg font-bold text-teal-700 ${alignClass}`}>
                    {block.text}
                  </h4>
                )}
                {block.type === 'paragraph' && (
                  <p className={`text-sm sm:text-base text-slate-600 leading-relaxed font-normal whitespace-pre-line ${alignClass}`}>
                    {block.text}
                  </p>
                )}
                {block.type === 'bullet' && (
                  <div className={`flex items-start gap-2.5 text-sm sm:text-base font-medium text-slate-800 ${alignClass}`}>
                    <span className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0" />
                    <span>{block.text}</span>
                  </div>
                )}
                {block.type === 'quote' && (
                  <div className="relative pl-3 border-l-4 border-teal-500 py-1 italic text-slate-800 font-serif">
                    <Quote size={16} className="text-teal-400 mb-1 opacity-60" />
                    <p className="text-base">{block.text}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Centered or Editorial Left
  return (
    <div
      className={`w-full max-w-4xl mx-auto flex flex-col justify-center p-4 sm:p-8 animate-in fade-in duration-300 ${
        isCentered ? 'items-center text-center' : 'items-start text-left'
      }`}
    >
      {/* Slide Title */}
      {title && (
        <div className={`mb-6 max-w-3xl ${isCentered ? 'text-center' : 'text-left'}`}>
          <div className={`flex items-center gap-2 mb-2 ${isCentered ? 'justify-center' : 'justify-start'}`}>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-0.5 rounded-full uppercase tracking-wider">
              Présentation
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {title}
          </h2>
        </div>
      )}

      {/* Text Blocks List */}
      <div
        className={`w-full max-w-3xl space-y-4 max-h-[380px] overflow-y-auto pr-2 ${
          isCentered ? 'flex flex-col items-center' : 'flex flex-col items-start'
        }`}
      >
        {blocks.map((block) => {
          const alignClass =
            block.align === 'center'
              ? 'text-center'
              : block.align === 'right'
              ? 'text-right'
              : 'text-left';

          return (
            <div key={block.id} className="w-full">
              {block.type === 'title' && (
                <h3 className={`text-2xl sm:text-3xl font-black text-slate-900 tracking-tight ${alignClass}`}>
                  {block.text}
                </h3>
              )}

              {block.type === 'subtitle' && (
                <h4 className={`text-lg sm:text-xl font-bold text-teal-600 ${alignClass}`}>
                  {block.text}
                </h4>
              )}

              {block.type === 'paragraph' && (
                <p className={`text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl whitespace-pre-line ${alignClass} ${isCentered ? 'mx-auto' : ''}`}>
                  {block.text}
                </p>
              )}

              {block.type === 'bullet' && (
                <div
                  className={`flex items-start gap-3 text-base sm:text-lg text-slate-800 font-medium ${
                    isCentered ? 'justify-center' : 'justify-start'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 mt-2 flex-shrink-0 shadow-xs" />
                  <span className={alignClass}>{block.text}</span>
                </div>
              )}

              {block.type === 'quote' && (
                <div
                  className={`border-l-4 border-teal-500 bg-teal-50/50 rounded-r-2xl p-4 sm:p-5 italic text-slate-800 font-serif text-lg sm:text-xl max-w-2xl ${
                    isCentered ? 'mx-auto text-center' : 'text-left'
                  }`}
                >
                  <Quote size={20} className="text-teal-500 mb-1 opacity-70" />
                  <p>{block.text}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
