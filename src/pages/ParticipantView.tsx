import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Presentation, ArrowRight, CheckCircle2, Loader2, Users, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Presentation as PresentationType, Question, QuestionType } from '@/lib/types';
import { parseQuestionConfig, MENTI_COLORS } from '@/lib/types';
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
  const [presentation, setPresentation] = useState<PresentationType | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answer, setAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [presentationEnded, setPresentationEnded] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const participantId = useRef(getOrCreateParticipantId()).current;

  const fetchPresentation = useCallback(async () => {
    const { data, error } = await supabase
      .from('presentations')
      .select('*')
      .eq('join_code', joinCode.toUpperCase())
      .maybeSingle();
    if (error || !data) {
      setError('Présentation introuvable. Vérifiez le code PIN saisi.');
      setLoading(false);
      return;
    }
    setPresentation(data);
    if (data.status === 'ended') {
      setPresentationEnded(true);
    }
    setLoading(false);
  }, [joinCode]);

  useEffect(() => {
    fetchPresentation();
  }, [fetchPresentation]);

  const fetchCurrentQuestion = useCallback(async (questionId: string) => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .maybeSingle();
    if (data) setCurrentQuestion(data);
  }, []);

  const handleJoin = async () => {
    if (!presentation) return;
    await supabase.from('participants').upsert({
      id: participantId,
      presentation_id: presentation.id,
      name: name.trim() || null,
      joined_at: new Date().toISOString(),
    });
    setJoined(true);

    // Subscribe to presentation updates (slide change, ended)
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel(`participant-${presentation.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'presentations', filter: `id=eq.${presentation.id}` },
        (payload) => {
          const updated = payload.new as PresentationType;
          setPresentation(updated);
          setPresentationEnded(updated.status === 'ended');
          if (updated.current_question_id) {
            fetchCurrentQuestion(updated.current_question_id);
          } else {
            setCurrentQuestion(null);
          }
          setSubmitted(false);
          setAnswer('');
          setSelectedOption(null);
          setRating(0);
        }
      )
      .subscribe();
    channelRef.current = channel;

    // Fetch current question if already active
    if (presentation.current_question_id) {
      fetchCurrentQuestion(presentation.current_question_id);
    }
  };

  const handleSubmit = async () => {
    if (!currentQuestion || !presentation) return;
    setSubmitting(true);

    const { choices } = parseQuestionConfig(currentQuestion);

    let answerValue = '';
    if (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'quiz') {
      if (selectedOption === null) return;
      answerValue = choices[selectedOption] ?? '';
    } else if (currentQuestion.type === 'rating') {
      if (rating === 0) return;
      answerValue = String(rating);
    } else {
      if (!answer.trim()) return;
      answerValue = answer.trim();
    }

    await supabase.from('responses').insert({
      question_id: currentQuestion.id,
      participant_id: participantId,
      participant_name: name.trim() || null,
      answer: answerValue,
    });

    setSubmitted(true);
    setSubmitting(false);
  };

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

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
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-xs animate-in zoom-in-95">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 border-2 border-emerald-200 mb-4 shadow-sm">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Vote enregistré !</h2>
          <p className="text-slate-500 text-sm mb-6">
            Votre réponse s'affiche en direct sur l'écran du présentateur.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-4 py-2 rounded-full">
            <Loader2 className="animate-spin" size={14} />
            <span>En attente de la suite...</span>
          </div>
        </div>
      </div>
    );
  }

  // Step 5: Answer current question
  const { choices } = parseQuestionConfig(currentQuestion);

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
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600 mb-2 inline-block">
            {currentQuestion.type === 'quiz' ? '⚡ Question Quiz' : 'Votre avis'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
            {currentQuestion.title}
          </h2>
        </div>

        <ParticipantInput
          type={currentQuestion.type}
          options={choices}
          selectedOption={selectedOption}
          setSelectedOption={setSelectedOption}
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
            ((currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'quiz') && selectedOption === null) ||
            (currentQuestion.type === 'rating' && rating === 0) ||
            ((currentQuestion.type === 'word_cloud' || currentQuestion.type === 'open_text') && !answer.trim())
          }
        >
          {submitting ? 'Envoi...' : 'Valider mon vote'}
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
  selectedOption,
  setSelectedOption,
  answer,
  setAnswer,
  rating,
  setRating,
}: {
  type: QuestionType;
  options: string[];
  selectedOption: number | null;
  setSelectedOption: (n: number | null) => void;
  answer: string;
  setAnswer: (s: string) => void;
  rating: number;
  setRating: (n: number) => void;
}) {
  if (type === 'multiple_choice' || type === 'quiz') {
    return (
      <div className="space-y-3">
        {options.map((opt, i) => {
          const isSelected = selectedOption === i;
          return (
            <button
              key={i}
              onClick={() => setSelectedOption(i)}
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
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'border-teal-600 bg-teal-600' : 'border-slate-300'
                }`}
              >
                {isSelected && <CheckCircle2 size={14} className="text-white" />}
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
