import { useState } from 'react';
import { Presentation, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';

interface Props {
  onBack?: () => void;
}

export function AdminLogin({ onBack }: Props) {
  const { signIn } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = signIn(code);
    if (error) setError(error);
  };

  const handleGoBack = () => {
    if (onBack) onBack();
    else window.location.hash = '';
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
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 mb-4 shadow-sm">
            <Presentation size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Presento</h1>
          <p className="text-slate-500 mt-1.5 text-sm">Connexion à l'espace animateur</p>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200/90 p-8 shadow-xl shadow-slate-200/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Code d'accès
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                  placeholder="Entrez votre code"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-semibold text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/20">
              Se connecter <ArrowRight size={18} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
