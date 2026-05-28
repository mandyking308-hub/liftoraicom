import { useEffect, useState } from "react";
import { SVLayout, SVCard, CheckList, KVRow, ApprovalBoundary, VAULT_APPROVAL_GATES } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { GitBranch, Plus, Trash2 } from "lucide-react";
import { GITHUB_PROTECTION_CHECKLIST } from "@/lib/securityVaultData";
import { toast } from "sonner";

interface Snapshot {
  id: string;
  version: string;
  date: string;
  modules: string;
  routesAdded: string;
  tablesAdded: string;
  operatingStatus: string;
  auditSummary: string;
  notes: string;
  testsPassing: boolean;
  buildPassing: boolean;
}

const STORAGE_KEY = "liftor.security-vault.snapshots.v1";

function load(): Snapshot[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

export default function BuildSnapshots() {
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [draft, setDraft] = useState<Snapshot>(blank());

  useEffect(() => { setSnaps(load()); }, []);

  function save(next: Snapshot[]) {
    setSnaps(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function blank(): Snapshot {
    return { id: crypto.randomUUID(), version: "", date: new Date().toISOString().slice(0, 10), modules: "", routesAdded: "", tablesAdded: "", operatingStatus: "stable", auditSummary: "", notes: "", testsPassing: true, buildPassing: true };
  }

  function add() {
    if (!draft.version.trim()) { toast.error("Version required"); return; }
    if (!draft.testsPassing || !draft.buildPassing) { toast.error("Snapshot blocked: tests/build not passing"); return; }
    save([{ ...draft }, ...snaps]);
    setDraft(blank());
    toast.success("Snapshot recorded locally · founder review required before any restore.");
  }

  function remove(id: string) {
    toast.warning("Deleting a snapshot requires founder approval. Recording locally only.");
    save(snaps.filter(s => s.id !== id));
  }

  return (
    <SVLayout title="Build Snapshot Register" subtitle="Snapshot the current Liftor build after a clean audit. Snapshots are metadata only and do not include source, data or secrets.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SVCard title="Current Production Reference" icon={GitBranch}>
          <KVRow label="GitHub repo" value={<span className="text-muted-foreground">Managed by Lovable · founder-owned</span>} />
          <KVRow label="Default branch" value="main" />
          <KVRow label="Branch protection" value={<Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">verify in GitHub</Badge>} />
          <KVRow label="Operating status" value={<span className="text-emerald-400">stable (founder-confirmed)</span>} />
          <KVRow label="Last passing tests" value={<span className="text-muted-foreground">record below</span>} />
          <KVRow label="Last passing build" value={<span className="text-muted-foreground">record below</span>} />
        </SVCard>

        <SVCard title="GitHub Protection Checklist">
          <CheckList items={GITHUB_PROTECTION_CHECKLIST} />
          <p className="text-[11px] text-muted-foreground mt-2">Changing branch protection requires founder approval and must be performed directly in GitHub. Lovable cannot modify GitHub protection rules.</p>
        </SVCard>
      </div>

      <Card className="tech-card p-4 space-y-3">
        <p className="text-sm font-semibold">Record new snapshot (after clean audit)</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Field label="Version (e.g. v1.4.0)"><Input value={draft.version} onChange={e => setDraft({ ...draft, version: e.target.value })} /></Field>
          <Field label="Snapshot date"><Input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></Field>
          <Field label="Operating status"><Input value={draft.operatingStatus} onChange={e => setDraft({ ...draft, operatingStatus: e.target.value })} /></Field>
          <Field label="Key modules built"><Input value={draft.modules} onChange={e => setDraft({ ...draft, modules: e.target.value })} /></Field>
          <Field label="Routes added"><Input value={draft.routesAdded} onChange={e => setDraft({ ...draft, routesAdded: e.target.value })} /></Field>
          <Field label="DB tables added"><Input value={draft.tablesAdded} onChange={e => setDraft({ ...draft, tablesAdded: e.target.value })} /></Field>
        </div>
        <Field label="Last audit report summary"><Textarea value={draft.auditSummary} onChange={e => setDraft({ ...draft, auditSummary: e.target.value })} /></Field>
        <Field label="Founder notes"><Textarea value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></Field>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5"><input type="checkbox" className="accent-primary" checked={draft.testsPassing} onChange={e => setDraft({ ...draft, testsPassing: e.target.checked })} /> npm test passing</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" className="accent-primary" checked={draft.buildPassing} onChange={e => setDraft({ ...draft, buildPassing: e.target.checked })} /> npm run build passing</label>
          <Button size="sm" onClick={add} className="ml-auto"><Plus size={12} className="mr-1" /> Record snapshot</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Snapshots are stored locally in this browser only. They are metadata, not a backup. Treat them as a founder logbook.</p>
      </Card>

      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground"><tr>
            <th className="text-left p-2">Version</th><th className="text-left p-2">Date</th><th className="text-left p-2">Modules</th><th className="text-left p-2">Routes</th><th className="text-left p-2">Tables</th><th className="text-left p-2">Status</th><th className="text-left p-2"></th>
          </tr></thead>
          <tbody>
            {snaps.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No snapshots recorded yet.</td></tr>}
            {snaps.map(s => (
              <tr key={s.id} className="border-t border-border/30">
                <td className="p-2 font-mono">{s.version}</td>
                <td className="p-2">{s.date}</td>
                <td className="p-2 max-w-[200px] truncate text-muted-foreground">{s.modules || "—"}</td>
                <td className="p-2 max-w-[160px] truncate text-muted-foreground">{s.routesAdded || "—"}</td>
                <td className="p-2 max-w-[160px] truncate text-muted-foreground">{s.tablesAdded || "—"}</td>
                <td className="p-2"><Badge variant="outline" className="text-[10px]">{s.operatingStatus}</Badge></td>
                <td className="p-2 text-right"><Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 size={12} /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ApprovalBoundary items={VAULT_APPROVAL_GATES} />
    </SVLayout>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return <label className="text-xs space-y-1 block"><span className="text-muted-foreground">{label}</span>{children}</label>;
}