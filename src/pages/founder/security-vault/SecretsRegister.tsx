import { SVLayout, ApprovalBoundary, VAULT_APPROVAL_GATES } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, KeyRound } from "lucide-react";
import { ACCESS_MAP, SECRETS_REGISTER, envPresent, type RiskLevel } from "@/lib/securityVaultData";

const RISK_CLS: Record<RiskLevel, string> = {
  low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  critical: "bg-red-500/15 text-red-300 border-red-500/30",
};

export default function SecretsRegister() {
  return (
    <SVLayout title="Secrets Register · Access Map" subtitle="Metadata only. Raw secret values are never displayed, exported or written to the database.">
      <Card className="tech-card p-3 text-xs text-yellow-300 border-yellow-500/40 flex items-center gap-2">
        <Lock size={12} /> This page never shows secret values. Add or rotate secrets in Lovable Cloud secrets or the founder password manager.
      </Card>

      <div>
        <p className="text-sm font-semibold mb-2 flex items-center gap-2"><KeyRound size={14} className="text-primary" /> Secrets Register</p>
        <Card className="tech-card p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-secondary/30 text-muted-foreground"><tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">System</th>
              <th className="text-left p-2">Purpose</th>
              <th className="text-left p-2">Stored in</th>
              <th className="text-left p-2">Owner</th>
              <th className="text-left p-2">Rotation</th>
              <th className="text-left p-2">Last rotated</th>
              <th className="text-left p-2">Risk</th>
              <th className="text-left p-2">Env present</th>
              <th className="text-left p-2">PW manager</th>
              <th className="text-left p-2">Notes</th>
            </tr></thead>
            <tbody>
              {SECRETS_REGISTER.map(s => {
                const present = s.envVarHint ? envPresent(s.envVarHint) : null;
                return (
                  <tr key={s.name} className="border-t border-border/30">
                    <td className="p-2 font-mono text-[11px]">{s.name}</td>
                    <td className="p-2">{s.system}</td>
                    <td className="p-2 text-muted-foreground">{s.purpose}</td>
                    <td className="p-2 text-muted-foreground">{s.storedIn}</td>
                    <td className="p-2">{s.owner}</td>
                    <td className="p-2 text-muted-foreground">{s.rotation}</td>
                    <td className="p-2">{s.lastRotated ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-2"><Badge variant="outline" className={`text-[10px] ${RISK_CLS[s.risk]}`}>{s.risk}</Badge></td>
                    <td className="p-2">{present === null ? <span className="text-muted-foreground">n/a</span> : present ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">yes</Badge> : <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">missing</Badge>}</td>
                    <td className="p-2">{s.passwordManager ? <Badge variant="outline" className="text-[10px]">required</Badge> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-2 max-w-[260px] truncate text-muted-foreground">{s.notes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      <div>
        <p className="text-sm font-semibold mb-2">Access Map</p>
        <Card className="tech-card p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-secondary/30 text-muted-foreground"><tr>
              <th className="text-left p-2">System</th>
              <th className="text-left p-2">Login method</th>
              <th className="text-left p-2">Owner</th>
              <th className="text-left p-2">Recovery</th>
              <th className="text-left p-2">MFA</th>
              <th className="text-left p-2">Risk</th>
              <th className="text-left p-2">Notes</th>
            </tr></thead>
            <tbody>
              {ACCESS_MAP.map(a => (
                <tr key={a.system} className="border-t border-border/30">
                  <td className="p-2 font-medium">{a.system}</td>
                  <td className="p-2 text-muted-foreground">{a.loginMethod}</td>
                  <td className="p-2">{a.owner}</td>
                  <td className="p-2 text-muted-foreground">{a.recovery}</td>
                  <td className="p-2"><Badge variant="outline" className={`text-[10px] ${a.mfa === "missing" ? "bg-red-500/15 text-red-300 border-red-500/30" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"}`}>{a.mfa}</Badge></td>
                  <td className="p-2"><Badge variant="outline" className={`text-[10px] ${RISK_CLS[a.risk]}`}>{a.risk}</Badge></td>
                  <td className="p-2 max-w-[260px] truncate text-muted-foreground">{a.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <ApprovalBoundary items={VAULT_APPROVAL_GATES} />
    </SVLayout>
  );
}