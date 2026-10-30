'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { useUsers } from '@/lib/api/queries';
import type { User } from '@/lib/api/types';

// "Visualizando como": simula quem está usando o sistema (não há login).
// Define quem é o solicitante de um novo pedido e quem pode aprovar/rejeitar na lista.

const STORAGE_KEY = 'dokimos:viewer-id';
const CHANGE_EVENT = 'dokimos:viewer-change';
/** Persona inicial: Beatriz Lima, a compradora do seed. */
const DEFAULT_VIEWER_EMAIL = 'beatriz.lima@obraflow.dev';

// A escolha fica no localStorage. useSyncExternalStore lê esse valor sem quebrar a hidratação
// (no servidor não há localStorage: usa a persona padrão) e sincroniza entre abas.
function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readStoredId(): number | undefined {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(value) && value > 0 ? value : undefined;
  } catch {
    return undefined; // modo privado, storage bloqueado etc.
  }
}

interface ViewerContextValue {
  viewer: User | undefined;
  users: User[];
  isLoading: boolean;
  /** Falha ao carregar os usuários (API fora do ar). */
  usersError: unknown;
  retryUsers: () => void;
  setViewerId: (id: number) => void;
}

const ViewerContext = createContext<ViewerContextValue | null>(null);

export function ViewerProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, error, refetch } = useUsers();
  const users = useMemo(() => data?.data ?? [], [data]);
  const storedId = useSyncExternalStore(
    subscribe,
    readStoredId,
    () => undefined,
  );

  const viewer =
    users.find((user) => user.id === storedId) ??
    users.find((user) => user.email === DEFAULT_VIEWER_EMAIL) ??
    users[0];

  const setViewerId = useCallback((id: number) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      // sem persistência disponível
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo(
    () => ({
      viewer,
      users,
      isLoading,
      usersError: error,
      retryUsers: () => void refetch(),
      setViewerId,
    }),
    [viewer, users, isLoading, error, refetch, setViewerId],
  );
  return (
    <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>
  );
}

export function useViewer() {
  const context = useContext(ViewerContext);
  if (!context)
    throw new Error('useViewer precisa estar dentro de <ViewerProvider>.');
  return context;
}
