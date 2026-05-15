import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Clock, Sun, Moon } from "lucide-react";

function localTime(tz: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hour12: false,
      weekday: "short", hour: "2-digit", minute: "2-digit",
    }).format(new Date());
  } catch {
    return "—";
  }
}

function isOpen(tz: string, start: string, end: string, days: string[]) {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false, weekday: "long",
      hour: "2-digit", minute: "2-digit",
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
    const wd = (parts.weekday ?? "").toLowerCase();
    const h = Number(parts.hour ?? "0");
    const m = Number(parts.minute ?? "0");
    if (!days.map(d => d.toLowerCase()).includes(wd)) return false;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const cur = h * 60 + m;
    return cur >= sh * 60 + sm && cur < eh * 60 + em;
  } catch {
    return false;
  }
}

export default function GlobalOperatingClockPanel() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  const { data: markets } = useQuery({
    queryKey: ["global_market_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("global_market_profiles").select("*").order("market_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: briefs } = useQuery({
    queryKey: ["founder_brief_windows"],
    queryFn: async () => {
      const { data, error } = await supabase.from("founder_brief_windows").select("*").order("scheduled_time");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: contactTzCounts } = useQuery({
    queryKey: ["contact_tz_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_timezone_profiles")
        .select("detected_timezone");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        const k = r.detected_timezone ?? "unknown";
        counts[k] = (counts[k] ?? 0) + 1;
      });
      return counts;
    },
  });

  const enrichedMarkets = useMemo(
    () =>
      (markets ?? []).map((m: any) => {
        const start = (m.business_start_time ?? "09:00").slice(0, 5);
        const end = (m.business_end_time ?? "17:00").slice(0, 5);
        const days = (m.business_days ?? []) as string[];
        return {
          ...m,
          local: localTime(m.default_timezone),
          open: isOpen(m.default_timezone, start, end, days),
          window: `${start}–${end}`,
        };
      }),
    [markets],
  );

  const openCount = enrichedMarkets.filter((m) => m.open).length;

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Globe size={14} className="text-primary" />
          Global Operating Clock
          <Badge variant="secondary" className="text-[9px] ml-2">
            {openCount}/{enrichedMarkets.length} markets open
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <section>
          <h3 className="text-xs font-semibold mb-2">Markets · 24-hour map</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {enrichedMarkets.map((m) => (
              <div key={m.id} className="p-2 rounded-md border border-border/40 bg-secondary/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{m.market_name}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] ${m.open ? "text-emerald-300 border-emerald-500/40" : "text-muted-foreground"}`}
                  >
                    {m.open ? <Sun size={9} className="inline mr-1" /> : <Moon size={9} className="inline mr-1" />}
                    {m.open ? "open" : "closed"}
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  {m.default_timezone} · {m.local}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Hours {m.window} · {(m.business_days ?? []).length} days/wk
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold mb-2">Contacts by timezone</h3>
          <div className="flex flex-wrap gap-1">
            {Object.entries(contactTzCounts ?? {}).map(([tz, n]) => (
              <Badge key={tz} variant="secondary" className="text-[10px]">
                {tz} · {n}
              </Badge>
            ))}
            {Object.keys(contactTzCounts ?? {}).length === 0 && (
              <p className="text-[10px] text-muted-foreground">No contact timezone profiles resolved yet.</p>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <Clock size={12} /> Founder brief windows
          </h3>
          <div className="space-y-1">
            {(briefs ?? []).map((b: any) => (
              <div key={b.id} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                <span className="font-mono">{b.brief_label}</span>
                <span className="text-muted-foreground">{b.timezone} · {String(b.scheduled_time).slice(0, 5)}</span>
                <Badge variant={b.enabled ? "secondary" : "outline"} className="text-[9px]">
                  {b.enabled ? "enabled" : "disabled"}
                </Badge>
              </div>
            ))}
          </div>
        </section>

        <p className="text-[10px] text-muted-foreground">
          Recommendations only. No outbound cron, no sends, no provider mutation.
        </p>
      </CardContent>
    </Card>
  );
}