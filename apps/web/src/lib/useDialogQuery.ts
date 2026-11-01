import { useSearchParams } from "react-router";
import { useLayoutEffect, useRef } from "react";

/** Only UI identity goes into the URL; drafts and API payloads stay page-owned. */
export function useDialogQuery(key: string, locked = false) {
  const [params, setParams] = useSearchParams();
  const value = params.get(key);
  const confirmed = useRef(value);
  useLayoutEffect(() => {
    if (!locked) {
      confirmed.current = value;
      return;
    }
    // Browser Back must not hide an in-flight write. Explicit successful closes
    // update the reference below and remain allowed.
    if (value !== confirmed.current)
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (confirmed.current) next.set(key, confirmed.current);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
  }, [value, locked, key, setParams]);
  function setValue(next: string | null) {
    confirmed.current = next;
    setParams((previous) => {
      const updated = new URLSearchParams(previous);
      if (next) updated.set(key, next);
      else updated.delete(key);
      return updated;
    });
  }
  return [locked ? confirmed.current : value, setValue] as const;
}
