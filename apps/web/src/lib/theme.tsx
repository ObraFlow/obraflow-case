import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
const key = "obraflow.theme";
function savedTheme(): ThemeMode {
  try {
    const value = localStorage.getItem(key);
    if (value === "light" || value === "dark") return value;
  } catch {
    /* Browser storage unavailable: use system. */
  }
  return "system";
}
function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle(
    "dark",
    mode === "dark" || (mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches),
  );
}
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(savedTheme);
  useEffect(() => {
    const system = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyTheme(mode);
    apply();
    system.addEventListener("change", apply);
    return () => system.removeEventListener("change", apply);
  }, [mode]);
  function changeMode(next: ThemeMode) {
    try {
      localStorage.setItem(key, next);
    } catch {
      /* Theme still works in memory. */
    }
    setMode(next);
  }
  return { mode, changeMode };
}
