import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Presentation,
  Plus,
  LogOut,
  Calendar,
  Edit3,
  Trash2,
  Copy,
  Check,
  Search,
  Play,
  Share2,
  Users,
  Radio,
  Sparkles,
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/lib/auth';
import type { Presentation as PresentationType } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const statusConfig: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  active: {
    label: 'En direct',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dotClass: 'bg-emerald-500 animate-pulse',
  },
  draft: {
    label: 'Brouillon',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  ended: {
    label: 'Terminée',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
    dotClass: 'bg-amber-400',
  },
};

interface AdminDashboardProps {
  onOpenPresentation: (id: string) => void;
  onPresent?: (id: string) => void;
}

export function AdminDashboard({ onOpenPresentation, onPresent }: AdminDashboardProps) {
  const { signOut } = useAuth();
  const rawPresentations = useQuery(api.presentations.list);
  const presentations = useMemo(() => (rawPresentations ?? []) as PresentationType[], [rawPresentations]);
  const loading = rawPresentations === undefined;

  const createPresentation = useMutation(api.presentations.create);
  const deletePresentation = useMutation(api.presentations.remove);

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'ended'>('all');

  const [presentationToDelete, setPresentationToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await createPresentation({ title: newTitle.trim() });
      setNewTitle('');
      setShowCreate(false);
      onOpenPresentation(res.presentationId);
    } catch (err) {
      console.error('Failed to create presentation:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!presentationToDelete) return;
    setDeleting(true);
    try {
      await deletePresentation({ id: presentationToDelete.id as any });
    } catch (err) {
      console.error('Failed to delete presentation:', err);
    } finally {
      setDeleting(false);
      setPresentationToDelete(null);
    }
  };

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filtered presentations
  const filtered = useMemo(() => {
    return presentations.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.join_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [presentations, searchQuery, statusFilter]);

  // Quick stats
  const activeCount = presentations.filter((p) => p.status === 'active').length;

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col selection:bg-teal-100">
      {/* ── Top Navbar ────────────────────────────────────────────── */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Presentation size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">Presento</h1>
                <span className="text-[10px] uppercase font-extrabold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md border border-teal-200">
                  Studio
                </span>
              </div>
              <p className="text-xs text-slate-400">Espace Animateur</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Session active</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-slate-600 hover:text-red-600 hover:bg-red-50 text-xs gap-1.5"
            >
              <LogOut size={15} /> Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Container ────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-8">
        {/* Hero Banner with Stats */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 sm:p-8 text-white shadow-xl shadow-slate-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          {/* Subtle glow decoration */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-400 bg-teal-950/60 border border-teal-500/30 px-3 py-1 rounded-full mb-3">
              <Sparkles size={13} />
              <span>Tableau de bord</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
              Prêt à animer vos présentations ?
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Créez des sondages, des quiz et des nuages de mots interactifs. Vos participants votent instantanément depuis leur smartphone.
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <Button
              size="lg"
              onClick={() => setShowCreate(true)}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black shadow-lg shadow-teal-500/30 text-sm px-6 py-3.5"
            >
              <Plus size={18} /> Nouvelle présentation
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 sm:p-5">
            <span className="text-xs font-semibold text-slate-500">Total présentations</span>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">
              {presentations.length}
            </p>
          </div>
          <div className="rounded-2xl bg-teal-50/70 border border-teal-200/80 p-4 sm:p-5">
            <span className="text-xs font-semibold text-teal-700 flex items-center gap-1.5">
              <Radio size={14} className="animate-pulse text-emerald-600" /> En direct maintenant
            </span>
            <p className="text-2xl sm:text-3xl font-black text-teal-900 font-mono mt-1">
              {activeCount}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-2xl bg-slate-50 border border-slate-200/80 p-4 sm:p-5">
            <span className="text-xs font-semibold text-slate-500">Mode participant</span>
            <p className="text-sm font-bold text-slate-800 mt-1">
              QR Code & code PIN 6 lettres
            </p>
          </div>
        </div>

        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          {/* Status filter tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/60 overflow-x-auto">
            {(['all', 'active', 'draft', 'ended'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {st === 'all'
                  ? 'Toutes'
                  : st === 'active'
                  ? 'En cours'
                  : st === 'draft'
                  ? 'Brouillons'
                  : 'Terminées'}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre ou PIN..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-xs"
            />
          </div>
        </div>

        {/* ── Presentations Grid ───────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm mb-4 text-slate-400">
              <Presentation size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {searchQuery ? 'Aucun résultat trouvé' : 'Aucune présentation'}
            </h3>
            <p className="text-sm text-slate-500 mt-1 mb-6 max-w-sm mx-auto">
              {searchQuery
                ? 'Essayez de modifier votre recherche ou vos filtres.'
                : 'Créez votre première présentation interactive avec des sondages, quiz et nuages de mots.'}
            </p>
            <Button onClick={() => setShowCreate(true)} className="bg-teal-600 hover:bg-teal-500 text-white font-bold">
              <Plus size={16} /> Créer une présentation
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((pres) => {
              const status = statusConfig[pres.status] ?? statusConfig.draft;

              return (
                <div
                  key={pres.id}
                  className="group rounded-3xl bg-white border border-slate-200 p-5 hover:shadow-xl hover:border-teal-400 transition-all duration-300 flex flex-col justify-between relative shadow-xs"
                >
                  {/* Top card header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${status.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                        {status.label}
                      </span>

                      {/* PIN pill with instant copy */}
                      <button
                        onClick={() => copyJoinCode(pres.join_code)}
                        className="flex items-center gap-1 text-xs font-mono font-bold text-teal-700 bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 px-2.5 py-1 rounded-lg transition-colors group/btn"
                        title="Copier le code PIN"
                      >
                        <span>PIN : {pres.join_code}</span>
                        {copiedCode === pres.join_code ? (
                          <Check size={12} className="text-emerald-600" />
                        ) : (
                          <Copy size={12} className="text-teal-600 group-hover/btn:scale-110 transition-transform" />
                        )}
                      </button>
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => onOpenPresentation(pres.id)}
                      className="text-lg font-bold text-slate-900 mb-1.5 line-clamp-2 hover:text-teal-600 cursor-pointer transition-colors"
                      title={pres.title}
                    >
                      {pres.title}
                    </h3>

                    {/* Metadata date */}
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-5">
                      <Calendar size={13} /> {formatDate(pres.created_at)}
                    </p>
                  </div>

                  {/* Card bottom actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    {onPresent && (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!document.fullscreenElement) {
                            document.documentElement.requestFullscreen().catch(() => {});
                          }
                          onPresent(pres.id);
                        }}
                        className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2 shadow-xs transition-colors flex items-center gap-1.5"
                        title="Lancer en plein écran"
                      >
                        <Play size={13} className="fill-current" /> Présenter
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenPresentation(pres.id)}
                      className="flex-1 text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-50 font-bold text-xs py-2 shadow-xs transition-colors"
                    >
                      <Edit3 size={13} /> Éditer
                    </Button>

                    <button
                      onClick={() => setPresentationToDelete({ id: pres.id, title: pres.title })}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Create Presentation Modal ─────────────────────────────── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle présentation">
        <form onSubmit={handleCreate} className="space-y-5">
          <Input
            label="Titre de la présentation"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ex: Rétrospective d'équipe ou Quiz interactif"
            autoFocus
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-600/20"
            >
              {creating ? 'Création...' : 'Créer et commencer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ─────────────────────────────── */}
      <ConfirmModal
        open={!!presentationToDelete}
        onClose={() => setPresentationToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer la présentation"
        message={`Êtes-vous sûr de vouloir supprimer définitivement "${presentationToDelete?.title}" ainsi que toutes ses questions et réponses ? Cette action est irréversible.`}
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
