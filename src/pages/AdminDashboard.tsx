import { useEffect, useState, useCallback } from 'react';
import { Presentation, Plus, LogOut, Calendar, Edit3, Trash2, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Presentation as PresentationType } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-slate-100 text-slate-600' },
  active: { label: 'En cours', color: 'bg-teal-100 text-teal-700' },
  ended: { label: 'Terminée', color: 'bg-slate-100 text-slate-500' },
};

export function AdminDashboard({ onOpenPresentation }: { onOpenPresentation: (id: string) => void }) {
  const { signOut } = useAuth();
  const [presentations, setPresentations] = useState<PresentationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchPresentations = useCallback(async () => {
    const { data, error } = await supabase
      .from('presentations')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setPresentations(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPresentations();
  }, [fetchPresentations]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    let joinCode = generateJoinCode();
    let attempts = 0;
    while (attempts < 5) {
      const { data, error } = await supabase
        .from('presentations')
        .insert({ title: newTitle.trim(), join_code: joinCode })
        .select()
        .single();
      if (!error && data) {
        setNewTitle('');
        setShowCreate(false);
        await fetchPresentations();
        onOpenPresentation(data.id);
        return;
      }
      joinCode = generateJoinCode();
      attempts++;
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette présentation et toutes ses questions ?')) return;
    await supabase.from('presentations').delete().eq('id', id);
    await fetchPresentations();
  };

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
              <Presentation className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Presento</h1>
              <p className="text-xs text-slate-500">Tableau de bord</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:block">Administrateur</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut size={16} /> Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Mes présentations</h2>
            <p className="text-sm text-slate-500 mt-1">Créez et gérez vos présentations interactives</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={18} /> Nouvelle présentation
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : presentations.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
              <Presentation className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">Aucune présentation</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">Commencez par créer votre première présentation interactive</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={18} /> Créer une présentation
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {presentations.map((pres) => {
              const status = statusConfig[pres.status] ?? statusConfig.draft;
              return (
                <div
                  key={pres.id}
                  className="group rounded-2xl bg-white border border-slate-200 p-5 hover:shadow-lg hover:border-teal-300 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                    <button
                      onClick={() => copyJoinCode(pres.join_code)}
                      className="text-slate-400 hover:text-teal-600 transition-colors flex items-center gap-1 text-xs font-mono"
                      title="Copier le code"
                    >
                      {copiedCode === pres.join_code ? 'Copié!' : pres.join_code}
                      <Copy size={12} />
                    </button>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">{pres.title}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-4">
                    <Calendar size={12} /> {formatDate(pres.created_at)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onOpenPresentation(pres.id)}
                    >
                      <Edit3 size={14} /> Éditer
                    </Button>
                    <button
                      onClick={() => handleDelete(pres.id)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
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

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle présentation">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Titre de la présentation"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ex: Enquête de satisfaction 2026"
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={creating || !newTitle.trim()}>
              {creating ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
