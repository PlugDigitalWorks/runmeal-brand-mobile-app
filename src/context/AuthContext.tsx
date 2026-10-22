import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onSessionExpired } from '@/lib/api';
import { clearPendingPayment } from '@/lib/pending-payment';
import { unregisterFromPush } from '@/lib/push';
import { clearSession, getSessionGeneration, loadSession, saveSession, saveUser } from '@/lib/session';
import { getProfile, logout } from '@/services/auth.service';
import type { AuthResponse, User } from '@/types/auth';

type Status = 'loading' | 'signedIn' | 'signedOut';

type AuthValue = {
  user: User | null;
  status: Status;
  /** Signed in: required to add to the cart and to order. */
  isMember: boolean;
  signIn: (auth: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  /** Forgets the session on this phone without telling the API: for an account the API has already deleted. */
  endLocalSession: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await loadSession();
      if (cancelled) return;
      if (!session.tokens || !session.user) {
        setStatus('signedOut');
        return;
      }
      // Signed in straight from the Keychain, offline included; the profile refresh below
      // goes through the silent token refresh and signs out only if the refresh token is dead.
      setUser(session.user);
      setStatus('signedIn');
      const generation = getSessionGeneration();
      try {
        const profile = await getProfile();
        // Signed out or deleted meanwhile: this profile belongs to a session that is gone.
        if (cancelled || !(await saveUser(profile, generation))) return;
        setUser(profile);
      } catch {
        // Offline or a transient error: keep the stored session.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () =>
      onSessionExpired(() => {
        setUser(null);
        setStatus('signedOut');
      }),
    [],
  );

  const signIn = useCallback(async (auth: AuthResponse) => {
    await saveSession(auth);
    setUser(auth.user);
    setStatus('signedIn');
  }, []);

  const endLocalSession = useCallback(async () => {
    await clearSession();
    clearPendingPayment();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const signOut = useCallback(async () => {
    // While the tokens still exist, so the API knows whose push token to drop.
    await unregisterFromPush();
    try {
      await logout();
    } catch {
      // The local session goes either way, as in brandfe.
    }
    await endLocalSession();
  }, [endLocalSession]);

  const value = useMemo(
    () => ({ user, status, isMember: !!user, signIn, signOut, endLocalSession }),
    [user, status, signIn, signOut, endLocalSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
