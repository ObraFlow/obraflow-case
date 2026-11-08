import { useEffect, useState } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'
const KEY = 'obraflow.theme'

function read(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

// "system" não grava data-theme: o CSS segue o prefers-color-scheme sozinho.
// O index.html aplica o valor salvo antes do React montar, para não piscar.
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(read)

  useEffect(() => {
    const root = document.documentElement
    if (mode === 'system') delete root.dataset.theme
    else root.dataset.theme = mode
    try {
      if (mode === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, mode)
    } catch {
      /* sem storage: vale só nesta visita */
    }
  }, [mode])

  return [mode, setMode] as const
}
