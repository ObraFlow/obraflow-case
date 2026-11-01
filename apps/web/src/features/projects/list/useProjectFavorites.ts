import { useEffect, useState } from "react";

function read(key: string): string[] {
  const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : [];
}

function load(key: string) {
  try {
    return { ids: read(key), unavailable: false };
  } catch {
    return { ids: [] as string[], unavailable: true };
  }
}

/** Browser-local preference, isolated per identity; never sent to the API. */
export function useProjectFavorites(userId: string) {
  const key = `obraflow.projectFavorites:${userId}`;
  const [state, setState] = useState(() => load(key));
  useEffect(() => {
    setState(load(key));
    const sync = (event: StorageEvent) => {
      if (event.key === key || event.key === null) setState(load(key));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
    // Identity changes remount the protected tree; the key also scopes tab sync.
  }, [key]);
  function toggle(id: string) {
    let current = state.ids;
    try {
      current = read(key);
    } catch {
      /* Keep the current view usable if storage is blocked. */
    }
    const ids = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    try {
      localStorage.setItem(key, JSON.stringify(ids));
      setState({ ids, unavailable: false });
    } catch {
      setState({ ids, unavailable: true });
    }
  }
  return { favorites: state.ids, toggleFavorite: toggle, storageUnavailable: state.unavailable };
}
