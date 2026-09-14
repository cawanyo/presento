import { useState } from 'react';
import { Presentation, ArrowRight, ArrowLeft } from 'lucide-react';
import { convex } from '@/lib/convex';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Props {
  onJoin: (joinCode: string) => void;
  onBack?: () => void;
}

export function ParticipantJoin({ onJoin, onBack }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoBack = () => {
    if (onBack) onBack();
    else window.location.hash = '';
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6) {
      setError('Entrez un code à 6 caractères');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await convex.query(api.presentations.getByJoinCode, {
        join_code: code.toUpperCase().trim(),
      });
      if (!data) {
        setError('Code invalide. Aucune présentation trouvée.');
        setLoading(false);
        return;
      }
      onJoin(code.toUpperCase().trim());
    } catch (err) {
      setError('Erreur lors de la vérification du code.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-50 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-4">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors bg-white hover:bg-slate-50 border border-slate-200/90 px-3.5 py-1.5 rounded-full shadow-xs"
          >
            <ArrowLeft size={14} /> Retour à l'accueil
          </button>
        </div>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 mb-4 shadow-sm">
            <Presentation size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Presento</h1>
          <p className="text-slate-500 mt-1.5 text-sm">Participez à une présentation interactive</p>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200/90 p-8 shadow-xl shadow-slate-200/50">
          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
                Code de participation
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 py-4 text-3xl font-mono font-black text-slate-900 text-center tracking-[0.3em] placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all shadow-inner"
                placeholder="ABC123"
                autoFocus
              />
              {error && <p className="mt-2 text-xs font-semibold text-red-600 text-center">{error}</p>}
            </div>
            <Button type="submit" size="lg" className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/20" disabled={loading}>
              {loading ? 'Recherche...' : 'Rejoindre'} <ArrowRight size={18} />
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          Demandez le code à l'animateur ou scannez son QR code
        </p>
      </div>
    </div>
  );
}
