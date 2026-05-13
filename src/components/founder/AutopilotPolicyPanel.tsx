import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const Toggle = ({ label, checked, onChange, hint }: any) => (
  <div className="flex items-center justify-between gap-3 p-2 rounded hover:bg-secondary/30">
    <div>
      <p className="text-sm">{label}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
    <Switch checked={!!checked} onCheckedChange={onChange} />
  </div>
);

const NumField = ({ label, value, onChange, hint }: any) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    <Input type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} className="h-8" />
    {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
  </div>
);

export default function AutopilotPolicyPanel({ businessName = "Neon Candy" }: { businessName?: string }) {
  const [policy, setPolicy] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: bizId } = useQuery({
    queryKey: ["autopilot-bizid", businessName],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id").eq("name", businessName).maybeSingle();
      return data?.id ?? null;
    },
  });

  const { data: loaded } = useQuery({
    queryKey: ["autopilot-policy-load", bizId],
    enabled: !!bizId,
    queryFn: async () => {
      const { data } = await supabase.from("business_autopilot_settings" as never)
        .select("*").eq("business_id", bizId).maybeSingle();
      return data;
    },
  });

  useEffect(() => { if (loaded) setPolicy(loaded); }, [loaded]);

  if (!policy) {
    return (
      <Card className="bg-card border-border/50">
        <CardContent className="p-6 text-sm text-muted-foreground">
          {bizId ? "Loading policy…" : "Business not found."}
        </CardContent>
      </Card>
    );
  }

  const set = (k: string, v: any) => setPolicy({ ...policy, [k]: v });

  const save = async () => {
    setSaving(true);
    try {
      const prev = (loaded ?? {}) as any;
      const sensitive: string[] = [];
      if (prev.auto_send_after_queue !== policy.auto_send_after_queue && policy.auto_send_after_queue) {
        sensitive.push("enable_auto_send");
      }
      if (policy.apollo_reveal_daily_credit_budget > (prev.apollo_reveal_daily_credit_budget ?? 0) * 2 + 1) {
        sensitive.push("budget_increase");
      }
      if (prev.sending_provider_mode !== policy.sending_provider_mode) {
        sensitive.push("provider_approval");
      }

      const { error } = await supabase.from("business_autopilot_settings" as never)
        .update(policy as never).eq("id", policy.id);
      if (error) throw error;

      for (const t of sensitive) {
        await supabase.from("founder_decisions" as never).insert({
          business_id: bizId,
          decision_type: t,
          title: `Policy change: ${t}`,
          finding: `Founder updated autopilot policy for ${businessName}`,
          recommendation: "Auto-approved by founder via policy editor",
          status: "approved",
          decided_at: new Date().toISOString(),
          related_ids: { policy_id: policy.id, change: policy } as never,
        } as never);
      }

      toast.success(`Policy saved${sensitive.length ? ` (logged: ${sensitive.join(", ")})` : ""}`);
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings size={16} className="text-primary" /> Autopilot operating policy — {businessName}
        </CardTitle>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 size={12} className="animate-spin mr-1" /> : <Save size={12} className="mr-1" />}
          Save policy
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <section>
          <p className="text-xs uppercase text-muted-foreground mb-2">Apollo candidate pull & reveal</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <Toggle label="Pull Apollo candidates" checked={policy.apollo_candidate_pull_enabled} onChange={(v: boolean) => set("apollo_candidate_pull_enabled", v)} />
            <Toggle label="Autonomous email reveal" checked={policy.apollo_email_reveal_autonomous} onChange={(v: boolean) => set("apollo_email_reveal_autonomous", v)} hint="Reveal emails automatically within budget" />
            <Toggle label="Exclude legacy hold" checked={policy.apollo_reveal_exclude_legacy_hold} onChange={(v: boolean) => set("apollo_reveal_exclude_legacy_hold", v)} />
            <Toggle label="Exclude previous no-email" checked={policy.apollo_reveal_exclude_previous_no_email} onChange={(v: boolean) => set("apollo_reveal_exclude_previous_no_email", v)} />
            <Toggle label="Exclude existing CRM" checked={policy.apollo_reveal_exclude_existing_crm} onChange={(v: boolean) => set("apollo_reveal_exclude_existing_crm", v)} />
            <Toggle label="Exclude duplicates" checked={policy.apollo_reveal_exclude_duplicates} onChange={(v: boolean) => set("apollo_reveal_exclude_duplicates", v)} />
            <Toggle label="Exclude poor fit" checked={policy.apollo_reveal_exclude_poor_fit} onChange={(v: boolean) => set("apollo_reveal_exclude_poor_fit", v)} />
          </div>
          <div className="grid sm:grid-cols-4 gap-3 mt-3">
            <NumField label="Daily credit budget" value={policy.apollo_reveal_daily_credit_budget} onChange={(v: number) => set("apollo_reveal_daily_credit_budget", v)} />
            <NumField label="Monthly credit budget" value={policy.apollo_reveal_monthly_credit_budget} onChange={(v: number) => set("apollo_reveal_monthly_credit_budget", v)} />
            <NumField label="Min quality score" value={policy.apollo_reveal_min_quality_score} onChange={(v: number) => set("apollo_reveal_min_quality_score", v)} hint="0–10" />
            <NumField label="Max per domain (per run)" value={policy.apollo_reveal_max_domain_frequency} onChange={(v: number) => set("apollo_reveal_max_domain_frequency", v)} />
          </div>
        </section>

        <section>
          <p className="text-xs uppercase text-muted-foreground mb-2">Promotion</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <Toggle label="Auto-promote after valid reveal" checked={policy.auto_promote_after_valid_reveal} onChange={(v: boolean) => set("auto_promote_after_valid_reveal", v)} />
            <Toggle label="Only verified emails" checked={policy.auto_promote_only_verified_email} onChange={(v: boolean) => set("auto_promote_only_verified_email", v)} />
            <Toggle label="Only CRM-new" checked={policy.auto_promote_only_crm_new} onChange={(v: boolean) => set("auto_promote_only_crm_new", v)} />
            <Toggle label="Only campaign-fit" checked={policy.auto_promote_only_campaign_fit} onChange={(v: boolean) => set("auto_promote_only_campaign_fit", v)} />
          </div>
        </section>

        <section>
          <p className="text-xs uppercase text-muted-foreground mb-2">Queue</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Toggle label="Auto-queue after promotion" checked={policy.auto_queue_after_promotion} onChange={(v: boolean) => set("auto_queue_after_promotion", v)} />
            <NumField label="Queue step" value={policy.auto_queue_step} onChange={(v: number) => set("auto_queue_step", v)} />
            <NumField label="Queue domain cap" value={policy.auto_queue_domain_cap} onChange={(v: number) => set("auto_queue_domain_cap", v)} />
          </div>
        </section>

        <section>
          <p className="text-xs uppercase text-muted-foreground mb-2">Sending</p>
          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <Toggle label="Auto-send after queue" checked={policy.auto_send_after_queue} onChange={(v: boolean) => set("auto_send_after_queue", v)} hint="Off until external scale provider is verified" />
            <div className="space-y-1">
              <Label className="text-xs">Provider mode</Label>
              <Select value={policy.sending_provider_mode} onValueChange={(v) => set("sending_provider_mode", v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ionos_proof">IONOS proof (low volume)</SelectItem>
                  <SelectItem value="external_scale">External scale (Smartlead)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <NumField label="Daily send budget" value={policy.daily_send_budget} onChange={(v: number) => set("daily_send_budget", v)} />
          </div>
        </section>
      </CardContent>
    </Card>
  );
}