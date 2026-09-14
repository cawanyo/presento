import { createContext, useContext, useState, type ReactNode } from 'react';

const ADMIN_CODE = 'ICCToulouse2026';

interface AuthContextValue {
  isAdmin: boolean;
  loading: boolean;
  signIn: (code: string) => { error: string | null };
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('presento_admin') === 'true');

  const signIn = (code: string) => {
    if (code.trim() === ADMIN_CODE) {
      sessionStorage.setItem('presento_admin', 'true');
      setIsAdmin(true);
      return { error: null };
    }
    return { error: 'Code incorrect' };
  };

  const signOut = () => {
    sessionStorage.removeItem('presento_admin');
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, loading: false, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
