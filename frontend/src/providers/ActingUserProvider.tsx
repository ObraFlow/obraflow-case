import { useUsers } from "@/hooks/queries";
import type { User } from "@/lib/types";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "obraflow.actingUserId";

interface ActingUserCtx {
  actingUserId: string | null;
  setActingUserId: (id: string | null) => void;
  actingUser: User | null;
  users: User[];
}
const Ctx = createContext<ActingUserCtx | undefined>(undefined);

export function ActingUserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: users } = useUsers();
  const [actingUserId, setActingUserIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  );

  useEffect(() => {
    if (actingUserId) localStorage.setItem(STORAGE_KEY, actingUserId);
    else localStorage.removeItem(STORAGE_KEY);
  }, [actingUserId]);

  // Default: primeiro usuário quando a lista carrega e ainda não há seleção.
  useEffect(() => {
    if (!actingUserId && users && users.length)
      setActingUserIdState(users[0].id);
  }, [users, actingUserId]);

  const value = useMemo<ActingUserCtx>(
    () => ({
      actingUserId,
      setActingUserId: setActingUserIdState,
      actingUser: users?.find((u) => u.id === actingUserId) ?? null,
      users: users ?? [],
    }),
    [actingUserId, users],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActingUser() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useActingUser deve estar dentro de ActingUserProvider");
  return ctx;
}
