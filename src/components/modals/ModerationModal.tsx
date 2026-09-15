import React, { useState, useMemo } from 'react';
import { Trash2, Search, User, AlertTriangle, Cloud, MessageSquare } from 'lucide-react';
import type { Question, Response as ResponseType } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  question: Question | null;
  responses: ResponseType[];
  onDeleteResponse: (id: string) => Promise<void> | void;
  onDeleteWord: (word: string) => Promise<void> | void;
  onClearAll: () => Promise<void> | void;
}

export function ModerationModal({
  open,
  onClose,
  question,
  responses,
  onDeleteResponse,
  onDeleteWord,
  onClearAll,
}: Props) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'individual' | 'words'>('individual');
  const [confirmClear, setConfirmClear] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingWord, setDeletingWord] = useState<string | null>(null);

  const isWordCloud = question?.type === 'word_cloud';

  // Filter individual responses
  const filteredResponses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return responses;
    return responses.filter(
      (r) =>
        r.answer.toLowerCase().includes(q) ||
        (r.participant_name && r.participant_name.toLowerCase().includes(q))
    );
  }, [responses, search]);

  // Group by words for word cloud questions
  const wordStats = useMemo(() => {
    if (!isWordCloud) return [];
    const counts: Record<string, number> = {};
    responses.forEach((r) => {
      const clean = r.answer.trim().toLowerCase();
      if (clean) counts[clean] = (counts[clean] ?? 0) + 1;
    });

    const list = Object.entries(counts).map(([word, count]) => ({ word, count }));
    list.sort((a, b) => b.count - a.count);

    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => item.word.includes(q));
  }, [responses, isWordCloud, search]);

  const handleDeleteItem = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteResponse(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteWordGroup = async (word: string) => {
    setDeletingWord(word);
    try {
      await onDeleteWord(word);
    } finally {
      setDeletingWord(null);
    }
  };

  const handleConfirmClearAll = async () => {
    try {
      await onClearAll();
      setConfirmClear(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Modération des réponses" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Header Question Summary */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Question active</p>
            <p className="text-sm font-bold text-slate-800 truncate">{question?.title || 'Sans titre'}</p>
          </div>
          <span className="flex-shrink-0 text-xs font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-lg">
            {responses.length} réponse{responses.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Tabs for Word Cloud */}
        {isWordCloud && (
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setTab('words')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                tab === 'words'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Cloud size={14} /> Par mot unique ({wordStats.length})
            </button>
            <button
              onClick={() => setTab('individual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                tab === 'individual'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MessageSquare size={14} /> Réponses détaillées ({responses.length})
            </button>
          </div>
        )}

        {/* Search bar & Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une réponse ou un participant..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {responses.length > 0 && !confirmClear && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmClear(true)}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs gap-1 flex-shrink-0"
              title="Supprimer toutes les réponses"
            >
              <Trash2 size={13} /> Tout effacer
            </Button>
          )}
        </div>

        {/* Confirm Clear All prompt */}
        {confirmClear && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-rose-800 text-xs font-semibold">
              <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
              <span>Supprimer définitivement les {responses.length} réponses ?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmClear(false)}
                className="text-xs text-slate-600 hover:text-slate-800 font-bold px-2 py-1"
              >
                Annuler
              </button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmClearAll}
                className="text-xs py-1 px-2.5"
              >
                Confirmer
              </Button>
            </div>
          </div>
        )}

        {/* Responses List */}
        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
          {isWordCloud && tab === 'words' ? (
            wordStats.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">Aucun mot correspondant.</p>
            ) : (
              wordStats.map((item) => (
                <div
                  key={item.word}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-bold text-sm text-slate-900 truncate">
                      "{item.word}"
                    </span>
                    <span className="text-[11px] font-mono text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full font-bold">
                      {item.count} mention{item.count > 1 ? 's' : ''}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteWordGroup(item.word)}
                    disabled={deletingWord === item.word}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs gap-1 py-1 px-2.5 flex-shrink-0"
                    title={`Supprimer toutes les mentions du mot "${item.word}"`}
                  >
                    <Trash2 size={13} /> Supprimer le mot
                  </Button>
                </div>
              ))
            )
          ) : filteredResponses.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">
              {responses.length === 0 ? 'Aucune réponse reçue pour le moment.' : 'Aucune réponse ne correspond à la recherche.'}
            </p>
          ) : (
            filteredResponses.map((r, i) => (
              <div
                key={r.id || i}
                className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <User size={12} className="text-slate-400" />
                    <span className="font-semibold text-slate-700 truncate">
                      {r.participant_name || 'Participant anonyme'}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 break-words">
                    "{r.answer}"
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteItem(r.id)}
                  disabled={deletingId === r.id}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors flex-shrink-0"
                  title="Supprimer ce message"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>La suppression retire immédiatement la réponse de la vue grand écran.</span>
          <Button size="sm" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
