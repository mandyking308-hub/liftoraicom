import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, ShieldAlert, Layers, Megaphone, Target, History, CheckCircle2, AlertTriangle, Lock } from "lucide-react";

async function invoke(name: string, body?: any, method: "POST" | "GET" = "POST", qs?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}${qs ?? ""}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${session?.access_token ?? ""}`, "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });
  return res.json();
}

const SafetyNote = () => (
  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
    <Lock size={10} /> Internal only. No publish, no DM, no provider calls.
  </div>
);

export function SocialProfileGeneratorPanel({ businessId }: { businessId: string }) {
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const run = async (live: boolean) => {
    if (!businessId) return toast.error("Select a business");
    setBusy(true);
    if (!live) {
      const r = await invoke("social-profile-generator-preview", { business_id: businessId });
      setPreview(r); setBusy(false);
      if (!r.ok) toast.error(r.error ?? "Failed");
      return;
    }
    const r = await invoke("social-profile-generator-save", {
      business_id: businessId, dry_run: false, confirmation_phrase: "SAVE SOCIAL OPERATING PROFILE",
    });
    setBusy(false);
    if (!r.ok) {
      if (r.reason === "approved_profile_exists") {
        if (confirm("Approved profile exists. Replace it?")) {
          const r2 = await invoke("social-profile-generator-save", {
            business_id: businessId, dry_run: false,
            confirmation_phrase: "REPLACE APPROVED SOCIAL OPERATING PROFILE",
          });
          if (!r2.ok) return toast.error(r2.reason ?? r2.error ?? "Failed");
          toast.success(`Replaced — v${r2.version_number}`);
        }
        return;
      }
      return toast.error(r.reason ?? r.error ?? "Failed");
    }
    toast.success(`Saved — v${r.version_number}`);
  };

  const gp = preview?.generated_profile;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles size={16} /> Social Operating Profile Generator</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => run(false)} disabled={busy}>Run preview</Button>
          <Button size="sm" onClick={() => run(true)} disabled={busy || !gp}>Save profile</Button>
        </div>
        {gp && (
          <div className="grid md:grid-cols-2 gap-2">
            <div>Business type</div><div className="font-mono">{gp.business_type}</div>
            <div>Confidence</div><div><Badge>{gp.confidence_score}</Badge></div>
            <div>Pillars</div><div>{gp.content_pillars?.length ?? 0}</div>
            <div>Platform rules</div><div>{gp.platform_rules?.length ?? 0}</div>
            <div>Offer mappings</div><div>{gp.offer_mappings?.length ?? 0}</div>
            <div>Risk flags</div><div>{gp.risk_flags?.length ?? 0}</div>
            <div>Sensitive sectors</div><div>{(gp.sensitive_sectors ?? []).join(", ") || "none"}</div>
            <div>Missing inputs</div><div className="text-yellow-400">{(gp.missing_inputs ?? []).join(", ") || "none"}</div>
          </div>
        )}
        <SafetyNote />
      </CardContent>
    </Card>
  );
}

export function SocialContentPillarsPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const refresh = async () => {
    if (!businessId) return;
    const { data } = await supabase.from("business_social_content_pillars")
      .select("*").eq("business_id", businessId).order("priority_score", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);

  const decide = async (id: string, status: string) => {
    await supabase.from("business_social_content_pillars").update({ approval_status: status }).eq("id", id);
    refresh();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Layers size={16} /> Content Pillars</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-xs">
        {rows.length === 0 && <p className="text-muted-foreground">No pillars yet — run the generator.</p>}
        {rows.map(r => (
          <div key={r.id} className="p-2 rounded bg-secondary/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{r.pillar_name}</span>
              <div className="flex gap-1 items-center">
                <Badge variant="secondary">{r.funnel_stage ?? "—"}</Badge>
                <Badge variant="outline">{r.approval_status}</Badge>
                <span className="text-muted-foreground">p{r.priority_score}</span>
              </div>
            </div>
            <p className="text-muted-foreground">{r.pillar_description}</p>
            <p className="text-[10px] text-muted-foreground">Platforms: {(r.recommended_platforms ?? []).join(", ") || "—"}</p>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => decide(r.id, "approved")}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => decide(r.id, "needs_review")}>Needs review</Button>
              <Button size="sm" variant="ghost" onClick={() => decide(r.id, "archived")}>Archive</Button>
            </div>
          </div>
        ))}
        <SafetyNote />
      </CardContent>
    </Card>
  );
}

export function SocialPlatformRulesPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const refresh = async () => {
    if (!businessId) return;
    const { data } = await supabase.from("business_social_platform_rules")
      .select("*").eq("business_id", businessId).order("suitability_score", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);

  const toggle = async (id: string, current: boolean) => {
    await supabase.from("business_social_platform_rules").update({ is_active: !current }).eq("id", id);
    refresh();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone size={16} /> Platform Rules</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-xs">
        {rows.length === 0 && <p className="text-muted-foreground">No platform rules — run the generator.</p>}
        {rows.map(r => (
          <div key={r.id} className="p-2 rounded bg-secondary/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{r.platform}</span>
              <div className="flex gap-1 items-center">
                <Badge variant="secondary">score {r.suitability_score}</Badge>
                <Badge variant={r.is_active ? "default" : "outline"}>{r.is_active ? "active" : "inactive"}</Badge>
                {r.approval_required && <Badge variant="outline">approval req</Badge>}
              </div>
            </div>
            <p>{r.recommended_use}</p>
            <p className="text-[10px] text-muted-foreground">Types: {(r.content_types ?? []).join(", ")}</p>
            <p className="text-[10px] text-muted-foreground">Cadence: {r.posting_frequency ?? "—"}</p>
            {r.risk_notes && <p className="text-yellow-400">{r.risk_notes}</p>}
            <Button size="sm" variant="outline" onClick={() => toggle(r.id, r.is_active)}>{r.is_active ? "Deactivate" : "Activate"}</Button>
          </div>
        ))}
        <SafetyNote />
      </CardContent>
    </Card>
  );
}

export function SocialOfferMappingsPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    supabase.from("business_social_offer_mappings").select("*").eq("business_id", businessId)
      .order("priority_score", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, [businessId]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target size={16} /> Offer → Content Mappings</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-xs">
        {rows.length === 0 && <p className="text-muted-foreground">No offers mapped yet.</p>}
        {rows.map(o => (
          <div key={o.id} className="p-2 rounded bg-secondary/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{o.offer_name}</span>
              <Badge variant="secondary">{o.funnel_stage}</Badge>
            </div>
            <p className="text-muted-foreground">{o.offer_summary}</p>
            <p className="text-[10px]">CTAs: {(o.suggested_ctas ?? []).join(" · ") || "—"}</p>
            <p className="text-[10px]">Proof needed: {(o.proof_needed ?? []).join(", ") || "—"}</p>
            {o.metadata?.missing?.length > 0 && (
              <p className="text-yellow-400">Missing: {o.metadata.missing.join(", ")}</p>
            )}
          </div>
        ))}
        <SafetyNote />
      </CardContent>
    </Card>
  );
}

export function SocialRiskFlagsPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const refresh = async () => {
    if (!businessId) return;
    const { data } = await supabase.from("business_social_risk_flags")
      .select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);

  const scan = async (live: boolean) => {
    const r = await invoke("social-profile-risk-scan", {
      business_id: businessId, dry_run: !live,
      confirmation_phrase: live ? "SAVE SOCIAL RISK FLAGS" : undefined,
    });
    if (!r.ok) return toast.error(r.reason ?? r.error ?? "Failed");
    toast.success(live ? `Saved ${r.saved} flags` : `Detected ${r.detected} flags (dry-run)`);
    if (live) refresh();
  };
  const setStatus = async (id: string, status: string) => {
    await supabase.from("business_social_risk_flags").update({ status }).eq("id", id);
    refresh();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert size={16} /> Risk Flags</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => scan(false)}>Dry-run scan</Button>
          <Button size="sm" onClick={() => scan(true)}>Save scanned flags</Button>
        </div>
        {rows.length === 0 && <p className="text-muted-foreground">No risk flags yet.</p>}
        {rows.map(r => (
          <div key={r.id} className="p-2 rounded bg-secondary/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{r.risk_type}</span>
              <div className="flex gap-1">
                <Badge variant={r.risk_level === "critical" ? "destructive" : "secondary"}>{r.risk_level}</Badge>
                <Badge variant="outline">{r.status}</Badge>
              </div>
            </div>
            <p>{r.risk_description}</p>
            {r.suggested_guardrail && <p className="text-yellow-400">Guardrail: {r.suggested_guardrail}</p>}
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "acknowledged")}>Acknowledge</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "mitigated")}>Mitigated</Button>
              <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "archived")}>Archive</Button>
            </div>
          </div>
        ))}
        <SafetyNote />
      </CardContent>
    </Card>
  );
}

export function SocialProfileReadinessPanel({ businessId }: { businessId: string }) {
  const [r, setR] = useState<any>(null);
  const refresh = async () => {
    if (!businessId) return;
    const j = await invoke("social-profile-readiness-check", undefined, "GET", `?business_id=${businessId}`);
    setR(j);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);

  const yn = (v: boolean) => v ? <CheckCircle2 size={12} className="inline text-green-400" /> : <AlertTriangle size={12} className="inline text-yellow-400" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Profile Readiness</CardTitle>
        <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
      </CardHeader>
      <CardContent className="text-xs grid grid-cols-2 gap-2">
        <span>Profile</span><span>{r?.profile_status ?? "none"} · conf {r?.confidence_score ?? 0}</span>
        <span>Pillars</span><span>{r?.approved_pillars_count ?? 0} / {r?.content_pillars_count ?? 0} approved</span>
        <span>Platforms</span><span>{r?.active_platform_rules_count ?? 0} active / {r?.platform_rules_count ?? 0}</span>
        <span>Offer mappings</span><span>{r?.offer_mappings_count ?? 0}</span>
        <span>Open risks</span><span>{r?.risk_flags_open ?? 0} ({r?.critical_risk_flags ?? 0} critical)</span>
        <span>Content gen ready</span><span>{yn(!!r?.ready_for_content_generation)}</span>
        <span>Calendar ready</span><span>{yn(!!r?.ready_for_calendar_generation)}</span>
        <span>Reply drafting ready</span><span>{yn(!!r?.ready_for_reply_drafting)}</span>
        <span>Publish queue</span><span><Lock size={10} className="inline" /> LOCKED</span>
      </CardContent>
    </Card>
  );
}

export function SocialProfileVersionHistoryPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const refresh = async () => {
    if (!businessId) return;
    const { data } = await supabase.from("business_social_profile_versions")
      .select("id,version_number,version_status,change_summary,founder_notes,created_at")
      .eq("business_id", businessId).order("version_number", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);

  const snapshot = async () => {
    const r = await invoke("social-profile-version-create", {
      business_id: businessId, dry_run: false, confirmation_phrase: "CREATE SOCIAL PROFILE VERSION",
    });
    if (!r.ok) return toast.error(r.reason ?? r.error ?? "Failed");
    toast.success(`Created v${r.version?.version_number}`); refresh();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><History size={16} /> Version History</CardTitle>
        <Button size="sm" variant="outline" onClick={snapshot}>Snapshot now</Button>
      </CardHeader>
      <CardContent className="text-xs space-y-1">
        {rows.length === 0 && <p className="text-muted-foreground">No versions yet.</p>}
        {rows.map((v, i) => (
          <div key={v.id} className="p-2 rounded bg-secondary/40 flex items-center justify-between">
            <span>v{v.version_number} · {v.change_summary ?? "—"}</span>
            <Badge variant={i === 0 ? "default" : "outline"}>{i === 0 ? "current" : v.version_status}</Badge>
          </div>
        ))}
        <SafetyNote />
      </CardContent>
    </Card>
  );
}