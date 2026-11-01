import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getIdentity, login } from "@/auth/api";
import { clearToken, getToken, onUnauthorized, setToken } from "@/lib/session";
import { type Identity } from "@dokimos/shared";

interface AuthState {
  user: Identity | null;
  checking: boolean;
  error: unknown;
  sessionEnded: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
  retry: () => void;
}
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Identity | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [sessionEnded, setSessionEnded] = useState(false);
  // Bumped by every sign-in, sign-out and identity check, so a response that arrives after a newer one is ignored.
  const generation = useRef(0);
  function signOut() {
    generation.current++;
    clearToken();
    setSessionEnded(true);
    setUser(null);
    setError(null);
    setChecking(false);
  }
  useEffect(() => {
    return onUnauthorized(signOut);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const current = ++generation.current;
    setError(null);
    if (!getToken()) {
      setChecking(false);
      return;
    }
    setChecking(true);
    getIdentity(controller.signal)
      .then((identity) => {
        if (current === generation.current && !controller.signal.aborted) setUser(identity);
      })
      .catch((failure: unknown) => {
        if (current === generation.current && !controller.signal.aborted) setError(failure);
      })
      .finally(() => {
        if (current === generation.current && !controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, [attempt]);
  async function signIn(username: string, password: string) {
    const current = ++generation.current;
    const result = await login(username, password);
    if (current !== generation.current) return;
    setToken(result.accessToken);
    setUser(result.user);
    setError(null);
    setChecking(false);
    setSessionEnded(false);
  }
  return (
    <AuthContext.Provider
      value={{ user, checking, error, sessionEnded, signIn, signOut, retry: () => setAttempt((a) => a + 1) }}
    >
      {/* Remount the protected tree when the identity changes; no former-user data survives. */}
      <div key={user?.id ?? "anonymous"}>{children}</div>
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Missing AuthProvider");
  return value;
}
