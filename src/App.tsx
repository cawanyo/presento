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
    return <ParticipantJoin onJoin={(code) => navigate({ name: 'participant', code })} onBack={goHome} />;
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
      return <AdminLogin onBack={goHome} />;
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

  return <HomePage onAdmin={() => navigate({ name: 'admin', view: { name: 'dashboard' } })} onJoin={() => navigate({ name: 'join' })} />;
}

function HomePage({ onAdmin, onJoin }: { onAdmin: () => void; onJoin: () => void }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden selection:bg-teal-100">
      {/* Subtle ambient light accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-50 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg text-center relative z-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-teal-600 to-teal-400 text-white shadow-xl shadow-teal-500/25 mb-6">
          <Presentation size={38} />
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-3">
          Presento
        </h1>
        <p className="text-slate-500 text-base sm:text-lg mb-10 max-w-md mx-auto">
          Présentations et sondages interactifs en direct, simples et élégants
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={onAdmin}
            className="group rounded-3xl bg-white border-2 border-slate-200/90 p-8 hover:border-teal-500 hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-300 text-left flex flex-col justify-between"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 mb-6 group-hover:scale-110 group-hover:bg-teal-500 group-hover:text-white transition-all shadow-sm">
              <Presentation size={26} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-teal-600 transition-colors">
                Animateur
              </h2>
              <p className="text-sm text-slate-500">
                Créer, éditer et présenter en direct
              </p>
            </div>
          </button>

          <button
            onClick={onJoin}
            className="group rounded-3xl bg-white border-2 border-slate-200/90 p-8 hover:border-teal-500 hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-300 text-left flex flex-col justify-between"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
              <Users size={26} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                Participant
              </h2>
              <p className="text-sm text-slate-500">
                Rejoindre une session avec un code PIN
              </p>
            </div>
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
