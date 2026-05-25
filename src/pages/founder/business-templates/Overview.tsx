import { useEffect, useState } from "react";
import { BTLayout, BTSection, BTStat } from "./_shared";
import { fetchTemplates, fetchApplications, fetchSetupTasks, type TemplateRow, type ApplicationRow, type SetupTaskRow } from "@/lib/businessTemplateFactory";

export default function BTOverview() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [tasks, setTasks] = useState<SetupTaskRow[]>([]);
  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => {});
    fetchApplications().then(setApps).catch(() => {});
    fetchSetupTasks().then(setTasks).catch(() => {});
  }, []);
  const open = tasks.filter(t => t.task_status === "pending" || t.task_status === "in_progress").length;
  const confirmed = apps.filter(a => a.founder_confirmed).length;
  return (
    <BTLayout title="Business Template Factory" subtitle="Apply the right operating template to each business so the correct modules, agents, KPIs, integrations and setup tasks are wired — no one-size-fits-all operation.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BTStat label="Templates" value={templates.length} hint="Seeded catalogue" />
        <BTStat label="Applications" value={apps.length} />
        <BTStat label="Founder-confirmed" value={`${confirmed} / ${apps.length || 0}`} />
        <BTStat label="Open setup tasks" value={open} hint="pending + in_progress" />
      </div>
      <BTSection title="Templates in catalogue">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {templates.map(t => (
            <div key={t.id} className="border border-border/50 rounded p-3 space-y-1">
              <p className="text-sm font-medium">{t.template_name} <span className="text-[10px] text-muted-foreground">({t.archetype_code})</span></p>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{t.description}</p>
              <p className="text-[11px] text-muted-foreground">{t.required_modules.length} required modules · {t.required_agents.length} required agents · {t.required_kpis.length} KPIs</p>
            </div>
          ))}
        </div>
      </BTSection>
    </BTLayout>
  );
}