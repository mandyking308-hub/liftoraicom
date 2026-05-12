import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCopy, FileText, ScanSearch, Inbox, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type Brief = {
  id: string;
  business_id: string;
  name: string;
  target_audience: string | null;
  priority_segments: Record<string, string[]>;
  include_titles: string[];
  exclude_titles: string[];
  include_company_types: string[];
  exclude_company_types: string[];
  geography_preferences: Record<string, any>;
  email_requirements: Record<string, boolean>;
  crm_exclusion_rules: Record<string, boolean>;
  apollo_credit_protection: Record<string, any>;
  apollo_search_keywords: string[];
  suggested_first_search_size: number | null;
  suggested_first_export_size: number | null;
  suggested_unlock_strategy: string | null;
  notes: string | null;
  last_updated_at: string;
};

const NEONCANDY_BUSINESS_ID = "b47c4b11-9a96-4af9-9aec-2f5218de9182";

const Pill = ({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "good" | "warn" | "danger" }) => {
  const cls =
    tone === "good" ? "border-green-500/40 text-green-300 bg-green-500/10" :
    tone === "warn" ? "border-yellow-500/40 text-yellow-300 bg-yellow-500/10" :
    tone === "danger" ? "border-destructive/50 text-destructive bg-destructive/10" :
    "border-border/60 text-muted-foreground bg-card/40";
  return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs border ${cls}`}>{children}</span>;
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">{title}</p>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </div>
);

function buildCopyText(b: Brief): string {
  const lines: string[] = [];
  lines.push(`# ${b.name}`);
  lines.push("");
  if (b.target_audience) lines.push(`Target audience: ${b.target_audience}`);
  lines.push("");
  lines.push("## Priority segments");
  for (const [tier, items] of Object.entries(b.priority_segments || {})) {
    lines.push(`- ${tier.toUpperCase()}: ${(items as string[]).join(", ")}`);
  }
  lines.push("");
  lines.push("## Include titles"); lines.push(b.include_titles.join(", "));
  lines.push(""); lines.push("## Exclude titles"); lines.push(b.exclude_titles.join(", "));
  lines.push(""); lines.push("## Include company types"); lines.push(b.include_company_types.join(", "));
  lines.push(""); lines.push("## Exclude company types"); lines.push(b.exclude_company_types.join(", "));
  lines.push(""); lines.push("## Apollo search keywords"); lines.push(b.apollo_search_keywords.join(", "));
  lines.push(""); lines.push("## Email requirements");
  for (const [k, v] of Object.entries(b.email_requirements || {})) lines.push(`- ${k}: ${v}`);
  lines.push(""); lines.push("## CRM exclusion rules");
  for (const [k, v] of Object.entries(b.crm_exclusion_rules || {})) lines.push(`- ${k}: ${v}`);
  lines.push(""); lines.push("## Apollo credit protection");
  for (const [k, v] of Object.entries(b.apollo_credit_protection || {})) lines.push(`- ${k}: ${JSON.stringify(v)}`);
  lines.push("");
  lines.push(`Suggested first search size: ${b.suggested_first_search_size ?? "n/a"}`);
  lines.push(`Suggested first export size: ${b.suggested_first_export_size ?? "n/a"}`);
  lines.push(`Suggested unlock strategy: ${b.suggested_unlock_strategy ?? "n/a"}`);
  return lines.join("\n");
}

export default function SourceQualityBrief() {
  const [showFull, setShowFull] = useState(false);

  const { data: brief, isLoading } = useQuery({
    queryKey: ["sourcing-brief", NEONCANDY_BUSINESS_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_sourcing_briefs" as any)
        .select("*")
        .eq("business_id", NEONCANDY_BUSINESS_ID)
        .eq("is_active", true)
        .order("last_updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Brief | null;
    },
  });

  const copyText = useMemo(() => (brief ? buildCopyText(brief) : ""), [brief]);

  const onCopy = async () => {
    if (!copyText) return;
    await navigator.clipboard.writeText(copyText);
    toast.success("Apollo search criteria copied");
  };

  const onMarkImport = () => {
    toast.message("New Apollo import expected", {
      description: "Liftor will reconcile against CRM exclusions on next quality scan. No credits spent.",
    });
  };

  const onRunQualityScan = () => {
    toast.message("Run the Lead Quality Scan above", {
      description: "Use the existing 'Score new Apollo leads' / shortlist actions in this panel after import.",
    });
  };

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText size={16} /> Source Quality Brief — NeonCandy
          <Badge variant="outline" className="ml-2 text-[10px]">business-specific</Badge>
          <Badge variant="outline" className="ml-1 text-[10px] border-green-500/40 text-green-300">
            no credits spent
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-xs text-muted-foreground">Loading brief…</p>}
        {!isLoading && !brief && (
          <p className="text-xs text-muted-foreground">No active sourcing brief found for NeonCandy.</p>
        )}
        {brief && (
          <>
            {brief.target_audience && (
              <p className="text-sm text-foreground/90">{brief.target_audience}</p>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <Section title="Tier 1 priority titles">
                {(brief.priority_segments?.tier_1 ?? []).map((t) => <Pill key={t} tone="good">{t}</Pill>)}
              </Section>
              <Section title="Tier 2 priority titles">
                {(brief.priority_segments?.tier_2 ?? []).map((t) => <Pill key={t}>{t}</Pill>)}
              </Section>
              <Section title="Tier 3 (selective)">
                {(brief.priority_segments?.tier_3 ?? []).map((t) => <Pill key={t} tone="warn">{t}</Pill>)}
              </Section>
              <Section title="Exclude titles">
                {brief.exclude_titles.map((t) => <Pill key={t} tone="danger">{t}</Pill>)}
              </Section>
              <Section title="Prioritise companies">
                {brief.include_company_types.map((t) => <Pill key={t} tone="good">{t}</Pill>)}
              </Section>
              <Section title="Deprioritise companies">
                {brief.exclude_company_types.map((t) => <Pill key={t} tone="danger">{t}</Pill>)}
              </Section>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-md border border-border/50 p-3 bg-card/40">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                  <ShieldAlert size={12} /> Apollo credit protection
                </p>
                <ul className="text-xs space-y-1">
                  {Object.entries(brief.apollo_credit_protection || {}).map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-mono">{typeof v === "boolean" ? (v ? "on" : "off") : String(v)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-border/50 p-3 bg-card/40">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">CRM exclusion rules</p>
                <ul className="text-xs space-y-1">
                  {Object.entries(brief.crm_exclusion_rules || {}).map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{k}</span>
                      <span className={v ? "text-green-400" : "text-muted-foreground"}>{v ? "enforced" : "off"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3 text-xs">
              <div className="rounded-md border border-border/50 p-3">
                <p className="text-muted-foreground">Suggested first search</p>
                <p className="text-lg font-semibold">{brief.suggested_first_search_size ?? "—"}</p>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="text-muted-foreground">Suggested first export</p>
                <p className="text-lg font-semibold">{brief.suggested_first_export_size ?? "—"}</p>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="text-muted-foreground">Unlock strategy</p>
                <p className="text-xs leading-snug">{brief.suggested_unlock_strategy ?? "—"}</p>
              </div>
            </div>

            <Section title="Apollo search keywords">
              {brief.apollo_search_keywords.map((k) => <Pill key={k}>{k}</Pill>)}
            </Section>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowFull((s) => !s)}>
                <FileText size={14} className="mr-1" /> {showFull ? "Hide" : "View"} full brief
              </Button>
              <Button size="sm" onClick={onCopy}>
                <ClipboardCopy size={14} className="mr-1" /> Copy Apollo search criteria
              </Button>
              <Button size="sm" variant="outline" onClick={onMarkImport}>
                <Inbox size={14} className="mr-1" /> Mark new Apollo import expected
              </Button>
              <Button size="sm" variant="outline" onClick={onRunQualityScan}>
                <ScanSearch size={14} className="mr-1" /> Run quality scan after import
              </Button>
            </div>

            {showFull && (
              <pre className="bg-muted/40 border border-border/50 rounded p-3 text-[11px] overflow-auto max-h-80 whitespace-pre-wrap">
                {copyText}
              </pre>
            )}

            {brief.notes && (
              <p className="text-[11px] text-muted-foreground italic">{brief.notes}</p>
            )}
            <p className="text-[10px] text-muted-foreground">
              Last updated: {new Date(brief.last_updated_at).toLocaleString()}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}