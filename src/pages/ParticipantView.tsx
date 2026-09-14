import { useEffect, useState, useCallback, useRef } from 'react';
import { Presentation, ArrowRight, CheckCircle2, Loader2, Users, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Presentation as PresentationType, Question, QuestionType } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Props {
  joinCode: string;
  onExit: () => void;
}

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
      setError('Présentation introuvable. Vérifiez le code.');
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

  const handleJoin = async () => {
    if (!presentation) return;
    await supabase.from('participants').upsert({
      id: participantId,
      presentation_id: presentation.id,
      name: name.trim() || null,
      joined_at: new Date().toISOString(),
    });
    setJoined(true);

    // Subscribe to presentation changes
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

  const fetchCurrentQuestion = async (questionId: string) => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .maybeSingle();
    if (data) setCurrentQuestion(data);
  };

  const handleSubmit = async () => {
    if (!currentQuestion || !presentation) return;
    setSubmitting(true);

    let answerValue = '';
    if (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'quiz') {
      if (selectedOption === null) return;
      answerValue = currentQuestion.options?.[selectedOption] ?? '';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-teal-400" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/20 border border-red-400/30 mb-4">
            <Presentation className="text-red-400" size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Oups</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <Button variant="outline" onClick={onExit} className="bg-white/5 border-white/10 text-white hover:bg-white/10">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-400/30 mb-4">
              <Presentation className="text-teal-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">{presentation?.title}</h1>
            <p className="text-slate-400 text-sm mt-2">Rejoignez la présentation interactive</p>
          </div>
          <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
            <Input
              label="Votre prénom (optionnel)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Marie"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              autoFocus
            />
            <Button onClick={handleJoin} size="lg" className="w-full mt-4">
              Rejoindre <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (presentationEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-teal-500/20 border border-teal-400/30 mb-6">
            <CheckCircle2 className="text-teal-400" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Merci pour votre participation !</h2>
          <p className="text-slate-400 mb-6">La présentation est terminée. À bientôt !</p>
          <Button variant="outline" onClick={onExit} className="bg-white/5 border-white/10 text-white hover:bg-white/10">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-400/30 mb-4">
            <Users className="text-teal-400 animate-pulse" size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">En attente...</h2>
          <p className="text-slate-400 text-sm">La prochaine question va apparaître automatiquement</p>
          <div className="mt-6 flex justify-center">
            <Loader2 className="animate-spin text-teal-400/60" size={24} />
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-teal-500/20 border border-teal-400/30 mb-4">
            <CheckCircle2 className="text-teal-400" size={40} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Réponse envoyée !</h2>
          <p className="text-slate-400 text-sm">En attente de la prochaine question...</p>
          <div className="mt-6 flex justify-center">
            <Loader2 className="animate-spin text-teal-400/60" size={24} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <p className="text-xs font-medium text-teal-400 uppercase tracking-wider mb-2">
            {presentation?.title}
          </p>
          <h2 className="text-2xl font-bold text-white">{currentQuestion.title}</h2>
        </div>

        <AnswerInput
          type={currentQuestion.type}
          options={currentQuestion.options}
          selectedOption={selectedOption}
          setSelectedOption={setSelectedOption}
          answer={answer}
          setAnswer={setAnswer}
          rating={rating}
          setRating={setRating}
          correctOption={currentQuestion.correct_option}
        />

        <Button
          onClick={handleSubmit}
          size="lg"
          className="w-full mt-6"
          disabled={
            submitting ||
            ((currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'quiz') && selectedOption === null) ||
            (currentQuestion.type === 'rating' && rating === 0) ||
            ((currentQuestion.type === 'word_cloud' || currentQuestion.type === 'open_text') && !answer.trim())
          }
        >
          {submitting ? 'Envoi...' : 'Envoyer ma réponse'}
        </Button>
      </div>
    </div>
  );
}

function AnswerInput({
  type,
  options,
  selectedOption,
  setSelectedOption,
  answer,
  setAnswer,
  rating,
  setRating,
  correctOption,
}: {
  type: QuestionType;
  options: string[] | null;
  selectedOption: number | null;
  setSelectedOption: (n: number | null) => void;
  answer: string;
  setAnswer: (s: string) => void;
  rating: number;
  setRating: (n: number) => void;
  correctOption: number | null;
}) {
  if (type === 'multiple_choice' || type === 'quiz') {
    return (
      <div className="space-y-3">
        {(options ?? []).map((opt, i) => (
          <button
            key={i}
            onClick={() => setSelectedOption(i)}
            className={`w-full text-left rounded-xl border-2 px-5 py-4 text-sm font-medium transition-all duration-200 ${
              selectedOption === i
                ? 'border-teal-500 bg-teal-500/20 text-white'
                : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selectedOption === i ? 'border-teal-400 bg-teal-400' : 'border-slate-500'
              }`}>
                {selectedOption === i && <CheckCircle2 size={14} className="text-slate-900" />}
              </div>
              {opt}
            </div>
          </button>
        ))}
      </div>
    );
  }

  if (type === 'rating') {
    return (
      <div className="flex items-center justify-center gap-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className="transition-all duration-200 hover:scale-110"
          >
            <Star
              size={48}
              className={star <= rating ? 'text-teal-400 fill-teal-400' : 'text-slate-600'}
            />
          </button>
        ))}
      </div>
    );
  }

  if (type === 'word_cloud') {
    return (
      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        maxLength={50}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-lg text-white text-center placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
        placeholder="Tapez un mot..."
        autoFocus
      />
    );
  }

  // open_text
  return (
    <textarea
      value={answer}
      onChange={(e) => setAnswer(e.target.value)}
      maxLength={500}
      rows={4}
      className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all resize-none"
      placeholder="Écrivez votre réponse..."
      autoFocus
    />
  );
}
