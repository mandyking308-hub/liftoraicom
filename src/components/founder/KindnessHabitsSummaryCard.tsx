import { useCallback, useEffect, useState } from "react";
import { Activity, RefreshCw, ShieldCheck, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { KINDNESS_HABITS_BUSINESS_ID } from "@/lib/spokeFeeds";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Summary = {
  generated_at: string;
  signups_total: number;
  signups_last_24h: number;
  signups_last_7d: number;
  active_users_last_7d: number;
};

export default function KindnessHabitsSummaryCard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: invokeError } = await supabase.functions.invoke("kindness-habits-summary", {
      body: { business_id: KINDNESS_HABITS_BUSINESS_ID },
    });
    if (invokeError || !data?.ok || !data.summary) {
      setError(true);
      setLoading(false);
      return;
    }
    setSummary(data.summary as Summary);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const metrics = summary ? [
    { label: "Total sign-ups", value: summary.signups_total, icon: Users },
    { label: "Last 24 hours", value: summary.signups_last_24h, icon: UserPlus },
    { label: "Last 7 days", value: summary.signups_last_7d, icon: UserPlus },
    { label: "Active in last 7 days", value: summary.active_users_last_7d, icon: Activity },
  ] : [];

  return (
    <Card aria-label="Kindness Habits sign-ups">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <CardTitle className="text-base">Kindness Habits sign-ups</CardTitle>
            <Badge variant="outline">Kindnesss</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Live, read-only totals from your private project feed.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent aria-live="polite">
        {loading && !summary ? (
          <p className="py-5 text-sm text-muted-foreground">Loading private sign-up totals…</p>
        ) : error && !summary ? (
          <p className="py-5 text-sm text-destructive">The private feed could not be loaded. Check the connection and try Refresh.</p>
        ) : summary ? (
          <>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-border/60 bg-secondary/30 p-3">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><metric.icon className="h-3.5 w-3.5 text-primary" />{metric.label}</dt>
                  <dd className="mt-1 text-2xl font-semibold">{metric.value.toLocaleString("en-GB")}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>Updated {new Date(summary.generated_at).toLocaleString("en-GB", { timeZone: "UTC" })} UTC</span>
              <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />Totals only · no children’s names, emails or personal records</span>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
