import { useCallback, useEffect, useRef, useState } from "react";

/** Loads on open (and when inputs change); `refresh` reloads on demand. Returns last update time. No timers, by founder choice. */
export function useLiveRefresh(load: () => unknown) {
  const ref = useRef(load);
  ref.current = load;
  const [at, setAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void Promise.resolve(load()).then(() => setAt(new Date())); }, [load]);
  const refresh = useCallback(async () => { setBusy(true); try { await ref.current(); setAt(new Date()); } finally { setBusy(false); } }, []);
  return { at, refresh, busy };
}
