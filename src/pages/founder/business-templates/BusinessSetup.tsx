import { useEffect, useState } from "react";
import { BTLayout, BTSection } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { fetchApplications, fetchSetupTasks, fetchTemplates, type ApplicationRow, type SetupTaskRow, type TemplateRow } from "@/lib/businessTemplateFactory";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BTBusinessSetup() {
  const [businessId, setBusinessId] = useState("");
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [tasks, setTasks] = useState<SetupTaskRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);

  async function load() {
    const [a, t, te] = await Promise.all([
      fetchApplications(), fetchSetupTasks(businessId || undefined), fetchTemplates(),
    ]);
    setApps(businessId ? a.filter(x => x.business_id === businessId) : a);
    setTasks(t); setTemplates(te);
  }
  useEffect(() => { load().catch(() => {}); /* eslint-disable-next-line */ }, []);

  const byTplId = new Map(templates.map(t => [t.id, t]));

  async function setStatus(id: string, status: SetupTaskRow["task_status"]) {
    const { error } = await supabase.from("business_setup_tasks").update({ task_status: status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Task → ${status}`);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, task_status: status } : t));
  }
  async function confirmApp(id: string) {
    const { error } = await supabase.from("business_template_applications")
      .update({ founder_confirmed: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Application confirmed");
    setApps(prev => prev.map(a => a.id === id ? { ...a, founder_confirmed: true } : a));
  }

  const filteredApps = businessId ? apps.filter(a => a.business_id === businessId) : apps;
  const filteredTasks = businessId ? tasks.filter(t => t.business_id === businessId) : tasks;

  return (
    <BTLayout title="Business setup" subtitle="Per-business template applications, missing requirements, and setup task checklist.">
      <BTSection title="Filter">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="space-y-1 md:col-span-2"><Label>Business ID (optional)</Label><Input value={businessId} onChange={e => setBusinessId(e.target.value)} placeholder="leave blank for portfolio view" /></div>
          <div className="flex items-end"><Button onClick={load} size="sm" variant="outline" className="w-full">Refresh</Button></div>
        </div>
      </BTSection>

      <BTSection title={`Applications (${filteredApps.length})`}>
        {filteredApps.length === 0 && <p className="text-sm text-muted-foreground">No applications yet.</p>}
        <div className="space-y-2">
          {filteredApps.map(a => {
            const tpl = a.template_id ? byTplId.get(a.template_id) : undefined;
            const myTasks = filteredTasks.filter(t => t.template_application_id === a.id);
            const done = myTasks.filter(t => t.task_status === "completed").length;
            return (
              <div key={a.id} className="border border-border/50 rounded p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{tpl?.template_name ?? "Template"}</p>
                  <Badge variant="outline" className="text-[10px]">{tpl?.archetype_code}</Badge>
                  <Badge variant="outline" className="text-[10px]">{a.application_status}</Badge>
                  {a.founder_confirmed
                    ? <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Confirmed</Badge>
                    : <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => confirmApp(a.id)}>Confirm</Button>}
                  <span className="text-[11px] text-muted-foreground ml-auto">Tasks {done}/{myTasks.length}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Business {a.business_id.slice(0, 8)}… · enabled {a.modules_enabled.length} modules / {a.agents_enabled.length} agents</p>
                {a.missing_requirements.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase text-muted-foreground">Missing requirements</p>
                    <div className="flex flex-wrap gap-1">
                      {a.missing_requirements.map(m => <Badge key={m} variant="outline" className="bg-yellow-500/10 text-yellow-300 border-yellow-500/30 text-[10px]">{m}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </BTSection>

      <BTSection title={`Setup tasks (${filteredTasks.length})`}>
        {filteredTasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks.</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                <th className="py-1 pr-2">Task</th>
                <th className="py-1 pr-2">Category</th>
                <th className="py-1 pr-2">Status</th>
                <th className="py-1 pr-2">Agent</th>
                <th className="py-1 pr-2">Module</th>
                <th className="py-1 pr-2">Flags</th>
                <th className="py-1 pr-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(t => (
                <tr key={t.id} className="border-t border-border/30">
                  <td className="py-1 pr-2">{t.task_name}</td>
                  <td className="py-1 pr-2">{t.task_category}</td>
                  <td className="py-1 pr-2">
                    <Badge variant="outline" className="text-[10px]">{t.task_status}</Badge>
                  </td>
                  <td className="py-1 pr-2">{t.assigned_agent ?? "—"}</td>
                  <td className="py-1 pr-2">{t.module_link ? <Link to={t.module_link} className="text-primary hover:underline">open</Link> : "—"}</td>
                  <td className="py-1 pr-2">{t.founder_action_required && <Badge variant="outline" className="bg-yellow-500/10 text-yellow-300 border-yellow-500/30 text-[10px]">Founder approval</Badge>}</td>
                  <td className="py-1 pr-2 flex gap-1">
                    {t.task_status !== "completed" && <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setStatus(t.id, "completed")}>Done</Button>}
                    {t.task_status === "pending" && <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setStatus(t.id, "in_progress")}>Start</Button>}
                    {t.task_status !== "blocked" && <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setStatus(t.id, "blocked")}>Block</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BTSection>
    </BTLayout>
  );
}