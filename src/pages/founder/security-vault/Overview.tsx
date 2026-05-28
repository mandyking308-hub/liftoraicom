import { Link } from "react-router-dom";
import { SVLayout, SVCard, ApprovalBoundary, VAULT_APPROVAL_GATES, KVRow } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, KeyRound, Database, ClipboardCheck, BookOpen, ArrowRight, AlertTriangle } from "lucide-react";
import { SECRETS_REGISTER, ACCESS_MAP, SECURITY_AUDIT_CHECKLIST, SUPABASE_BACKUP_CHECKLIST, GITHUB_PROTECTION_CHECKLIST, envPresent } from "@/lib/securityVaultData";

export default function SecurityVaultOverview() {
  const totalSecrets = SECRETS_REGISTER.length;
  const envHits = SECRETS_REGISTER.filter(s => s.envVarHint && envPresent(s.envVarHint)).length;
  const critical = SECRETS_REGISTER.filter(s => s.risk === "critical").length;
  const mfaMissing = ACCESS_MAP.filter(a => a.mfa === "missing").length;

  return (
    <SVLayout title="Overview">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Secrets tracked" value={totalSecrets} />
        <Stat label="Critical-risk secrets" value={critical} tone={critical ? "warn" : "ok"} />
        <Stat label="Public env vars present" value={`${envHits}/2`} tone={envHits === 2 ? "ok" : "warn"} />
        <Stat label="Access systems · MFA missing" value={mfaMissing} tone={mfaMissing ? "bad" : "ok"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SVCard title="Build Snapshot Register" icon={GitBranch}>
          <KVRow label="Last snapshot" value={<span className="text-muted-foreground">Not yet taken in this session</span>} />
          <KVRow label="GitHub default branch" value="main" />
          <KVRow label="Last passing tests" value={<Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">recorded by founder</Badge>} />
          <Link to="/founder/security-vault/build-snapshots" className="text-primary inline-flex items-center gap-1 hover:underline mt-2">Open Build Snapshots <ArrowRight size={12} /></Link>
        </SVCard>

        <SVCard title="Secrets Register" icon={KeyRound}>
          <KVRow label="Records" value={totalSecrets} />
          <KVRow label="Values shown" value={<span className="text-emerald-400">never</span>} />
          <KVRow label="Storage policy" value={<span className="text-muted-foreground">Lovable Cloud secrets + password manager</span>} />
          <Link to="/founder/security-vault/secrets-register" className="text-primary inline-flex items-center gap-1 hover:underline mt-2">Open Secrets Register <ArrowRight size={12} /></Link>
        </SVCard>

        <SVCard title="Backup &amp; Restore" icon={Database}>
          <KVRow label="GitHub checklist" value={`${GITHUB_PROTECTION_CHECKLIST.length} items`} />
          <KVRow label="Supabase checklist" value={`${SUPABASE_BACKUP_CHECKLIST.length} items`} />
          <KVRow label="Auto export" value={<span className="text-amber-300">disabled · approval required</span>} />
          <Link to="/founder/security-vault/backup-restore" className="text-primary inline-flex items-center gap-1 hover:underline mt-2">Open Backup &amp; Restore <ArrowRight size={12} /></Link>
        </SVCard>

        <SVCard title="Security Audit" icon={ClipboardCheck}>
          <KVRow label="Checklist items" value={SECURITY_AUDIT_CHECKLIST.length} />
          <KVRow label="Founder route protection" value={<Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">enforced</Badge>} />
          <KVRow label="External send default" value={<span className="text-emerald-400">OFF</span>} />
          <Link to="/founder/security-vault/security-audit" className="text-primary inline-flex items-center gap-1 hover:underline mt-2">Open Security Audit <ArrowRight size={12} /></Link>
        </SVCard>
      </div>

      <Card className="tech-card p-4 text-xs space-y-2 border-amber-500/40">
        <p className="flex items-center gap-2 font-semibold text-amber-300"><AlertTriangle size={14} /> What this vault never does</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Never displays or stores raw secret values, passwords or private keys.</li>
          <li>Never exports customer data automatically.</li>
          <li>Never publishes anything, sends outreach, or activates paid APIs.</li>
          <li>Never removes founder approval gates.</li>
          <li>Never overwrites manuals silently — drafts go through manual_update_drafts review.</li>
        </ul>
      </Card>

      <ApprovalBoundary items={VAULT_APPROVAL_GATES} />
    </SVLayout>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: any; tone?: "default" | "ok" | "warn" | "bad" }) {
  const cls = tone === "ok" ? "text-emerald-400" : tone === "warn" ? "text-yellow-300" : tone === "bad" ? "text-red-400" : "text-foreground";
  return (
    <div className="tech-card p-3 rounded border border-border/40">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${cls}`}>{value}</p>
    </div>
  );
}