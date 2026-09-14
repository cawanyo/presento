import { useEffect, useState, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, ChevronLeft, ChevronRight, Users, Share2, BarChart3, CheckCircle2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Presentation, Question, Response as ResponseType } from '@/lib/types';
import { Button } from '@/components/ui/Button';

interface Props {
  presentationId: string;
  onBack: () => void;
}

export function LivePresentation({ presentationId, onBack }: Props) {
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [responses, setResponses] = useState<ResponseType[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const joinUrl = `${window.location.origin}/#/join/${presentation?.join_code ?? ''}`;

  const fetchAll = useCallback(async () => {
    const { data: pres } = await supabase
      .from('presentations')
      .select('*')
      .eq('id', presentationId)
      .maybeSingle();
    if (pres) {
      setPresentation(pres);
      const idx = pres.current_question_id
        ? 0
        : -1;
      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('presentation_id', presentationId)
        .order('position', { ascending: true });
      if (qs) {
        setQuestions(qs);
        if (pres.current_question_id) {
          const ci = qs.findIndex((q) => q.id === pres.current_question_id);
          setCurrentIdx(ci >= 0 ? ci : 0);
        } else {
          setCurrentIdx(idx);
        }
      }
    }
    const { data: parts } = await supabase
      .from('participants')
      .select('id')
      .eq('presentation_id', presentationId);
    if (parts) setParticipantCount(parts.length);
  }, [presentationId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime subscription
  useEffect(() => {
    if (!presentation || currentIdx < 0 || !questions[currentIdx]) return;
    const questionId = questions[currentIdx].id;

    // Fetch existing responses
    supabase
      .from('responses')
      .select('*')
      .eq('question_id', questionId)
      .then(({ data }) => {
        if (data) setResponses(data);
      });

    // Subscribe to new responses
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel(`responses-${questionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'responses', filter: `question_id=eq.${questionId}` },
        (payload) => {
          setResponses((prev) => [...prev, payload.new as ResponseType]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'participants', filter: `presentation_id=eq.${presentationId}` },
        () => setParticipantCount((c) => c + 1)
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [presentation, currentIdx, questions, presentationId]);

  const updateCurrentQuestion = async (idx: number) => {
    if (!presentation) return;
    const questionId = idx >= 0 && idx < questions.length ? questions[idx].id : null;
    const status = idx >= 0 ? 'active' : presentation.status === 'ended' ? 'ended' : 'draft';
    await supabase
      .from('presentations')
      .update({ current_question_id: questionId, status })
      .eq('id', presentation.id);
    setPresentation({ ...presentation, current_question_id: questionId, status });
    setCurrentIdx(idx);
    setResponses([]);
  };

  const goPrev = () => currentIdx > 0 && updateCurrentQuestion(currentIdx - 1);
  const goNext = () => currentIdx < questions.length - 1 && updateCurrentQuestion(currentIdx + 1);

  const endPresentation = async () => {
    if (!confirm("Terminer la présentation ? Les participants verront l\u2019écran de fin.")) return;
    await supabase
      .from('presentations')
      .update({ current_question_id: null, status: 'ended' })
      .eq('id', presentationId);
    onBack();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!presentation) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentQuestion = currentIdx >= 0 ? questions[currentIdx] : null;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-300 hover:bg-slate-700">
              <ArrowLeft size={16} /> Retour
            </Button>
            <div className="h-6 w-px bg-slate-700" />
            <h1 className="text-base font-semibold text-white truncate">{presentation.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-slate-300 bg-slate-700/50 px-3 py-1.5 rounded-lg">
              <Users size={15} /> {participantCount}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setShowQR(true)}>
              <Share2 size={15} /> Partager
            </Button>
            <Button variant="danger" size="sm" onClick={endPresentation}>
              Terminer
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {currentIdx < 0 ? (
          <div className="text-center max-w-lg">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-teal-500/20 border border-teal-400/30 mb-6">
              <BarChart3 className="text-teal-400" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Prêt à présenter</h2>
            <p className="text-slate-400 mb-6">
              {questions.length} question{questions.length > 1 ? 's' : ''} · {participantCount} participant{participantCount > 1 ? 's' : ''}
            </p>
            <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-4 mb-6">
              <p className="text-sm text-slate-400 mb-2">Code de participation</p>
              <p className="text-3xl font-mono font-bold text-teal-400 tracking-widest">{presentation.join_code}</p>
              <p className="text-xs text-slate-500 mt-2">ou partagez le lien / QR code</p>
            </div>
            <Button size="lg" onClick={() => updateCurrentQuestion(0)} disabled={questions.length === 0}>
              <ChevronRight size={18} /> Démarrer
            </Button>
          </div>
        ) : currentQuestion ? (
          <div className="w-full max-w-3xl">
            <div className="mb-6 text-center">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Question {currentIdx + 1} / {questions.length}
              </span>
              <h2 className="text-3xl font-bold text-white mt-2">{currentQuestion.title}</h2>
            </div>
            <ResultsDisplay question={currentQuestion} responses={responses} />
          </div>
        ) : null}

        {/* Navigation */}
        {currentIdx >= 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={goPrev}
              disabled={currentIdx === 0}
              className="bg-slate-700 hover:bg-slate-600"
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm text-slate-400 px-3">
              {currentIdx + 1} / {questions.length}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={goNext}
              disabled={currentIdx === questions.length - 1}
              className="bg-slate-700 hover:bg-slate-600"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowQR(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 text-center">
            <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Rejoindre la présentation</h3>
            <p className="text-sm text-slate-500 mb-4">Scannez le QR code ou utilisez le code</p>
            <div className="inline-block p-4 bg-white border-2 border-slate-200 rounded-2xl mb-4">
              <QRCodeSVG value={joinUrl} size={200} level="M" />
            </div>
            <div className="rounded-xl bg-slate-50 p-3 mb-3">
              <p className="text-xs text-slate-500 mb-1">Code de participation</p>
              <p className="text-2xl font-mono font-bold text-teal-600 tracking-widest">{presentation.join_code}</p>
            </div>
            <Button variant="outline" size="sm" onClick={copyLink} className="w-full">
              {copied ? 'Lien copié!' : 'Copier le lien'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsDisplay({ question, responses }: { question: Question; responses: ResponseType[] }) {
  if (responses.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 mb-4">
          <Users className="text-slate-500" size={32} />
        </div>
        <p className="text-slate-400 text-lg">En attente des réponses...</p>
        <p className="text-slate-500 text-sm mt-1">{responses.length} réponse{responses.length > 1 ? 's' : ''}</p>
      </div>
    );
  }

  if (question.type === 'multiple_choice' || question.type === 'quiz') {
    const counts: Record<string, number> = {};
    (question.options ?? []).forEach((opt) => (counts[opt] = 0));
    responses.forEach((r) => {
      counts[r.answer] = (counts[r.answer] ?? 0) + 1;
    });
    const total = responses.length;
    const maxCount = Math.max(...Object.values(counts), 1);

    return (
      <div className="space-y-3">
        {(question.options ?? []).map((opt, i) => {
          const count = counts[opt] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isCorrect = question.type === 'quiz' && question.correct_option === i;
          return (
            <div key={i} className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-sm font-medium flex items-center gap-2 ${isCorrect ? 'text-teal-400' : 'text-slate-200'}`}>
                  {isCorrect && <CheckCircle2 size={16} />}
                  {opt}
                </span>
                <span className="text-sm text-slate-400 font-mono">{pct}% · {count}</span>
              </div>
              <div className="h-10 rounded-xl bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-xl transition-all duration-500 ease-out ${
                    isCorrect ? 'bg-gradient-to-r from-teal-500 to-teal-400' : 'bg-gradient-to-r from-slate-600 to-slate-500'
                  }`}
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="text-center text-sm text-slate-500 mt-4">{total} réponse{total > 1 ? 's' : ''} au total</p>
      </div>
    );
  }

  if (question.type === 'rating') {
    const ratings = responses.map((r) => parseInt(r.answer, 10)).filter((n) => !isNaN(n));
    const avg = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '—';
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => (dist[r] = (dist[r] ?? 0) + 1));
    const maxDist = Math.max(...Object.values(dist), 1);

    return (
      <div className="text-center">
        <div className="mb-6">
          <span className="text-5xl font-bold text-teal-400">{avg}</span>
          <span className="text-2xl text-slate-500">/5</span>
        </div>
        <div className="flex items-end justify-center gap-3 h-40">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex flex-col items-center gap-2">
              <div className="w-16 h-32 flex items-end">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-teal-600 to-teal-400 transition-all duration-500"
                  style={{ height: `${(dist[star] / maxDist) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: star }).map((_, i) => (
                  <span key={i} className="text-teal-400 text-xs">★</span>
                ))}
              </div>
              <span className="text-xs text-slate-500">{dist[star]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (question.type === 'word_cloud') {
    const counts: Record<string, number> = {};
    responses.forEach((r) => {
      const word = r.answer.toLowerCase().trim();
      counts[word] = (counts[word] ?? 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 30);
    const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        {sorted.map(([word, count], i) => {
          const size = 1 + (count / maxCount) * 2.5;
          const opacity = 0.4 + (count / maxCount) * 0.6;
          return (
            <span
              key={i}
              className="font-bold text-teal-400 transition-all duration-500"
              style={{ fontSize: `${size}rem`, opacity }}
            >
              {word}
            </span>
          );
        })}
        {sorted.length === 0 && <p className="text-slate-500">En attente de mots...</p>}
      </div>
    );
  }

  // open_text
  return (
    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
      {responses.map((r, i) => (
        <div key={i} className="rounded-xl bg-slate-800 border border-slate-700 p-4 animate-[fadeIn_0.3s_ease-out]">
          {r.participant_name && (
            <span className="text-xs text-teal-400 font-medium">{r.participant_name}</span>
          )}
          <p className="text-slate-200 text-sm mt-0.5">{r.answer}</p>
        </div>
      ))}
    </div>
  );
}
