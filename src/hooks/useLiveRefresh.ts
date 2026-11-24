import { useEffect, useRef, useState } from "react";

/** Re-runs `load` every `ms` while the tab is visible and on return to the tab; returns last refresh time. */
export function useLiveRefresh(load: () => unknown, ms = 30_000) {
  const ref = useRef(load);
  ref.current = load;
  const [at, setAt] = useState<Date | null>(null);
  useEffect(() => { void Promise.resolve(load()).then(() => setAt(new Date())); }, [load]); // reload when inputs (e.g. selected campaign) change
  useEffect(() => {
    let alive = true;
    const run = async () => { if (document.visibilityState !== "visible") return; await ref.current(); if (alive) setAt(new Date()); };
    const t = setInterval(run, ms);
    document.addEventListener("visibilitychange", run);
    return () => { alive = false; clearInterval(t); document.removeEventListener("visibilitychange", run); };
  }, [ms]);
  return at;
}
