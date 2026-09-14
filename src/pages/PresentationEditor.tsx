import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Eye, X, ListChecks, HelpCircle, Cloud, Edit3, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Presentation, Question, QuestionType } from '@/lib/types';
import { QUESTION_TYPES } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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

export function PresentationEditor({ presentationId, onBack, onPresent }: Props) {
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');

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
    if (qs) setQuestions(qs);
    setLoading(false);
  }, [presentationId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveTitle = async () => {
    if (!presentation) return;
    await supabase.from('presentations').update({ title }).eq('id', presentation.id);
    setPresentation({ ...presentation, title });
  };

  const handleSaveQuestion = async (q: Partial<Question>) => {
    setSaving(true);
    if (editingQuestion) {
      await supabase
        .from('questions')
        .update({
          title: q.title,
          type: q.type,
          options: q.options,
          correct_option: q.correct_option,
        })
        .eq('id', editingQuestion.id);
    } else {
      await supabase.from('questions').insert({
        presentation_id: presentationId,
        title: q.title,
        type: q.type,
        options: q.options,
        correct_option: q.correct_option,
        position: questions.length,
      });
    }
    setEditingQuestion(null);
    setShowQuestionForm(false);
    await fetchAll();
    setSaving(false);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Supprimer cette question ?')) return;
    await supabase.from('questions').delete().eq('id', id);
    await fetchAll();
  };

  const moveQuestion = async (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= questions.length) return;
    const reordered = [...questions];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    reordered.forEach((q, i) => {
      supabase.from('questions').update({ position: i }).eq('id', q.id);
    });
    setQuestions(reordered);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft size={16} /> Retour
            </Button>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              className="flex-1 min-w-0 text-lg font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 px-2 py-1 rounded hover:bg-slate-50 focus:bg-slate-50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
              {presentation?.join_code}
            </span>
            <Button onClick={() => onPresent(presentationId)} disabled={questions.length === 0}>
              <Eye size={16} /> Présenter
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {questions.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
              <Plus className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">Aucune question</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">Ajoutez votre première question interactive</p>
            <Button onClick={() => { setEditingQuestion(null); setShowQuestionForm(true); }}>
              <Plus size={18} /> Ajouter une question
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {questions.map((q, index) => {
                const Icon = typeIcons[q.type] ?? ListChecks;
                const typeLabel = QUESTION_TYPES.find((t) => t.value === q.type)?.label ?? q.type;
                return (
                  <div
                    key={q.id}
                    className="group flex items-center gap-3 rounded-xl bg-white border border-slate-200 p-4 hover:shadow-md hover:border-teal-200 transition-all"
                  >
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveQuestion(index, -1)}
                        disabled={index === 0}
                        className="text-slate-300 hover:text-slate-600 disabled:opacity-30 transition-colors"
                      >
                        <GripVertical size={14} className="rotate-180" />
                      </button>
                      <button
                        onClick={() => moveQuestion(index, 1)}
                        disabled={index === questions.length - 1}
                        className="text-slate-300 hover:text-slate-600 disabled:opacity-30 transition-colors"
                      >
                        <GripVertical size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-50 flex-shrink-0">
                      <Icon className="text-teal-600" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{q.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {typeLabel}
                        {q.options && ` · ${q.options.length} options`}
                        {q.type === 'quiz' && q.correct_option !== null && ' · réponse correcte définie'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingQuestion(q); setShowQuestionForm(true); }}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-teal-600 transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button
              variant="outline"
              onClick={() => { setEditingQuestion(null); setShowQuestionForm(true); }}
              className="w-full border-dashed"
            >
              <Plus size={18} /> Ajouter une question
            </Button>
          </>
        )}
      </main>

      {showQuestionForm && (
        <QuestionForm
          question={editingQuestion}
          onSave={handleSaveQuestion}
          onClose={() => { setShowQuestionForm(false); setEditingQuestion(null); }}
          saving={saving}
        />
      )}
    </div>
  );
}

function QuestionForm({
  question,
  onSave,
  onClose,
  saving,
}: {
  question: Question | null;
  onSave: (q: Partial<Question>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [type, setType] = useState<QuestionType>(question?.type ?? 'multiple_choice');
  const [title, setTitle] = useState(question?.title ?? '');
  const [options, setOptions] = useState<string[]>(question?.options ?? ['', '']);
  const [correctOption, setCorrectOption] = useState<number | null>(question?.correct_option ?? null);

  const hasOptions = ['multiple_choice', 'quiz'].includes(type);

  const handleSave = () => {
    if (!title.trim()) return;
    const cleanOptions = hasOptions ? options.filter((o) => o.trim()) : null;
    onSave({
      type,
      title: title.trim(),
      options: cleanOptions,
      correct_option: type === 'quiz' ? correctOption : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-slate-900">
            {question ? 'Modifier la question' : 'Nouvelle question'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Type de question</label>
            <div className="grid grid-cols-3 gap-2">
              {QUESTION_TYPES.map((qt) => {
                const Icon = typeIcons[qt.value] ?? ListChecks;
                return (
                  <button
                    key={qt.value}
                    onClick={() => setType(qt.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
                      type === qt.value
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-medium">{qt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Question"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Quel est votre niveau de satisfaction ?"
            autoFocus
          />

          {hasOptions && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Options {type === 'quiz' && '(sélectionnez la bonne réponse)'}
              </label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {type === 'quiz' && (
                      <button
                        onClick={() => setCorrectOption(correctOption === i ? null : i)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                          correctOption === i
                            ? 'bg-teal-500 border-teal-500'
                            : 'border-slate-300 hover:border-teal-400'
                        }`}
                        title="Marquer comme correcte"
                      >
                        {correctOption === i && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </button>
                    )}
                    <input
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = e.target.value;
                        setOptions(next);
                      }}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                      placeholder={`Option ${i + 1}`}
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => {
                          setOptions(options.filter((_, idx) => idx !== i));
                          if (correctOption === i) setCorrectOption(null);
                          else if (correctOption !== null && correctOption > i) setCorrectOption(correctOption - 1);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOptions([...options, ''])}
                  disabled={options.length >= 8}
                >
                  <Plus size={14} /> Ajouter une option
                </Button>
              </div>
              {type === 'quiz' && correctOption !== null && (
                <p className="mt-2 text-xs text-teal-600">
                  La bonne réponse est: {options[correctOption] || `Option ${correctOption + 1}`}
                </p>
              )}
            </div>
          )}

          {type === 'rating' && (
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
              Les participants pourront donner une note de 1 à 5 étoiles.
            </p>
          )}
          {type === 'word_cloud' && (
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
              Les participants écriront un mot ou une courte phrase. Les réponses les plus fréquentes apparaîtront en plus gros.
            </p>
          )}
          {type === 'open_text' && (
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
              Les participants pourront écrire une réponse libre.
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-end px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim() || (hasOptions && options.filter((o) => o.trim()).length < 2)}>
            <Save size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>
    </div>
  );
}
