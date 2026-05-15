import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Megaphone, ShieldCheck } from "lucide-react";

type Status = {
  status: string;
  generated_at: string;
  summary: {
    businesses_total: number;
    businesses_configured: number;
    businesses_blocked: number;
    external_posts_published: number;
    external_dms_sent: number;
    external_api_mutations: number;
    social_agents_total: number;
    no_external_send: boolean;
  };
  per_business: Array<{
    business_id: string;
    business_name: string;
    social_status: string;
    profile_completeness: number;
    primary_platforms: string[];
    secondary_platforms: string[];
    brand_voice: string | null;
    primary_cta: string | null;
    content_pillars: string[];
    connected_platforms: number;
    platform_count: number;
    metricool_enabled: boolean;
    manychat_enabled: boolean;
    approval_required: boolean;
    auto_publish_allowed: boolean;
    content_calendar_status: string;
    post_pack_drafts: number;
    approvals_pending: number;
    analytics_ready: boolean;
    next_action: string;
    blockers: string[];
  }>;
  social_agents: Array<{
    agent_key: string;
    agent_name: string;
    operating_status: { status: string; health: string } | null;
  }>;
  safety_audit: { no_external_post: boolean; no_external_dm: boolean; no_external_api_mutation: boolean };
};

export default function SocialMediaBrainPanel() {
  const [data, setData] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("social-brain-status", { body: {} });
      if (err) throw err;
      setData(res as Status);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="tech-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Social Media Brain
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Per-business social readiness, agents, platforms and next actions. Internal drafts only — no external posts, DMs or provider mutation.
            </p>
          </div>
          <Button onClick={run} disabled={loading} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run social brain status"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Businesses" value={data.summary.businesses_total} />
              <Stat label="Configured" value={data.summary.businesses_configured} />
              <Stat label="Blocked" value={data.summary.businesses_blocked} />
              <Stat label="Social agents" value={data.summary.social_agents_total} />
            </div>

            <div className="rounded-md border border-border/60 bg-card/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" /> Safety audit
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div>External posts: <span className="text-foreground">{data.summary.external_posts_published}</span></div>
                <div>External DMs: <span className="text-foreground">{data.summary.external_dms_sent}</span></div>
                <div>External API mutations: <span className="text-foreground">{data.summary.external_api_mutations}</span></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">Per business</div>
              {data.per_business.map((b) => (
                <div key={b.business_id} className="rounded-md border border-border/60 bg-card/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-primary" />
                        <div className="font-medium">{b.business_name}</div>
                        <Badge variant={b.social_status === "configured" ? "default" : "secondary"}>{b.social_status}</Badge>
                        <Badge variant="outline">{b.profile_completeness}% complete</Badge>
                      </div>
                      {b.brand_voice && <div className="mt-1 text-xs text-muted-foreground">{b.brand_voice}</div>}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{b.connected_platforms}/{b.platform_count} platforms connected</div>
                      {b.metricool_enabled && <Badge variant="outline" className="ml-1">Metricool</Badge>}
                      {b.manychat_enabled && <Badge variant="outline" className="ml-1">ManyChat</Badge>}
                    </div>
                  </div>
                  {b.primary_platforms.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {b.primary_platforms.map((p) => <Badge key={p} variant="secondary">{p}</Badge>)}
                      {b.secondary_platforms.map((p) => <Badge key={p} variant="outline">{p}</Badge>)}
                    </div>
                  )}
                  {b.content_pillars.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">Pillars:</span> {b.content_pillars.join(" · ")}
                    </div>
                  )}
                  {b.primary_cta && (
                    <div className="mt-1 text-xs text-muted-foreground"><span className="font-medium">CTA:</span> {b.primary_cta}</div>
                  )}
                  {b.blockers.length > 0 && (
                    <div className="mt-2 text-xs text-amber-400">Blockers: {b.blockers.join(" · ")}</div>
                  )}
                  <div className="mt-2 text-sm"><span className="text-muted-foreground">Next action:</span> {b.next_action}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-sm font-medium">Social agents ({data.social_agents.length})</div>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                {data.social_agents.map((a) => (
                  <div key={a.agent_key} className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-3 py-2 text-sm">
                    <div>{a.agent_name}</div>
                    <Badge variant="outline">{a.operating_status?.status ?? "preview"}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!data && !loading && (
          <div className="text-sm text-muted-foreground">Run social brain status to see per-business social readiness, platforms and agents.</div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}