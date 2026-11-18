import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { loginAvailable, supabase } from '../lib/supabase';
import { flushNow, stopSync, syncNow } from '../lib/sync';

type SyncState = 'idle' | 'syncing' | 'ok' | 'error';

type Account = {
  session: Session | null;
  name: string | null;
  avatar: string | null;
  sync: SyncState;
  available: boolean;
  // Cambia cuando la sincronización trae datos nuevos: la app se vuelve a cargar con ellos.
  version: number;
  signIn: () => void;
  signOut: () => void;
};

const AccountContext = createContext<Account | null>(null);

export function useAccount() {
  return useContext(AccountContext);
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sync, setSync] = useState<SyncState>('idle');
  const [version, setVersion] = useState(0);

  const runSync = useCallback(async (s: Session) => {
    setSync('syncing');
    try {
      if (await syncNow(s)) setVersion((v) => v + 1);
      setSync('ok');
    } catch {
      setSync('error');
    }
  }, []);

  useEffect(() => {
    let synced: string | null = null;
    const handle = (s: Session | null) => {
      setSession(s);
      if (s && synced !== s.user.id) {
        synced = s.user.id;
        runSync(s);
      }
      if (!s) {
        synced = null;
        stopSync();
        setSync('idle');
      }
    };
    supabase.auth.getSession().then(({ data }) => handle(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => handle(s));
    return () => data.subscription.unsubscribe();
  }, [runSync]);

  // Antes de cerrar o esconder la página, se sube lo pendiente.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onHide = () => {
      flushNow();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  const signIn = useCallback(() => {
    if (!loginAvailable) return;
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
  }, []);

  const signOut = useCallback(async () => {
    await flushNow();
    await supabase.auth.signOut();
  }, []);

  const meta = session?.user.user_metadata ?? {};
  const value: Account = {
    session,
    name: (meta.full_name as string) ?? (meta.name as string) ?? session?.user.email ?? null,
    avatar: (meta.avatar_url as string) ?? null,
    sync,
    available: loginAvailable,
    version,
    signIn,
    signOut,
  };
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
