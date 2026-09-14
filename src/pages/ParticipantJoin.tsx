import { useState } from 'react';
import { Presentation, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Props {
  onJoin: (joinCode: string) => void;
}

export function ParticipantJoin({ onJoin }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6) {
      setError('Entrez un code à 6 caractères');
      return;
    }
    setError(null);
    setLoading(true);
    const { data } = await supabase
      .from('presentations')
      .select('join_code')
      .eq('join_code', code.toUpperCase().trim())
      .maybeSingle();
    if (!data) {
      setError('Code invalide. Aucune présentation trouvée.');
      setLoading(false);
      return;
    }
    onJoin(code.toUpperCase().trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-400/30 mb-4">
            <Presentation className="text-teal-400" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Presento</h1>
          <p className="text-slate-400 mt-2 text-sm">Participez à une présentation interactive</p>
        </div>

        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">Code de participation</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-2xl font-mono font-bold text-white text-center tracking-[0.3em] placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
                placeholder="ABC123"
                autoFocus
              />
              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Recherche...' : 'Rejoindre'} <ArrowRight size={18} />
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Demandez le code à l'animateur ou scannez le QR code
        </p>
      </div>
    </div>
  );
}
