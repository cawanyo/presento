import { useEffect, useState, useCallback } from 'react';
import { Presentation, Users } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AdminLogin } from '@/pages/AdminLogin';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { PresentationEditor } from '@/pages/PresentationEditor';
import { LivePresentation } from '@/pages/LivePresentation';
import { ParticipantJoin } from '@/pages/ParticipantJoin';
import { ParticipantView } from '@/pages/ParticipantView';

type AdminView =
  | { name: 'dashboard' }
  | { name: 'editor'; id: string }
  | { name: 'live'; id: string };

type Route =
  | { name: 'home' }
  | { name: 'join' }
  | { name: 'participant'; code: string }
  | { name: 'admin'; view: AdminView };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (hash.startsWith('join/')) {
    return { name: 'participant', code: hash.slice(5) };
  }
  if (hash === 'join') {
    return { name: 'join' };
  }
  if (hash.startsWith('admin/')) {
    const parts = hash.slice(6).split('/');
    if (parts[0] === 'editor' && parts[1]) {
      return { name: 'admin', view: { name: 'editor', id: parts[1] } };
    }
    if (parts[0] === 'live' && parts[1]) {
      return { name: 'admin', view: { name: 'live', id: parts[1] } };
    }
    return { name: 'admin', view: { name: 'dashboard' } };
  }
  if (hash === 'admin') {
    return { name: 'admin', view: { name: 'dashboard' } };
  }
  return { name: 'home' };
}

function navigate(route: Route) {
  if (route.name === 'home') window.location.hash = '';
  else if (route.name === 'join') window.location.hash = '#/join';
  else if (route.name === 'participant') window.location.hash = `#/join/${route.code}`;
  else if (route.name === 'admin') {
    if (route.view.name === 'dashboard') window.location.hash = '#/admin';
    else if (route.view.name === 'editor') window.location.hash = `#/admin/editor/${route.view.id}`;
    else if (route.view.name === 'live') window.location.hash = `#/admin/live/${route.view.id}`;
  }
}

function AppContent() {
  const { isAdmin, loading } = useAuth();
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const goHome = useCallback(() => navigate({ name: 'home' }), []);

  if (route.name === 'home') {
    return <HomePage onAdmin={() => navigate({ name: 'admin', view: { name: 'dashboard' } })} onJoin={() => navigate({ name: 'join' })} />;
  }

  if (route.name === 'join') {
    return <ParticipantJoin onJoin={(code) => navigate({ name: 'participant', code })} />;
  }

  if (route.name === 'participant') {
    return <ParticipantView joinCode={route.code} onExit={goHome} />;
  }

  if (route.name === 'admin') {
    if (loading) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    if (!isAdmin) {
      return <AdminLogin />;
    }
    if (route.view.name === 'dashboard') {
      return (
        <AdminDashboard
          onOpenPresentation={(id) => navigate({ name: 'admin', view: { name: 'editor', id } })}
        />
      );
    }
    if (route.view.name === 'editor') {
      return (
        <PresentationEditor
          presentationId={route.view.id}
          onBack={() => navigate({ name: 'admin', view: { name: 'dashboard' } })}
          onPresent={(id) => navigate({ name: 'admin', view: { name: 'live', id } })}
        />
      );
    }
    if (route.view.name === 'live') {
      return (
        <LivePresentation
          presentationId={route.view.id}
          onBack={() => navigate({ name: 'admin', view: { name: 'dashboard' } })}
        />
      );
    }
  }

  return null;
}

function HomePage({ onAdmin, onJoin }: { onAdmin: () => void; onJoin: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-teal-500/20 border border-teal-400/30 mb-6">
          <Presentation className="text-teal-400" size={40} />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-3">Presento</h1>
        <p className="text-slate-400 text-lg mb-10">Présentations interactives en temps réel</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={onAdmin}
            className="group rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 hover:border-teal-400/40 hover:bg-white/10 transition-all duration-200"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-500/20 mb-4 group-hover:scale-110 transition-transform">
              <Presentation className="text-teal-400" size={24} />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Animateur</h2>
            <p className="text-sm text-slate-400">Créer et présenter</p>
          </button>

          <button
            onClick={onJoin}
            className="group rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 hover:border-teal-400/40 hover:bg-white/10 transition-all duration-200"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-500/20 mb-4 group-hover:scale-110 transition-transform">
              <Users className="text-teal-400" size={24} />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Participant</h2>
            <p className="text-sm text-slate-400">Rejoindre avec un code</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
