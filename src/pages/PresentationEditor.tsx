import React, { useEffect, useState, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  Check,
  ListChecks,
  HelpCircle,
  Cloud,
  Edit3,
  Star,
  BarChart3,
  AlignLeft,
  PieChart,
  LayoutGrid,
  CircleDot,
  Trophy,
  Gauge,
  Tv,
  List,
  Sparkles,
  Palette,
  Monitor,
  X,
  Share2,
  QrCode,
  CheckSquare,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import type {
  Presentation,
  Question,
  QuestionType,
  ChartLayout,
  Response as ResponseType,
  ThemeId,
} from '@/lib/types';
import {
  QUESTION_TYPES,
  LAYOUT_OPTIONS,
  THEMES,
  parseQuestionConfig,
  getDefaultLayout,
} from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Toast } from '@/components/ui/Toast';
import { QuestionVisualization } from '@/components/visualizations/QuestionVisualization';

interface Props {
  presentationId: string;
  onBack: () => void;
  onPresent: (id: string) => void;
}

const typeIcons: Record<string, typeof ListChecks> = {
  multiple_choice: ListChecks,
  quiz: HelpCircle,
  word_cloud: Cloud,
  open_text: Edit3,
  rating: Star,
};

const layoutIcons: Record<string, typeof BarChart3> = {
  bars: BarChart3,
  horizontal_bars: AlignLeft,
  donut: PieChart,
  cards: LayoutGrid,
  word_cloud: Cloud,
  bubbles: CircleDot,
  ranking: Trophy,
  stars: Star,
  gauge: Gauge,
  wall: LayoutGrid,
  spotlight: Tv,
  list: List,
};

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// Helper to generate realistic mock responses for instant live preview
function generateMockResponses(question: Question): ResponseType[] {
  const { choices } = parseQuestionConfig(question);

  if (question.type === 'multiple_choice' || question.type === 'quiz') {
    const counts = [24, 38, 15, 8, 19, 11, 27, 13];
    const res: ResponseType[] = [];
    choices.forEach((c, idx) => {
      const num = counts[idx % counts.length] || 12;
      for (let i = 0; i < num; i++) {
        res.push({
          id: `mock_${idx}_${i}`,
          question_id: question.id,
          participant_id: `p_${i}`,
          participant_name: null,
          answer: c,
          created_at: new Date().toISOString(),
        });
      }
    });
    return res;
  }

  if (question.type === 'word_cloud') {
    const sampleWords = [
      { w: 'Interactif', c: 15 },
      { w: 'Dynamique', c: 12 },
      { w: 'Équipe', c: 9 },
      { w: 'Innovation', c: 8 },
      { w: 'Mentimeter', c: 7 },
      { w: 'Super', c: 6 },
      { w: 'Engagement', c: 6 },
      { w: 'Moderne', c: 5 },
      { w: 'Fluide', c: 4 },
      { w: 'Créatif', c: 4 },
    ];
    const res: ResponseType[] = [];
    sampleWords.forEach(({ w, c }, idx) => {
      for (let i = 0; i < c; i++) {
        res.push({
          id: `mock_wc_${idx}_${i}`,
          question_id: question.id,
          participant_id: `p_${i}`,
          participant_name: null,
          answer: w,
          created_at: new Date().toISOString(),
        });
      }
    });
    return res;
  }

  if (question.type === 'rating') {
    const scores = [5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 3, 3, 2];
    return scores.map((s, i) => ({
      id: `mock_r_${i}`,
      question_id: question.id,
      participant_id: `p_${i}`,
      participant_name: null,
      answer: String(s),
      created_at: new Date().toISOString(),
    }));
  }

  if (question.type === 'open_text') {
    return [
      { id: '1', question_id: question.id, participant_id: 'p1', participant_name: 'Camille', answer: 'Une interface très élégante et réactive !', created_at: '' },
      { id: '2', question_id: question.id, participant_id: 'p2', participant_name: 'Thomas', answer: 'Les animations et le donut chart rendent super bien.', created_at: '' },
      { id: '3', question_id: question.id, participant_id: 'p3', participant_name: 'Sarah', answer: 'Très intuitif pour les participants sur smartphone.', created_at: '' },
    ];
  }

  return [];
}

export function PresentationEditor({ presentationId, onBack, onPresent }: Props) {
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');

  // Preview options
  const [previewTheme, setPreviewTheme] = useState<ThemeId>('minimal');
  const [useMockData, setUseMockData] = useState(true);
  const [previewRevealedQuiz, setPreviewRevealedQuiz] = useState(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCornerQR, setShowCornerQR] = useState(true); // Right-side QR switch
  const [questionToDelete, setQuestionToDelete] = useState<number | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAll = useCallback(async () => {
    const { data: pres } = await supabase
      .from('presentations')
      .select('*')
      .eq('id', presentationId)
      .maybeSingle();

    if (pres) {
      setPresentation(pres);
      setTitle(pres.title);
    }

    const { data: qs } = await supabase
      .from('questions')
      .select('*')
      .eq('presentation_id', presentationId)
      .order('position', { ascending: true });

    if (qs) {
      setQuestions(qs);
      if (qs.length > 0 && activeIdx >= qs.length) {
        setActiveIdx(0);
      }
    }
    setLoading(false);
  }, [presentationId, activeIdx]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Debounced save for question changes
  const queueQuestionSave = (updatedQuestion: Question) => {
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      await supabase
        .from('questions')
        .update({
          title: updatedQuestion.title,
          type: updatedQuestion.type,
          options: updatedQuestion.options,
          correct_option: updatedQuestion.correct_option,
        })
        .eq('id', updatedQuestion.id);

      setSaveStatus('saved');
    }, 400);
  };

  const handleTitleBlur = async () => {
    if (!presentation || !title.trim()) return;
    setSaveStatus('saving');
    await supabase.from('presentations').update({ title: title.trim() }).eq('id', presentation.id);
    setPresentation({ ...presentation, title: title.trim() });
    setSaveStatus('saved');
  };

  const activeQuestion = questions[activeIdx] || null;

  // Question manipulation helpers
  const handleUpdateActiveQuestion = (patch: Partial<Question>) => {
    if (!activeQuestion) return;
    const updated = { ...activeQuestion, ...patch };
    const newQuestions = [...questions];
    newQuestions[activeIdx] = updated;
    setQuestions(newQuestions);
    queueQuestionSave(updated);
  };

  const handleAddQuestion = async () => {
    setSaveStatus('saving');
    const defaultType: QuestionType = 'multiple_choice';
    const defaultLayout = getDefaultLayout(defaultType);

    const { data, error } = await supabase
      .from('questions')
      .insert({
        presentation_id: presentationId,
        type: defaultType,
        title: 'Nouvelle question',
        options: {
          choices: ['Option 1', 'Option 2'],
          layout: defaultLayout,
          allowMultiple: false,
        },
        correct_option: null,
        position: questions.length,
      })
      .select()
      .single();

    if (data && !error) {
      const newQs = [...questions, data];
      setQuestions(newQs);
      setActiveIdx(newQs.length - 1);
      setSaveStatus('saved');
    }
  };

  const handleDeleteQuestion = (idxToDelete: number) => {
    setQuestionToDelete(idxToDelete);
  };

  const handleConfirmDeleteQuestion = async () => {
    if (questionToDelete === null) return;
    const q = questions[questionToDelete];
    if (!q) return;

    setDeletingQuestion(true);
    await supabase.from('questions').delete().eq('id', q.id);

    const newQs = questions.filter((_, i) => i !== questionToDelete);
    setQuestions(newQs);

    if (activeIdx >= newQs.length) {
      setActiveIdx(Math.max(0, newQs.length - 1));
    }
    setDeletingQuestion(false);
    setQuestionToDelete(null);
  };

  const handleMoveQuestion = async (index: number, dir: -1 | 1) => {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const newQs = [...questions];
    [newQs[index], newQs[targetIdx]] = [newQs[targetIdx], newQs[index]];
    setQuestions(newQs);
    setActiveIdx(targetIdx);

    // Save positions
    for (let i = 0; i < newQs.length; i++) {
      await supabase.from('questions').update({ position: i }).eq('id', newQs[i].id);
    }
  };

  // Test quiz confetti
  const handleTestConfetti = () => {
    setPreviewRevealedQuiz(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#a855f7'],
    });
  };

  const themeConfig = THEMES[previewTheme];
  const joinUrl = `${window.location.origin}/#/join/${presentation?.join_code ?? ''}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800 select-none">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 z-20 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 -ml-2"
          >
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Retour</span>
          </Button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Editable presentation title */}
          <div className="flex items-center gap-2 flex-1 min-w-0 max-w-md">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white px-2 py-1 rounded-lg border border-transparent focus:border-slate-300 outline-none transition-colors truncate w-full text-sm sm:text-base"
              title="Cliquer pour renommer la présentation"
            />
            {saveStatus === 'saving' ? (
              <span className="text-[11px] text-slate-400 font-mono animate-pulse flex-shrink-0">
                Enregistrement...
              </span>
            ) : saveStatus === 'saved' ? (
              <span className="text-[11px] text-teal-600 font-mono flex items-center gap-1 flex-shrink-0 font-semibold">
                <Check size={12} /> Sauvegardé
              </span>
            ) : null}
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Mobile view toggle (Editor vs Preview) */}
          <div className="flex lg:hidden bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            <button
              onClick={() => setMobileTab('editor')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                mobileTab === 'editor' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Éditer
            </button>
            <button
              onClick={() => setMobileTab('preview')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                mobileTab === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Aperçu
            </button>
          </div>

          {/* Share PIN & QR */}
          <button
            onClick={() => setShowQRModal(true)}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-teal-700 transition-colors"
            title="Afficher le QR code et code PIN"
          >
            <span>PIN : {presentation?.join_code}</span>
            <Share2 size={13} className="text-slate-400" />
          </button>

          {/* Big Present Button */}
          <Button
            onClick={() => onPresent(presentationId)}
            disabled={questions.length === 0}
            className="bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 text-xs sm:text-sm font-bold px-4 py-2"
          >
            <Eye size={15} /> Présenter
          </Button>
        </div>
      </header>

      {/* ── Main Studio Layout (Questions left, Live Preview right) ────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50/50">
        {/* ── LEFT COLUMN: Question List & Edit Form ───────────────────── */}
        <div
          className={`w-full lg:w-[460px] xl:w-[500px] border-r border-slate-200 bg-white flex flex-col flex-shrink-0 overflow-y-auto ${
            mobileTab === 'preview' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Slides Carousel / Thumbnail Strip Header */}
          <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex-shrink-0">
                Diapositives ({questions.length})
              </span>
            </div>
            <Button
              size="sm"
              onClick={handleAddQuestion}
              className="text-xs py-1 px-2.5 h-8 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 flex-shrink-0 font-bold"
            >
              <Plus size={14} /> Question
            </Button>
          </div>

          {/* Horizontal Slide Thumbnails */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex items-center gap-2 overflow-x-auto scrollbar-thin">
            {questions.map((q, idx) => {
              const Icon = typeIcons[q.type] || ListChecks;
              const isSelected = idx === activeIdx;

              return (
                <div
                  key={q.id}
                  onClick={() => {
                    setActiveIdx(idx);
                    setPreviewRevealedQuiz(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all flex-shrink-0 border ${
                    isSelected
                      ? 'bg-teal-50 border-teal-500 text-teal-950 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <span className="text-[11px] font-mono font-bold opacity-75">#{idx + 1}</span>
                  <Icon size={14} className={isSelected ? 'text-teal-600' : 'text-slate-400'} />
                  <span className="text-xs max-w-[100px] truncate">{q.title}</span>

                  {/* Reorder Arrows on hover/active */}
                  {isSelected && (
                    <div className="flex items-center ml-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleMoveQuestion(idx, -1)}
                        disabled={idx === 0}
                        className="p-0.5 text-slate-400 hover:text-slate-900 disabled:opacity-20"
                        title="Monter"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        onClick={() => handleMoveQuestion(idx, 1)}
                        disabled={idx === questions.length - 1}
                        className="p-0.5 text-slate-400 hover:text-slate-900 disabled:opacity-20"
                        title="Descendre"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {questions.length === 0 && (
              <p className="text-xs text-slate-400 py-1">Aucune question pour l'instant</p>
            )}
          </div>

          {/* Active Question Editor Form */}
          {activeQuestion ? (
            <div className="p-5 space-y-6 flex-1 overflow-y-auto">
              {/* Question Header & Delete */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  Édition de la question #{activeIdx + 1}
                </span>
                <button
                  onClick={() => handleDeleteQuestion(activeIdx)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Supprimer cette question"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* 1. Question Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  1. Type d'interaction
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {QUESTION_TYPES.map((qt) => {
                    const Icon = typeIcons[qt.value] || ListChecks;
                    const isSelected = activeQuestion.type === qt.value;

                    return (
                      <button
                        key={qt.value}
                        type="button"
                        onClick={() => {
                          const newLayout = getDefaultLayout(qt.value);
                          const currentCfg = parseQuestionConfig(activeQuestion);
                          handleUpdateActiveQuestion({
                            type: qt.value,
                            options: {
                              choices: currentCfg.choices,
                              layout: newLayout,
                              allowMultiple: currentCfg.allowMultiple,
                            },
                          });
                        }}
                        className={`flex flex-col items-center text-center gap-1 rounded-2xl p-2.5 border transition-all ${
                          isSelected
                            ? 'bg-teal-50 border-teal-500 text-teal-900 font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Icon size={16} className={isSelected ? 'text-teal-600' : 'text-slate-400'} />
                        <span className="text-[11px] leading-tight">{qt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Visual Layout Selection (Menti Styles) */}
              {LAYOUT_OPTIONS[activeQuestion.type] && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    2. Style de présentation visuelle (comme sur Menti)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LAYOUT_OPTIONS[activeQuestion.type].map((lo) => {
                      const Icon = layoutIcons[lo.id] || BarChart3;
                      const cfg = parseQuestionConfig(activeQuestion);
                      const isSelected = cfg.layout === lo.id;

                      return (
                        <button
                          key={lo.id}
                          type="button"
                          onClick={() => {
                            handleUpdateActiveQuestion({
                              options: {
                                choices: cfg.choices,
                                layout: lo.id,
                                allowMultiple: cfg.allowMultiple,
                              },
                            });
                          }}
                          className={`flex flex-col items-center text-center gap-1 rounded-xl p-2.5 border transition-all ${
                            isSelected
                              ? 'bg-teal-600 text-white border-teal-600 shadow-sm font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Icon size={16} />
                          <span className="text-[11px] leading-tight">{lo.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Question Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  3. Intitulé de la question
                </label>
                <input
                  value={activeQuestion.title}
                  onChange={(e) => handleUpdateActiveQuestion({ title: e.target.value })}
                  placeholder="Ex: Quel sujet souhaitez-vous approfondir ?"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
              </div>

              {/* 4. Options List (For Multiple Choice & Quiz) */}
              {['multiple_choice', 'quiz'].includes(activeQuestion.type) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      4. Options de vote
                    </label>
                    {activeQuestion.type === 'quiz' && (
                      <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Cochez la bonne réponse
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {parseQuestionConfig(activeQuestion).choices.map((opt, i) => {
                      const cfg = parseQuestionConfig(activeQuestion);
                      const isCorrect = activeQuestion.type === 'quiz' && activeQuestion.correct_option === i;

                      return (
                        <div key={i} className="flex items-center gap-2">
                          {activeQuestion.type === 'quiz' && (
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateActiveQuestion({
                                  correct_option: activeQuestion.correct_option === i ? null : i,
                                });
                              }}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-slate-300 hover:border-emerald-500'
                              }`}
                              title="Marquer comme bonne réponse"
                            >
                              {isCorrect && <Check size={14} className="text-white font-black" />}
                            </button>
                          )}

                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-slate-200">
                            {LETTERS[i] || i + 1}
                          </span>

                          <input
                            value={opt}
                            onChange={(e) => {
                              const newChoices = [...cfg.choices];
                              newChoices[i] = e.target.value;
                              handleUpdateActiveQuestion({
                                options: {
                                  choices: newChoices,
                                  layout: cfg.layout,
                                  allowMultiple: cfg.allowMultiple,
                                },
                              });
                            }}
                            placeholder={`Option ${i + 1}`}
                            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-500 transition-all"
                          />

                          {cfg.choices.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newChoices = cfg.choices.filter((_, idx) => idx !== i);
                                let newCorrect = activeQuestion.correct_option;
                                if (newCorrect === i) newCorrect = null;
                                else if (newCorrect !== null && newCorrect > i) newCorrect--;

                                handleUpdateActiveQuestion({
                                  options: {
                                    choices: newChoices,
                                    layout: cfg.layout,
                                    allowMultiple: cfg.allowMultiple,
                                  },
                                  correct_option: newCorrect,
                                });
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0"
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const cfg = parseQuestionConfig(activeQuestion);
                        handleUpdateActiveQuestion({
                          options: {
                            choices: [...cfg.choices, `Option ${cfg.choices.length + 1}`],
                            layout: cfg.layout,
                            allowMultiple: cfg.allowMultiple,
                          },
                        });
                      }}
                      className="w-full mt-2 text-xs py-2 border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                    >
                      <Plus size={14} /> Ajouter une option
                    </Button>
                  </div>
                </div>
              )}

              {/* Option: Autoriser plusieurs réponses pour Choix multiple */}
              {activeQuestion.type === 'multiple_choice' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all hover:border-slate-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-2.5 pr-2">
                      <div
                        className={`p-1.5 rounded-lg mt-0.5 ${
                          parseQuestionConfig(activeQuestion).allowMultiple
                            ? 'bg-teal-50 text-teal-600'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <CheckSquare size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Autoriser plusieurs réponses
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5 leading-snug">
                          Les participants peuvent cocher plusieurs choix avant de valider
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={parseQuestionConfig(activeQuestion).allowMultiple}
                      onClick={() => {
                        const cfg = parseQuestionConfig(activeQuestion);
                        handleUpdateActiveQuestion({
                          options: {
                            ...cfg,
                            allowMultiple: !cfg.allowMultiple,
                          },
                        });
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        parseQuestionConfig(activeQuestion).allowMultiple ? 'bg-teal-600' : 'bg-slate-200'
                      }`}
                      title={parseQuestionConfig(activeQuestion).allowMultiple ? 'Désactiver plusieurs choix' : 'Activer plusieurs choix'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          parseQuestionConfig(activeQuestion).allowMultiple ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Option: Autoriser plusieurs réponses pour Texte libre / Nuage de mots */}
              {['open_text', 'word_cloud'].includes(activeQuestion.type) && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all hover:border-slate-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-2.5 pr-2">
                      <div
                        className={`p-1.5 rounded-lg mt-0.5 ${
                          parseQuestionConfig(activeQuestion).allowMultiple
                            ? 'bg-teal-50 text-teal-600'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <CheckSquare size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Autoriser plusieurs réponses
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5 leading-snug">
                          {activeQuestion.type === 'word_cloud'
                            ? 'Les participants peuvent envoyer plusieurs mots à la suite'
                            : 'Les participants peuvent envoyer plusieurs messages ou avis'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={parseQuestionConfig(activeQuestion).allowMultiple}
                      onClick={() => {
                        const cfg = parseQuestionConfig(activeQuestion);
                        handleUpdateActiveQuestion({
                          options: {
                            ...cfg,
                            allowMultiple: !cfg.allowMultiple,
                          },
                        });
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        parseQuestionConfig(activeQuestion).allowMultiple ? 'bg-teal-600' : 'bg-slate-200'
                      }`}
                      title={parseQuestionConfig(activeQuestion).allowMultiple ? 'Désactiver plusieurs réponses' : 'Activer plusieurs réponses'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          parseQuestionConfig(activeQuestion).allowMultiple ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Informative tips based on question type */}
              {activeQuestion.type === 'word_cloud' && (
                <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-200/60 text-xs text-teal-800">
                  💡 Les participants envoient des mots courts sur leur smartphone. Les mots les plus répétés s'affichent automatiquement en grand.
                </div>
              )}
              {activeQuestion.type === 'rating' && (
                <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/60 text-xs text-amber-800">
                  💡 Les participants sélectionnent une note de 1 à 5 étoiles. Le résultat s'affiche en direct avec la note moyenne et la jauge.
                </div>
              )}
              {activeQuestion.type === 'open_text' && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200/60 text-xs text-indigo-800">
                  💡 Les participants rédigent librement. Vous pouvez afficher leurs messages sous forme de post-its colorés ou un par un en mode Spotlight.
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <ListChecks size={40} className="mb-3 opacity-40 text-teal-600" />
              <p className="text-sm font-bold text-slate-700">Aucune question sélectionnée</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Créez votre première diapositive interactive</p>
              <Button size="sm" onClick={handleAddQuestion} className="bg-teal-600 hover:bg-teal-500 text-white font-bold">
                <Plus size={15} /> Ajouter une question
              </Button>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Live Interactive Slide Preview (16:9) ───────── */}
        <div
          className={`flex-1 bg-slate-100/70 flex flex-col items-center justify-between p-4 sm:p-6 overflow-y-auto ${
            mobileTab === 'editor' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Preview Toolbar */}
          <div className="w-full max-w-4xl flex items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                <Monitor size={15} className="text-teal-600" />
                Aperçu diapositive (Écran public 16:9)
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Mock data toggle */}
              <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useMockData}
                  onChange={(e) => setUseMockData(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="hidden sm:inline">Données simulées</span>
              </label>

              {/* Theme selector */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-xs">
                <Palette size={13} className="text-slate-400" />
                <select
                  value={previewTheme}
                  onChange={(e) => setPreviewTheme(e.target.value as ThemeId)}
                  className="bg-transparent text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
                >
                  {(Object.keys(THEMES) as ThemeId[]).map((tid) => (
                    <option key={tid} value={tid} className="bg-white text-slate-900">
                      {THEMES[tid].name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quiz test confetti button if applicable */}
              {activeQuestion?.type === 'quiz' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestConfetti}
                  className="text-xs h-7 px-2 border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  title="Tester l'effet de révélation avec confettis"
                >
                  <Sparkles size={13} /> Tester Quiz
                </Button>
              )}
            </div>
          </div>

          {/* 16:9 Slide Canvas */}
          <div className="w-full max-w-4xl flex-1 flex items-center justify-center my-auto py-2">
            {activeQuestion ? (
              <div
                className={`w-full aspect-[16/9] max-h-[560px] rounded-3xl bg-gradient-to-br ${themeConfig.bgGradient} border-2 border-slate-200/90 shadow-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-500`}
              >
                {/* ── Right-Side Corner QR Code in Slide Canvas with Switch ── */}
                <div className="absolute top-4 right-4 z-20 hidden sm:block">
                  {showCornerQR ? (
                    <div className="bg-white/95 border-2 border-slate-200/90 rounded-2xl p-2.5 shadow-md flex flex-col items-center gap-1.5 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between w-full gap-2 px-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          QR Code
                        </span>
                        {/* Switch */}
                        <button
                          onClick={() => setShowCornerQR(false)}
                          className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                          title="Masquer le QR code"
                        >
                          <span>Cacher</span>
                          <div className="w-5 h-3 bg-teal-500 rounded-full p-0.5 flex justify-end">
                            <div className="w-2 h-2 bg-white rounded-full shadow-xs" />
                          </div>
                        </button>
                      </div>

                      <div className="p-1 bg-white rounded-lg border border-slate-100 shadow-xs">
                        <QRCodeSVG value={joinUrl} size={70} level="M" />
                      </div>

                      <span className="font-mono font-black text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                        PIN : {presentation?.join_code}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCornerQR(true)}
                      className="flex items-center gap-1.5 bg-white/95 hover:bg-white text-slate-700 border-2 border-slate-200 px-2.5 py-1 rounded-full shadow-xs text-[11px] font-bold transition-all hover:border-teal-500"
                      title="Afficher le QR code"
                    >
                      <QrCode size={12} className="text-teal-600" />
                      <span>Afficher QR</span>
                      <div className="w-4 h-2.5 bg-slate-200 rounded-full p-0.5 flex justify-start">
                        <div className="w-1.5 h-1.5 bg-white rounded-full shadow-xs" />
                      </div>
                    </button>
                  )}
                </div>

                {/* Menti Join Banner inside Slide */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-black/5">
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <span className="font-semibold text-slate-500 hidden sm:inline">Rejoindre sur</span>
                    <span className="font-bold text-teal-600 underline">{window.location.host}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">Code :</span>
                    <span className="font-mono font-black text-slate-900 tracking-wider bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-xs">
                      {presentation?.join_code}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pr-28 sm:pr-32">
                    <span className="text-[11px] font-mono font-bold text-slate-500 bg-black/5 px-2.5 py-0.5 rounded-full">
                      Question {activeIdx + 1} / {questions.length}
                    </span>
                  </div>
                </div>

                {/* Question Slide Content */}
                <div className="flex-1 flex flex-col items-center justify-center py-3 my-auto overflow-hidden">
                  {parseQuestionConfig(activeQuestion).allowMultiple && (
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-full">
                        {activeQuestion.type === 'multiple_choice' ? 'Choix multiples autorisés' : 'Plusieurs réponses autorisées'}
                      </span>
                    </div>
                  )}
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 text-center leading-tight mb-3 drop-shadow-xs max-w-2xl">
                    {activeQuestion.title || 'Votre question ici...'}
                  </h2>

                  {/* Render the Visualization with mock or real responses */}
                  <div className="w-full flex-1 flex items-center justify-center max-h-[340px]">
                    <QuestionVisualization
                      question={activeQuestion}
                      responses={useMockData ? generateMockResponses(activeQuestion) : []}
                      activeLayout={parseQuestionConfig(activeQuestion).layout}
                      revealedQuiz={previewRevealedQuiz}
                      hideResults={false}
                    />
                  </div>
                </div>

                {/* Slide Footer */}
                <div className="flex items-center justify-between pt-2 text-[10px] text-slate-400">
                  <span>Presento · Mode Direct</span>
                  <span>{useMockData ? 'Simulation active' : 'Données réelles'}</span>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-[16/9] max-h-[480px] rounded-3xl bg-white border-2 border-slate-200 flex flex-col items-center justify-center text-slate-400 p-8 shadow-sm">
                <Monitor size={48} className="text-slate-300 mb-3" />
                <p className="text-base font-bold text-slate-700">Aucune diapositive à prévisualiser</p>
                <p className="text-xs text-slate-400 mt-1">Ajoutez une question à gauche pour voir l'aperçu en direct.</p>
              </div>
            )}
          </div>

          {/* Quick Start Floating Banner below preview */}
          <div className="w-full max-w-4xl flex items-center justify-between pt-3 border-t border-slate-200 text-xs text-slate-500">
            <span>
              {questions.length} question{questions.length > 1 ? 's' : ''} prête{questions.length > 1 ? 's' : ''} pour la présentation
            </span>
            <Button
              size="sm"
              onClick={() => onPresent(presentationId)}
              disabled={questions.length === 0}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-sm"
            >
              <Eye size={14} /> Démarrer la présentation
            </Button>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowQRModal(false)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-8 text-center shadow-2xl animate-in zoom-in-95">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-black text-slate-900 mb-1">Code de participation</h3>
            <p className="text-xs text-slate-500 mb-4">Pour tester avec un smartphone :</p>
            <div className="inline-block p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-sm mb-4">
              <QRCodeSVG value={joinUrl} size={180} level="M" />
            </div>
            <p className="text-3xl font-mono font-black text-teal-700 tracking-widest mb-4">
              {presentation?.join_code}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(joinUrl);
                setToastMessage('✓ Lien copié dans le presse-papier !');
              }}
              className="w-full text-xs text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              Copier le lien
            </Button>
          </div>
        </div>
      )}

      {/* Question Deletion Confirmation Modal */}
      <ConfirmModal
        open={questionToDelete !== null}
        onClose={() => setQuestionToDelete(null)}
        onConfirm={handleConfirmDeleteQuestion}
        title="Supprimer la question"
        message={
          questionToDelete !== null && questions[questionToDelete]
            ? `Êtes-vous sûr de vouloir supprimer la question "${questions[questionToDelete].title}" ? Cette action est irréversible.`
            : 'Êtes-vous sûr de vouloir supprimer cette question ?'
        }
        confirmText="Supprimer la question"
        cancelText="Annuler"
        variant="danger"
        loading={deletingQuestion}
      />

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}
