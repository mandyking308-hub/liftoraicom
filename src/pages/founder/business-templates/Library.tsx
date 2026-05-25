import { useEffect, useState } from "react";
import { BTLayout, BTSection } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { fetchTemplates, type TemplateRow } from "@/lib/businessTemplateFactory";

export default function BTLibrary() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  useEffect(() => { fetchTemplates().then(setTemplates).catch(() => {}); }, []);
  return (
    <BTLayout title="Template library" subtitle="The full set of operating templates. Each is bound to one archetype.">
      <div className="space-y-3">
        {templates.map(t => (
          <BTSection key={t.id} title={`${t.template_name}`} description={t.description ?? ""}
            actions={<Badge variant="outline" className="text-[10px]">{t.archetype_code}</Badge>}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <Group title="Required modules" items={t.required_modules} tone="primary" />
              <Group title="Recommended modules" items={t.recommended_modules} />
              <Group title="Required agents" items={t.required_agents} tone="primary" />
              <Group title="Recommended agents" items={t.recommended_agents} />
              <Group title="KPIs" items={t.required_kpis} />
              <Group title="Integrations" items={t.recommended_integrations} />
              <Group title="Documents" items={t.required_documents} />
              <Group title="Workflows" items={t.default_workflows} />
              <Group title="Approval rules" items={t.default_approval_rules} tone="warn" />
              <Group title="Risk flags" items={t.default_risk_flags} tone="warn" />
            </div>
          </BTSection>
        ))}
      </div>
    </BTLayout>
  );
}

function Group({ title, items, tone }: { title: string; items: string[]; tone?: "primary" | "warn" }) {
  return (
    <div>
      <p className="text-[11px] uppercase text-muted-foreground mb-1">{title}</p>
      <div className="flex flex-wrap gap-1">
        {items.length === 0 && <span className="text-muted-foreground">—</span>}
        {items.map(i => (
          <Badge key={i} variant="outline" className={
            tone === "primary" ? "bg-primary/10 text-primary border-primary/30 text-[10px]"
            : tone === "warn" ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30 text-[10px]"
            : "text-[10px]"
          }>{i}</Badge>
        ))}
      </div>
    </div>
  );
}