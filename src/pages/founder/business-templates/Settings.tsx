import { useEffect, useState } from "react";
import { BTLayout, BTSection } from "./_shared";
import { fetchTemplates, type TemplateRow } from "@/lib/businessTemplateFactory";
import { Badge } from "@/components/ui/badge";

export default function BTSettings() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  useEffect(() => { fetchTemplates().then(setTemplates).catch(() => {}); }, []);
  return (
    <BTLayout title="Settings" subtitle="Operating template defaults. Edits flow to new applications.">
      <BTSection title="Templates (read-only view)">
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="border border-border/50 rounded p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t.template_name} <span className="text-[10px] text-muted-foreground">({t.archetype_code})</span></p>
                <Badge variant="outline" className={t.active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]" : "text-[10px]"}>{t.active ? "Active" : "Disabled"}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{t.description}</p>
              <pre className="text-[10px] bg-secondary/40 p-2 rounded mt-2 overflow-x-auto">
{JSON.stringify({
  required_modules: t.required_modules, recommended_modules: t.recommended_modules,
  required_agents: t.required_agents, recommended_agents: t.recommended_agents,
  required_kpis: t.required_kpis, recommended_integrations: t.recommended_integrations,
  required_documents: t.required_documents, default_workflows: t.default_workflows,
  default_approval_rules: t.default_approval_rules, default_risk_flags: t.default_risk_flags,
}, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </BTSection>
    </BTLayout>
  );
}