import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onSessionExpired } from '@/lib/api';
import { clearSession, loadSession, saveSession, saveUser } from '@/lib/session';
import { createGuestSession, getProfile, logout } from '@/services/auth.service';
import type { AuthResponse, User } from '@/types/auth';

type Status = 'loading' | 'signedIn' | 'signedOut';

type AuthValue = {
  user: User | null;
  status: Status;
  /** Signed in with a real account (a table guest is a session, not a member). */
  isMember: boolean;
  signIn: (auth: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  /** A session for the table journey: the member's if signed in, else a fresh guest. */
  ensureSession: () => Promise<User>;
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const guestRequest = useRef<Promise<User> | null>(null);

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
      try {
        const profile = await getProfile();
        if (cancelled) return;
        const next = { ...profile, isGuest: session.user.isGuest };
        setUser(next);
        await saveUser(next);
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

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      // The local session goes either way, as in brandfe.
    }
    await clearSession();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const ensureSession = useCallback(async () => {
    if (user) return user;
    guestRequest.current ??= createGuestSession()
      .then(async (auth) => {
        await signIn(auth);
        return auth.user;
      })
      .finally(() => {
        guestRequest.current = null;
      });
    return guestRequest.current;
  }, [user, signIn]);

  const value = useMemo(
    () => ({ user, status, isMember: !!user && !user.isGuest, signIn, signOut, ensureSession }),
    [user, status, signIn, signOut, ensureSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
