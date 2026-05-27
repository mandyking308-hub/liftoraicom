import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRuntimeState, MODE_BEHAVIOR, type RuntimeState } from "@/lib/systemModeEngine";

const toneClass = {
  ok: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
  info: "bg-primary/15 border-primary/40 text-primary",
  watch: "bg-amber-500/15 border-amber-500/40 text-amber-300",
  danger: "bg-rose-500/15 border-rose-500/40 text-rose-300",
} as const;

export default function SystemModeBanner() {
  const [state, setState] = useState<RuntimeState | null>(null);
  useEffect(() => {
    let active = true;
    const load = () => fetchRuntimeState().then((s) => active && setState(s)).catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);
  if (!state) return null;
  const b = MODE_BEHAVIOR[state.mode];
  return (
    <div className={`w-full border-b px-4 py-1.5 text-xs flex items-center justify-between gap-3 ${toneClass[b.tone]}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold uppercase tracking-wide">Runtime: {b.label}</span>
        <span className="opacity-80 truncate">{b.summary}</span>
      </div>
      <Link to="/founder/runtime-mode" className="underline opacity-80 hover:opacity-100 shrink-0">
        Manage
      </Link>
    </div>
  );
}