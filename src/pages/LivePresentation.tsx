import React, { useEffect, useState, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Users,
  Share2,
  BarChart3,
  AlignLeft,
  AlignCenter,
  PieChart,
  LayoutGrid,
  Cloud,
  CircleDot,
  Trophy,
  Star,
  Gauge,
  Tv,
  List,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Sparkles,
  Maximize2,
  Minimize2,
  Palette,
  X,
  Radio,
  QrCode,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type {
  Presentation,
  Question,
  Response as ResponseType,
  ChartLayout,
  ThemeId,
} from '@/lib/types';
import {
  THEMES,
  LAYOUT_OPTIONS,
  parseQuestionConfig,
  getEffectiveQuestionType,
} from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { QuestionVisualization } from '@/components/visualizations/QuestionVisualization';

interface Props {
  presentationId: string;
  onBack: () => void;
}

const LAYOUT_ICONS: Record<string, LucideIcon> = {
  BarChart3,
  AlignLeft,
  AlignCenter,
  PieChart,
  LayoutGrid,
  Cloud,
  CircleDot,
  Trophy,
  Star,
  Gauge,
  Tv,
  List,
};

export function LivePresentation({ presentationId, onBack }: Props) {
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [responses, setResponses] = useState<ResponseType[]>([]);
  const [participantCount, setParticipantCount] = useState(0);

  // Presenter Controls
  const [activeLayout, setActiveLayout] = useState<ChartLayout>('bars');
  const [hideResults, setHideResults] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [revealedQuiz, setRevealedQuiz] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('minimal');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCornerQR, setShowCornerQR] = useState(true); // Right-side QR switch
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('presentation_id', presentationId)
        .order('position', { ascending: true });

      if (qs && qs.length > 0) {
        const normalizedQs = qs.map((q) => ({
          ...q,
          type: getEffectiveQuestionType(q),
        }));
        setQuestions(normalizedQs);
        if (pres.current_question_id) {
          const ci = normalizedQs.findIndex((q) => q.id === pres.current_question_id);
          const initialIndex = ci >= 0 ? ci : 0;
          setCurrentIdx(initialIndex);
          const cfg = parseQuestionConfig(normalizedQs[initialIndex]);
          setActiveLayout(cfg.layout);
        } else {
          setCurrentIdx(-1);
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

  // Handle browser back button (comeback) & page unload
  useEffect(() => {
    // Push dummy history entry so back button triggers popstate without leaving
    window.history.pushState({ inLivePresentation: true }, '');

    const handlePopState = () => {
      // User pressed back button in browser
      window.history.pushState({ inLivePresentation: true }, '');
      setShowExitConfirm(true);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Track fullscreen state change
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleConfirmExit = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {}
    }
    setShowExitConfirm(false);
    onBack();
  };

  // Realtime subscription for votes and presentation events
  useEffect(() => {
    if (!presentation || currentIdx < 0 || !questions[currentIdx]) return;
    const currentQ = questions[currentIdx];
    const questionId = currentQ.id;

    // Reset layout and reveal state for the new question
    const config = parseQuestionConfig(currentQ);
    setActiveLayout(config.layout);
    setRevealedQuiz(false);

    // Fetch existing responses
    supabase
      .from('responses')
      .select('*')
      .eq('question_id', questionId)
      .then(({ data }) => {
        if (data) setResponses(data);
      });

    // Setup channel
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel(`live-${presentationId}`)
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

  // Update current question
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
    setRevealedQuiz(false);
    setIsLocked(false);

    if (idx >= 0 && questions[idx]) {
      const cfg = parseQuestionConfig(questions[idx]);
      setActiveLayout(cfg.layout);
    }
  };

  const goPrev = () => currentIdx > 0 && updateCurrentQuestion(currentIdx - 1);
  const goNext = () => currentIdx < questions.length - 1 && updateCurrentQuestion(currentIdx + 1);

  // Switch layout on the fly and optionally persist
  const handleSelectLayout = async (layout: ChartLayout) => {
    setActiveLayout(layout);
    const currentQ = questions[currentIdx];
    if (!currentQ) return;

    // Persist layout to question options
    const cfg = parseQuestionConfig(currentQ);
    const newOptions = {
      choices: cfg.choices,
      layout,
    };

    await supabase
      .from('questions')
      .update({ options: newOptions })
      .eq('id', currentQ.id);

    // Update in local state
    setQuestions((prev) =>
      prev.map((q) => (q.id === currentQ.id ? { ...q, options: newOptions } : q))
    );
  };

  // Reveal quiz answer with confetti
  const handleRevealQuiz = () => {
    if (revealedQuiz) return;
    setRevealedQuiz(true);
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#a855f7'],
    });
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (currentIdx < questions.length - 1) goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIdx > 0) goPrev();
      } else if (e.key.toLowerCase() === 'h') {
        setHideResults((prev) => !prev);
      } else if (e.key.toLowerCase() === 'l') {
        setIsLocked((prev) => !prev);
      } else if (e.key.toLowerCase() === 'r') {
        handleRevealQuiz();
      } else if (e.key.toLowerCase() === 'c') {
        setShowCornerQR((prev) => !prev);
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIdx, questions.length, revealedQuiz]);

  const endPresentation = () => {
    setShowEndConfirm(true);
  };

  const handleConfirmEnd = async () => {
    await supabase
      .from('presentations')
      .update({ current_question_id: null, status: 'ended' })
      .eq('id', presentationId);
    setShowEndConfirm(false);
    onBack();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const theme = THEMES[currentTheme];
  const isWhiteTheme = currentTheme === 'minimal';

  if (!presentation) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentQuestion = currentIdx >= 0 ? questions[currentIdx] : null;
  const availableLayouts = currentQuestion ? LAYOUT_OPTIONS[currentQuestion.type] || [] : [];

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${theme.bgGradient} flex flex-col select-none transition-colors duration-500 overflow-x-hidden relative ${
        isWhiteTheme ? 'text-slate-800' : 'text-slate-100'
      }`}
    >
      {/* ── Top Header: Menti Style Banner ────────────────────────── */}
      <header
        className={`border-b sticky top-0 z-30 shadow-xs backdrop-blur-md ${
          isWhiteTheme
            ? 'bg-white/95 border-slate-200'
            : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Left: Back and Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExitConfirm(true)}
              className={`-ml-2 ${
                isWhiteTheme
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ArrowLeft size={16} /> <span className="hidden sm:inline">Retour</span>
            </Button>
            <div className={`h-4 w-px hidden sm:block ${isWhiteTheme ? 'bg-slate-200' : 'bg-slate-700'}`} />
            <h1 className={`text-sm font-bold truncate max-w-[180px] sm:max-w-xs ${isWhiteTheme ? 'text-slate-900' : 'text-white'}`}>
              {presentation.title}
            </h1>
          </div>

          {/* Center: Iconic Mentimeter Join Banner */}
          <div
            onClick={() => setShowQRModal(true)}
            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 rounded-full cursor-pointer transition-all shadow-xs group border ${
              isWhiteTheme
                ? 'bg-slate-50 border-slate-200 hover:border-teal-500 hover:bg-slate-100'
                : 'bg-slate-800/90 border-slate-700/80 hover:border-teal-400/50'
            }`}
            title="Cliquer pour agrandir le QR Code"
          >
            <span className={`text-xs hidden md:inline ${isWhiteTheme ? 'text-slate-500' : 'text-slate-300'}`}>
              Rejoindre sur
            </span>
            <span className="text-xs sm:text-sm font-bold text-teal-600 underline decoration-teal-500/50 underline-offset-2">
              {window.location.host}
            </span>
            <span className="text-slate-300 hidden sm:inline">·</span>
            <span className={`text-xs ${isWhiteTheme ? 'text-slate-500' : 'text-slate-400'}`}>Code :</span>
            <span
              className={`text-sm sm:text-base font-mono font-black tracking-widest px-2 py-0.5 rounded-md border ${
                isWhiteTheme
                  ? 'bg-white text-slate-900 border-slate-200'
                  : 'bg-slate-900/80 text-white border-slate-700'
              }`}
            >
              {presentation.join_code}
            </span>
            <Share2 size={13} className="text-teal-600 group-hover:scale-110 transition-transform ml-0.5" />
          </div>

          {/* Right: Controls & Info */}
          <div className="flex items-center gap-2">
            {/* Live Participants count */}
            <div
              className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl border shadow-xs ${
                isWhiteTheme
                  ? 'bg-slate-50 text-slate-700 border-slate-200'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700'
              }`}
              title={`${participantCount} participant(s) connecté(s)`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Users size={14} className="text-slate-400" />
              <span>{participantCount}</span>
            </div>

            {/* Theme Picker Button */}
            <div className="relative">
              <button
                onClick={() => setShowThemePicker(!showThemePicker)}
                className={`p-2 rounded-xl border transition-colors ${
                  isWhiteTheme
                    ? 'text-slate-600 hover:bg-slate-100 border-slate-200'
                    : 'text-slate-300 hover:bg-slate-800 border-slate-700'
                }`}
                title="Changer le thème visuel"
              >
                <Palette size={16} />
              </button>

              {showThemePicker && (
                <div
                  className={`absolute right-0 mt-2 w-48 rounded-2xl border shadow-2xl p-2 z-50 animate-in fade-in ${
                    isWhiteTheme
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-900 border-slate-700'
                  }`}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1 mb-1">
                    Thèmes d'affichage
                  </p>
                  {(Object.keys(THEMES) as ThemeId[]).map((tid) => {
                    const th = THEMES[tid];
                    return (
                      <button
                        key={tid}
                        onClick={() => {
                          setCurrentTheme(tid);
                          setShowThemePicker(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                          currentTheme === tid
                            ? 'bg-teal-50 text-teal-700'
                            : isWhiteTheme
                            ? 'text-slate-700 hover:bg-slate-50'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{th.name}</span>
                        {currentTheme === tid && <span className="w-2 h-2 rounded-full bg-teal-500" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-xl border transition-colors hidden sm:block ${
                isWhiteTheme
                  ? 'text-slate-600 hover:bg-slate-100 border-slate-200'
                  : 'text-slate-300 hover:bg-slate-800 border-slate-700'
              }`}
              title="Plein écran (F)"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* End button */}
            <Button variant="danger" size="sm" onClick={endPresentation} className="text-xs px-2.5 py-1.5">
              Fin
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Presentation Stage ───────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative">
        {/* ── Right-Side Corner QR Code with Switch ────────────────── */}
        <div className="absolute top-4 right-4 z-20 hidden md:block">
          {showCornerQR ? (
            <div
              className={`rounded-2xl p-3 border shadow-lg flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 transition-all ${
                isWhiteTheme
                  ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/60'
                  : 'bg-slate-900/95 border-slate-700 text-white'
              }`}
            >
              {/* Header with hide switch */}
              <div className="flex items-center justify-between w-full gap-2 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  QR Code
                </span>
                {/* Switch button */}
                <button
                  onClick={() => setShowCornerQR(false)}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Masquer le QR code (touche C)"
                >
                  <span>Cacher</span>
                  <div className="w-6 h-3.5 bg-teal-500 rounded-full p-0.5 flex justify-end">
                    <div className="w-2.5 h-2.5 bg-white rounded-full shadow-xs" />
                  </div>
                </button>
              </div>

              {/* Scannable QR SVG */}
              <div
                onClick={() => setShowQRModal(true)}
                className="p-1.5 bg-white rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:scale-105 transition-transform"
                title="Cliquer pour agrandir"
              >
                <QRCodeSVG value={joinUrl} size={92} level="M" />
              </div>

              {/* PIN Code badge */}
              <div className="text-center">
                <span className="font-mono font-black text-xs text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md tracking-wider">
                  {presentation.join_code}
                </span>
              </div>
            </div>
          ) : (
            /* Collapsed toggle button */
            <button
              onClick={() => setShowCornerQR(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm text-xs font-bold transition-all ${
                isWhiteTheme
                  ? 'bg-white/90 hover:bg-white text-slate-700 border-slate-200 hover:border-teal-500'
                  : 'bg-slate-900/90 hover:bg-slate-900 text-slate-200 border-slate-700'
              }`}
              title="Afficher le QR code (touche C)"
            >
              <QrCode size={14} className="text-teal-600" />
              <span>Afficher le QR</span>
              <div className="w-5 h-3 bg-slate-300 rounded-full p-0.5 flex justify-start">
                <div className="w-2 h-2 bg-white rounded-full shadow-xs" />
              </div>
            </button>
          )}
        </div>

        {currentIdx < 0 ? (
          /* Lobby Screen (Before starting) */
          <div className="text-center max-w-lg animate-in zoom-in-95 duration-300">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-teal-50 text-teal-600 border-2 border-teal-200 mb-6 shadow-xl shadow-teal-500/10">
              <Radio className="text-teal-600 animate-pulse" size={48} />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tight">
              Prêt à présenter
            </h2>
            <p className="text-slate-500 text-base mb-8">
              {questions.length} question{questions.length > 1 ? 's' : ''} interactive{questions.length > 1 ? 's' : ''} · {participantCount} participant{participantCount > 1 ? 's' : ''} connecté{participantCount > 1 ? 's' : ''}
            </p>

            {/* Big Join Card */}
            <div className="rounded-3xl bg-white border-2 border-slate-200 p-8 mb-8 shadow-xl">
              <p className="text-sm font-semibold text-slate-500 mb-2">Rejoignez sur smartphone :</p>
              <p className="text-xl font-bold text-teal-600 mb-4 underline">{window.location.host}</p>
              <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 px-8 inline-block shadow-inner">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-bold">Code PIN</p>
                <p className="text-4xl sm:text-5xl font-mono font-black text-slate-900 tracking-widest">
                  {presentation.join_code}
                </p>
              </div>
            </div>

            <Button
              size="lg"
              onClick={() => updateCurrentQuestion(0)}
              disabled={questions.length === 0}
              className="text-base px-8 py-4 bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-xl shadow-teal-600/20"
            >
              <ChevronRight size={20} /> Lancer la présentation
            </Button>
          </div>
        ) : currentQuestion ? (
          /* Active Slide Question */
          <div className="w-full max-w-5xl flex flex-col items-center">
            {/* Question Header & Type badge */}
            <div className="mb-6 text-center max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200/80 px-3.5 py-1 rounded-full text-xs font-bold text-teal-800 mb-3 shadow-xs">
                <span>{currentQuestion.type === 'text_slide' ? 'Slide' : 'Question'} {currentIdx + 1} sur {questions.length}</span>
                {currentQuestion.type === 'quiz' && (
                  <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                    Quiz
                  </span>
                )}
                {currentQuestion.type === 'text_slide' && (
                  <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                    Contenu
                  </span>
                )}
                {parseQuestionConfig(currentQuestion).allowMultiple && (
                  <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                    {currentQuestion.type === 'multiple_choice' ? 'Choix multiples' : 'Réponses multiples'}
                  </span>
                )}
              </div>

              {currentQuestion.type !== 'text_slide' && (
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                  {currentQuestion.title}
                </h2>
              )}
            </div>

            {/* Quick Switch Layout Toolbar (Menti Style) */}
            {availableLayouts.length > 1 && (
              <div
                className={`mb-6 flex items-center gap-1.5 p-1 rounded-2xl border shadow-xs ${
                  isWhiteTheme
                    ? 'bg-slate-100 border-slate-200'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                {availableLayouts.map((lo) => {
                  const Icon = LAYOUT_ICONS[lo.icon] || BarChart3;
                  const isSelected = activeLayout === lo.id;
                  return (
                    <button
                      key={lo.id}
                      onClick={() => handleSelectLayout(lo.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-teal-600 text-white shadow-sm'
                          : isWhiteTheme
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title={`Afficher en : ${lo.label}`}
                    >
                      <Icon size={14} />
                      <span className="hidden sm:inline">{lo.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quiz Action: Reveal correct answer */}
            {currentQuestion.type === 'quiz' && currentQuestion.correct_option !== null && (
              <div className="mb-4">
                <Button
                  onClick={handleRevealQuiz}
                  variant={revealedQuiz ? 'outline' : 'primary'}
                  size="sm"
                  className={
                    revealedQuiz
                      ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-lg shadow-emerald-600/20'
                  }
                >
                  <Sparkles size={16} />
                  {revealedQuiz ? 'Bonne réponse révélée !' : 'Révéler la bonne réponse'}
                </Button>
              </div>
            )}

            {/* Visualization Rendering */}
            <div className="w-full">
              <QuestionVisualization
                question={currentQuestion}
                responses={responses}
                activeLayout={activeLayout}
                revealedQuiz={revealedQuiz}
                hideResults={hideResults}
              />
            </div>
          </div>
        ) : null}

        {/* Presenter Floating Control Deck (Bottom Bar) */}
        {currentIdx >= 0 && (
          <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-2xl border shadow-xl backdrop-blur-md ${
              isWhiteTheme
                ? 'bg-white/95 border-slate-200 text-slate-700 shadow-slate-200/50'
                : 'bg-slate-900/90 border-slate-700/80 text-slate-300'
            }`}
          >
            {/* Prev Question */}
            <button
              onClick={goPrev}
              disabled={currentIdx === 0}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              title="Question précédente (←)"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Indicator */}
            <span className="text-xs font-mono font-bold text-slate-800 px-2">
              {currentIdx + 1} / {questions.length}
            </span>

            {/* Next Question */}
            <button
              onClick={goNext}
              disabled={currentIdx === questions.length - 1}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              title="Question suivante (→ ou Espace)"
            >
              <ChevronRight size={18} />
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1" />

            {/* Hide / Show results */}
            <button
              onClick={() => setHideResults(!hideResults)}
              className={`p-2 rounded-xl transition-colors ${
                hideResults
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={hideResults ? 'Afficher les résultats (H)' : 'Masquer les résultats (H)'}
            >
              {hideResults ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {/* Lock / Unlock voting */}
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`p-2 rounded-xl transition-colors ${
                isLocked
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={isLocked ? 'Déverrouiller les votes (L)' : 'Verrouiller les votes (L)'}
            >
              {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
            </button>

            {/* Corner QR toggle from deck */}
            <button
              onClick={() => setShowCornerQR(!showCornerQR)}
              className={`p-2 rounded-xl transition-colors ${
                showCornerQR
                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={showCornerQR ? 'Masquer le QR en haut à droite (C)' : 'Afficher le QR en haut à droite (C)'}
            >
              <QrCode size={18} />
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Discrete Keyboard Hint */}
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline px-1">
              [Espace: Suivant · H: Masquer · L: Bloquer · C: QR]
            </span>
          </div>
        )}
      </main>

      {/* Big QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowQRModal(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 p-8 text-center shadow-2xl animate-in zoom-in-95">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black text-slate-900 mb-1">Rejoindre la présentation</h3>
            <p className="text-xs text-slate-500 mb-6">
              Scannez avec votre smartphone pour voter en direct
            </p>

            <div className="inline-block p-4 bg-white rounded-3xl shadow-lg border-2 border-slate-200 mb-6">
              <QRCodeSVG value={joinUrl} size={220} level="H" />
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 mb-5">
              <p className="text-xs text-slate-500 mb-1 font-semibold">Code de participation</p>
              <p className="text-3xl sm:text-4xl font-mono font-black text-teal-700 tracking-widest">
                {presentation.join_code}
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={copyLink} className="w-full text-slate-700 border-slate-300 hover:bg-slate-50">
              {copied ? '✓ Lien copié dans le presse-papier !' : 'Copier le lien direct'}
            </Button>
          </div>
        </div>
      )}

      {/* End Presentation Confirmation Modal */}
      <ConfirmModal
        open={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={handleConfirmEnd}
        title="Terminer la présentation"
        message="Êtes-vous sûr de vouloir terminer la présentation ? Les participants verront l’écran de fin et les votes seront clos."
        confirmText="Terminer la session"
        cancelText="Continuer la présentation"
        variant="warning"
      />

      {/* Exit Presentation Confirmation Modal (Browser comeback / Back button) */}
      <ConfirmModal
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={handleConfirmExit}
        title="Quitter la présentation en cours ?"
        message="Vous êtes actuellement en direct. Voulez-vous vraiment quitter la présentation ? Les participants connectés resteront en attente."
        confirmText="Quitter la présentation"
        cancelText="Continuer à présenter"
        variant="warning"
      />
    </div>
  );
}
