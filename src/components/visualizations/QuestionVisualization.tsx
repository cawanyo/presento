import React from 'react';
import { EyeOff, Users } from 'lucide-react';
import type { Question, Response as ResponseType, ChartLayout } from '@/lib/types';
import { parseQuestionConfig, getEffectiveQuestionType } from '@/lib/types';
import { TextSlideView } from './TextSlideView';
import { MultipleChoiceBars } from './MultipleChoiceBars';
import { MultipleChoiceHorizontal } from './MultipleChoiceHorizontal';
import { MultipleChoiceDonut } from './MultipleChoiceDonut';
import { MultipleChoiceCards } from './MultipleChoiceCards';
import { WordCloudOrganized } from './WordCloudOrganized';
import { WordCloudBubbles } from './WordCloudBubbles';
import { WordCloudRanking } from './WordCloudRanking';
import { RatingStars } from './RatingStars';
import { RatingGauge } from './RatingGauge';
import { TextWall } from './TextWall';
import { TextSpotlight } from './TextSpotlight';
import { TextList } from './TextList';

interface Props {
  question: Question;
  responses: ResponseType[];
  activeLayout: ChartLayout;
  revealedQuiz?: boolean;
  hideResults?: boolean;
}

export function QuestionVisualization({
  question,
  responses,
  activeLayout,
  revealedQuiz = false,
  hideResults = false,
}: Props) {
  const effectiveType = getEffectiveQuestionType(question);
  const { choices, textBlocks } = parseQuestionConfig(question);

  // If text slide
  if (effectiveType === 'text_slide') {
    return (
      <TextSlideView
        title={question.title}
        textBlocks={textBlocks}
        layout={activeLayout}
      />
    );
  }

  // If presenter chose to hide results
  if (hideResults) {
    return (
      <div className="w-full max-w-lg mx-auto text-center py-16 animate-in fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 mb-5 shadow-md">
          <EyeOff className="text-amber-600" size={36} />
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-2">Résultats masqués</h3>
        <p className="text-slate-500 text-sm mb-6">
          L'animateur a masqué les résultats pour le moment.
        </p>
        <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 px-4 py-2 rounded-full text-xs font-bold text-slate-700">
          <Users size={15} />
          <span>{responses.length} réponse{responses.length > 1 ? 's' : ''} enregistrée{responses.length > 1 ? 's' : ''}</span>
        </div>
      </div>
    );
  }

  // 1. Multiple Choice & Quiz
  if (effectiveType === 'multiple_choice' || effectiveType === 'quiz') {
    const isQuiz = question.type === 'quiz';
    const correctOpt = question.correct_option;

    switch (activeLayout) {
      case 'horizontal_bars':
        return (
          <MultipleChoiceHorizontal
            options={choices}
            responses={responses}
            correctOption={correctOpt}
            isQuiz={isQuiz}
            revealed={revealedQuiz}
          />
        );
      case 'donut':
        return (
          <MultipleChoiceDonut
            options={choices}
            responses={responses}
            correctOption={correctOpt}
            isQuiz={isQuiz}
            revealed={revealedQuiz}
          />
        );
      case 'cards':
        return (
          <MultipleChoiceCards
            options={choices}
            responses={responses}
            correctOption={correctOpt}
            isQuiz={isQuiz}
            revealed={revealedQuiz}
          />
        );
      case 'bars':
      default:
        return (
          <MultipleChoiceBars
            options={choices}
            responses={responses}
            correctOption={correctOpt}
            isQuiz={isQuiz}
            revealed={revealedQuiz}
          />
        );
    }
  }

  // 2. Word Cloud
  if (question.type === 'word_cloud') {
    switch (activeLayout) {
      case 'bubbles':
        return <WordCloudBubbles responses={responses} />;
      case 'ranking':
        return <WordCloudRanking responses={responses} />;
      case 'word_cloud':
      default:
        return <WordCloudOrganized responses={responses} />;
    }
  }

  // 3. Rating
  if (question.type === 'rating') {
    switch (activeLayout) {
      case 'gauge':
        return <RatingGauge responses={responses} />;
      case 'stars':
      default:
        return <RatingStars responses={responses} />;
    }
  }

  // 4. Open Text
  if (question.type === 'open_text') {
    switch (activeLayout) {
      case 'spotlight':
        return <TextSpotlight responses={responses} />;
      case 'list':
        return <TextList responses={responses} />;
      case 'wall':
      default:
        return <TextWall responses={responses} />;
    }
  }

  return null;
}
