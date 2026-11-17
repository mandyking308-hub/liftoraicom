import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import BusinessSwitcher from "@/components/founder/hq/BusinessSwitcher";
import { useHqBusiness } from "@/hooks/useHqBusiness";
import { founderAreas, areaRoute } from "@/lib/founderAreas";
import { areaMetrics, areaStatus, hqCount, type CountSpec } from "@/lib/hqMetrics";
import { ArrowRight } from "lucide-react";

const statusStyle = {
  attention: { dot: "bg-destructive", text: "Needs attention" },
  working: { dot: "bg-primary", text: "Has activity" },
  idle: { dot: "bg-muted-foreground/40", text: "Nothing yet" },
} as const;

const today: { label: string; to: string; spec: CountSpec }[] = [
  { label: "Waiting for your approval", to: "/founder/approvals-ops", spec: { table: "master_work_items", biz: true, eq: { status: "waiting_approval" } } },
  { label: "Blocked items", to: "/founder/work-queue", spec: { table: "master_work_items", biz: true, eq: { status: "blocked" } } },
  { label: "Upcoming send bookings", to: "/founder/portfolio-calendar", spec: { table: "portfolio_send_bookings", biz: true, gte: ["starts_at", new Date().toISOString()] } },
  { label: "Safety switches turned on", to: "/founder/system", spec: { table: "external_action_gates", eq: { enabled: true } } },
];

function useCounts(key: string, specs: CountSpec[], biz: string | null) {
  return useQuery({ queryKey: ["hq", key, biz], queryFn: () => Promise.all(specs.map((s) => hqCount(s, biz))) });
}

function AreaBox({ areaKey, biz }: { areaKey: string; biz: string | null }) {
  const area = founderAreas.find((a) => a.key === areaKey)!;
  const metrics = areaMetrics[areaKey] ?? [];
  const { data } = useCounts(areaKey, metrics.map((m) => m.spec), biz);
  const values = data ?? metrics.map(() => null);
  const st = statusStyle[areaStatus(metrics, values)];
  const tools = area.sections.filter((s) => !s.legacy).length;
  return (
    <Link to={areaRoute(area.key)} className="tech-card group flex flex-col gap-3 p-5 rounded-xl border border-border bg-card hover:border-primary transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-muted-foreground">{area.n}</div>
          <h2 className="text-base font-semibold text-foreground">{area.title}</h2>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className={`h-2 w-2 rounded-full ${st.dot}`} />{st.text}</span>
      </div>
      <p className="text-xs text-muted-foreground">{area.summary}</p>
      {metrics.length > 0 && (
        <dl className="grid grid-cols-3 gap-2">
          {metrics.map((m, i) => (
            <div key={m.label}><dt className="text-[10px] text-muted-foreground leading-tight">{m.label}</dt><dd className="text-lg font-semibold text-foreground">{values[i] ?? "—"}</dd></div>
          ))}
        </dl>
      )}
      <div className="mt-auto flex items-center justify-between text-xs text-primary">
        <span>{tools} tools</span><ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

export default function LiftorHQ() {
  const [biz, setBiz] = useHqBusiness();
  const { data: t } = useCounts("today", today.map((x) => x.spec), biz);
  return (
    <FounderLayout>
      <div className="space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Liftor HQ</h1>
            <p className="text-sm text-muted-foreground">Everything across your businesses in one place. Nothing here sends, posts or charges.</p>
          </div>
          <BusinessSwitcher value={biz} onChange={setBiz} />
        </header>

        <section aria-label="Today" className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {today.map((x, i) => (
            <Link key={x.label} to={x.to} className="rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors">
              <div className="text-xs text-muted-foreground">{x.label}</div>
              <div className={`text-2xl font-bold ${(t?.[i] ?? 0) > 0 ? "text-primary" : "text-foreground"}`}>{t?.[i] ?? "—"}</div>
            </Link>
          ))}
        </section>

        <section aria-label="Areas" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {founderAreas.map((a) => <AreaBox key={a.key} areaKey={a.key} biz={biz} />)}
        </section>
      </div>
    </FounderLayout>
  );
}
