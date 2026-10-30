'use client';

import { useEffect, useState } from 'react';

/** Valor "atrasado": só muda depois de `delay` ms sem novas mudanças (ex.: enquanto o usuário digita). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
