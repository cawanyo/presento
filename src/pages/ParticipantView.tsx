import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Presentation, ArrowRight, CheckCircle2, Loader2, Users, Star, Check, Plus, FileText } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Presentation as PresentationType, Question, QuestionType } from '@/lib/types';
import { parseQuestionConfig, getEffectiveQuestionType, MENTI_COLORS } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Props {
  joinCode: string;
  onExit: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function getOrCreateParticipantId(): string {
  let id = localStorage.getItem('presento_participant_id');
  if (!id) {
    id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('presento_participant_id', id);
  }
  return id;
}

export function ParticipantView({ joinCode, onExit }: Props) {
  const presentationData = useQuery(api.presentations.getByJoinCode, {
    join_code: joinCode.toUpperCase().trim(),
  });
  const presentation = presentationData as unknown as PresentationType | null | undefined;
  const loading = presentationData === undefined;
  const error = presentationData === null ? 'Présentation introuvable. Vérifiez le code PIN saisi.' : null;

  const currentQuestionId = presentation?.current_question_id;
  const questionData = useQuery(
    api.questions.getById,
    currentQuestionId ? { id: currentQuestionId } : 'skip'
  );

  const presentationId = presentation?.id;
  const presentationQuestions = useQuery(
    api.questions.listByPresentation,
    presentationId ? { presentation_id: presentationId } : 'skip'
  );

  const currentQuestion = useMemo(() => {
    let rawQ = questionData;
    if (!rawQ && presentationQuestions && presentationQuestions.length > 0) {
      if (currentQuestionId) {
        rawQ =
          presentationQuestions.find(
            (q) => q.id === currentQuestionId || (q as any)._id === currentQuestionId
          ) ?? null;
      }
      // If presentation is active and current_question_id is not yet set or single question
      if (!rawQ && presentation?.status === 'active') {
        rawQ = presentationQuestions[0];
      }
    }
    if (!rawQ) return null;
    return {
      ...rawQ,
      type: getEffectiveQuestionType(rawQ as any),
    } as unknown as Question;
  }, [questionData, presentationQuestions, currentQuestionId, presentation?.status]);

  const joinMutation = useMutation(api.participants.join);
  const submitResponsesMutation = useMutation(api.responses.submit);

  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answer, setAnswer] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const participantId = useRef(getOrCreateParticipantId()).current;
  const lastQuestionIdRef = useRef<string | null>(null);

  const presentationEnded = presentation?.status === 'ended';

  // When presentation transitions back to active from ended, reset states
  const prevEndedRef = useRef(presentationEnded);
  useEffect(() => {
    if (prevEndedRef.current && !presentationEnded) {
      lastQuestionIdRef.current = null;
      setSubmitted(false);
      setAnswer('');
      setSelectedOptions([]);
      setRating(0);
    }
    prevEndedRef.current = presentationEnded;
  }, [presentationEnded]);

  // When question changes, reset input states
  useEffect(() => {
    const activeQId = currentQuestion?.id ?? currentQuestionId;
    if (activeQId !== lastQuestionIdRef.current) {
      lastQuestionIdRef.current = activeQId ?? null;
      setSubmitted(false);
      setAnswer('');
      setSelectedOptions([]);
      setRating(0);
    }
  }, [currentQuestion?.id, currentQuestionId]);

  const handleJoin = async () => {
    if (!presentation) return;
    try {
      await joinMutation({
        presentation_id: presentation.id,
        participant_id: participantId,
        name: name.trim() || null,
      });
      setJoined(true);
    } catch (err) {
      console.error('Failed to join participant:', err);
    }
  };

  const handleToggleOption = (idx: number) => {
    if (!currentQuestion) return;
    const { allowMultiple } = parseQuestionConfig(currentQuestion);
    if (allowMultiple && currentQuestion.type === 'multiple_choice') {
      setSelectedOptions((prev) =>
        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
      );
    } else {
      setSelectedOptions([idx]);
    }
  };

  const handleSubmit = async () => {
    if (!currentQuestion || !presentation) return;
    setSubmitting(true);

    const { choices } = parseQuestionConfig(currentQuestion);

    let answerValues: string[] = [];
    if (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'quiz') {
      if (selectedOptions.length === 0) {
        setSubmitting(false);
        return;
      }
      answerValues = selectedOptions.map((i) => choices[i]).filter(Boolean);
    } else if (currentQuestion.type === 'rating') {
      if (rating === 0) {
        setSubmitting(false);
        return;
      }
      answerValues = [String(rating)];
    } else {
      if (!answer.trim()) {
        setSubmitting(false);
        return;
      }
      answerValues = [answer.trim()];
    }

    if (answerValues.length === 0) {
      setSubmitting(false);
      return;
    }

    try {
      await submitResponsesMutation({
        question_id: currentQuestion.id,
        participant_id: participantId,
        participant_name: name.trim() || null,
        answers: answerValues,
      });

      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit response:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-teal-600" size={36} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 text-red-600 border border-red-200 mb-4 shadow-sm">
            <Presentation size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Oups</h2>
          <p className="text-slate-500 mb-6 text-sm">{error}</p>
          <Button variant="outline" onClick={onExit}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  // Step 1: Join Screen
  if (!joined) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 mb-4 shadow-sm">
              <Presentation size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{presentation?.title}</h1>
            <p className="text-slate-500 text-sm mt-1">Rejoignez la session interactive</p>
          </div>
          <div className="rounded-3xl bg-white border border-slate-200/90 p-8 shadow-xl shadow-slate-200/50">
            <Input
              label="Votre prénom ou pseudo (optionnel)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Sophie"
              className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400"
              autoFocus
            />
            <Button onClick={handleJoin} size="lg" className="w-full mt-6 bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/20">
              Participer <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Presentation Ended
  if (presentationEnded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-teal-50 text-teal-600 border border-teal-100 mb-6 shadow-sm">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Merci pour votre participation !</h2>
          <p className="text-slate-500 mb-6 text-sm">La présentation est terminée. À bientôt !</p>
          <Button variant="outline" onClick={onExit}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Waiting for next slide
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-xs">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 mb-4 shadow-sm">
            <Users size={30} className="animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1.5">En attente de l'animateur</h2>
          <p className="text-slate-500 text-sm">Regardez l'écran principal, la question arrive dans un instant...</p>
          <div className="mt-6 flex justify-center">
            <Loader2 className="animate-spin text-teal-600" size={24} />
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Already submitted answer
  if (submitted) {
    const cfg = currentQuestion ? parseQuestionConfig(currentQuestion) : null;
    const canSubmitAgain = Boolean(cfg?.allowMultiple);

    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-xs animate-in zoom-in-95">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 border-2 border-emerald-200 mb-4 shadow-sm">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Réponse enregistrée !</h2>
          <p className="text-slate-500 text-sm mb-5">
            {canSubmitAgain
              ? "Vos réponses ont été enregistrées. Vous pouvez en envoyer d'autres si vous le souhaitez."
              : "Votre réponse s'affiche en direct sur l'écran du présentateur."}
          </p>

          {canSubmitAgain && (
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setAnswer('');
                setSelectedOptions([]);
              }}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 mb-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition-all active:scale-98"
            >
              <Plus size={16} /> Envoyer une autre réponse
            </button>
          )}

          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-4 py-2 rounded-full">
            <Loader2 className="animate-spin" size={14} />
            <span>En attente de la suite...</span>
          </div>
        </div>
      </div>
    );
  }

  // Step 4b: Text Slide Reader View for Participants
  if (currentQuestion.type === 'text_slide') {
    const { textBlocks } = parseQuestionConfig(currentQuestion);

    return (
      <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-between p-4 sm:p-6">
        {/* Mini top bar */}
        <header className="w-full max-w-lg mx-auto flex items-center justify-between pb-4 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-500 truncate max-w-[200px]">
            {presentation?.title}
          </span>
          <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
            PIN {presentation?.join_code}
          </span>
        </header>

        {/* Content reader card */}
        <main className="w-full max-w-lg mx-auto my-auto py-6 animate-in fade-in">
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-3 py-0.5 rounded-full mb-2">
              <FileText size={13} /> Diapositive
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {currentQuestion.title}
            </h2>
          </div>

          <div className="rounded-3xl bg-slate-50/90 border-2 border-slate-200/90 p-5 sm:p-6 space-y-4 shadow-sm">
            {textBlocks.map((block) => (
              <div key={block.id}>
                {block.type === 'title' && (
                  <h3 className="text-xl font-black text-slate-900">{block.text}</h3>
                )}
                {block.type === 'subtitle' && (
                  <h4 className="text-base font-bold text-teal-700">{block.text}</h4>
                )}
                {block.type === 'paragraph' && (
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{block.text}</p>
                )}
                {block.type === 'bullet' && (
                  <div className="flex items-start gap-2.5 text-sm text-slate-800 font-medium">
                    <span className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                    <span>{block.text}</span>
                  </div>
                )}
                {block.type === 'quote' && (
                  <div className="border-l-4 border-teal-500 pl-3 py-1 italic text-slate-700 text-sm bg-white rounded-r-xl">
                    <p>{block.text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Follow presentation indicator */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-4 py-2.5 rounded-full shadow-xs">
            <div className="w-2 h-2 rounded-full bg-teal-600 animate-ping" />
            <span>Regardez l'écran principal pour suivre la présentation</span>
          </div>
        </main>

        <footer className="text-center py-2 text-[11px] text-slate-400">
          Présentation interactive animée avec Presento
        </footer>
      </div>
    );
  }

  // Step 5: Answer current question
  const { choices, allowMultiple } = parseQuestionConfig(currentQuestion);

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-between p-4 sm:p-6">
      {/* Mini top bar */}
      <header className="w-full max-w-lg mx-auto flex items-center justify-between pb-4 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-500 truncate max-w-[200px]">
          {presentation?.title}
        </span>
        <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
          PIN {presentation?.join_code}
        </span>
      </header>

      {/* Main question box */}
      <main className="w-full max-w-lg mx-auto my-auto py-6">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
              {currentQuestion.type === 'quiz' ? '⚡ Question Quiz' : 'Votre avis'}
            </span>
            {allowMultiple && (
              <span className="text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                Plusieurs réponses possibles
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
            {currentQuestion.title}
          </h2>
          {allowMultiple && currentQuestion.type === 'multiple_choice' && (
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Vous pouvez cocher une ou plusieurs options ci-dessous
            </p>
          )}
        </div>

        <ParticipantInput
          type={currentQuestion.type}
          options={choices}
          allowMultiple={allowMultiple}
          selectedOptions={selectedOptions}
          onToggleOption={handleToggleOption}
          answer={answer}
          setAnswer={setAnswer}
          rating={rating}
          setRating={setRating}
        />

        <Button
          onClick={handleSubmit}
          size="lg"
          className="w-full mt-6 text-base font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-xl shadow-teal-600/20"
          disabled={
            submitting ||
            ((currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'quiz') && selectedOptions.length === 0) ||
            (currentQuestion.type === 'rating' && rating === 0) ||
            ((currentQuestion.type === 'word_cloud' || currentQuestion.type === 'open_text') && !answer.trim())
          }
        >
          {submitting
            ? 'Envoi...'
            : allowMultiple && selectedOptions.length > 1
            ? `Valider mes choix (${selectedOptions.length})`
            : 'Soumettre ma réponse'}
        </Button>
      </main>

      <footer className="text-center py-2 text-[11px] text-slate-400">
        Présentation interactive animée avec Presento
      </footer>
    </div>
  );
}

function ParticipantInput({
  type,
  options,
  allowMultiple,
  selectedOptions,
  onToggleOption,
  answer,
  setAnswer,
  rating,
  setRating,
}: {
  type: QuestionType;
  options: string[];
  allowMultiple: boolean;
  selectedOptions: number[];
  onToggleOption: (n: number) => void;
  answer: string;
  setAnswer: (s: string) => void;
  rating: number;
  setRating: (n: number) => void;
}) {
  if (type === 'multiple_choice' || type === 'quiz') {
    const isMulti = allowMultiple && type === 'multiple_choice';

    return (
      <div className="space-y-3">
        {options.map((opt, i) => {
          const isSelected = selectedOptions.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onToggleOption(i)}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 flex items-center justify-between ${
                isSelected
                  ? 'border-teal-500 bg-teal-50/70 text-teal-950 shadow-md shadow-teal-500/10 scale-[1.01]'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    isSelected
                      ? 'bg-teal-600 text-white font-black'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {LETTERS[i] || i + 1}
                </span>
                <span className="text-base font-semibold truncate">{opt}</span>
              </div>

              <div
                className={`w-6 h-6 flex items-center justify-center flex-shrink-0 transition-all ${
                  isMulti ? 'rounded-lg' : 'rounded-full'
                } border-2 ${
                  isSelected ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white'
                }`}
              >
                {isSelected && (
                  isMulti ? (
                    <Check size={14} className="stroke-[3]" />
                  ) : (
                    <CheckCircle2 size={14} className="text-white" />
                  )
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (type === 'rating') {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="p-1 transition-all duration-200 hover:scale-125 focus:outline-none"
            >
              <Star
                size={44}
                className={
                  star <= rating
                    ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                    : 'text-slate-300 hover:text-slate-400'
                }
              />
            </button>
          ))}
        </div>
        <p className="text-sm font-semibold text-slate-600">
          {rating > 0 ? `${rating} sur 5 étoiles` : 'Sélectionnez une note'}
        </p>
      </div>
    );
  }

  if (type === 'word_cloud') {
    return (
      <div>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          maxLength={40}
          className="w-full rounded-2xl border-2 border-slate-300 bg-slate-50 p-4 text-xl text-slate-900 text-center font-bold placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all shadow-inner"
          placeholder="Un mot marquant..."
          autoFocus
        />
        <p className="text-xs text-slate-400 text-center mt-2 font-medium">
          {answer.length}/40 caractères
        </p>
      </div>
    );
  }

  // open_text
  return (
    <div>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        maxLength={350}
        rows={4}
        className="w-full rounded-2xl border-2 border-slate-300 bg-slate-50 p-4 text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all resize-none shadow-inner"
        placeholder="Partagez vos idées ou votre question..."
        autoFocus
      />
      <p className="text-xs text-slate-400 text-right mt-1.5 font-mono">
        {answer.length}/350
      </p>
    </div>
  );
}
