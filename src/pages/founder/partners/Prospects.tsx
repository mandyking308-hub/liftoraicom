import { useEffect, useState } from "react";
import { PALayout, PASection, OutreachBadge, PartnerTypeBadge, fmtMoney } from "./_shared";
import { Button } from "@/components/ui/button";
import {
  fetchProspects, updateProspectStatus,
  OUTREACH_STATUS_META, PARTNER_TYPE_META,
  type PartnerProspect, type OutreachStatus, type PartnerType,
} from "@/lib/partnerEngine";

const COLUMNS: OutreachStatus[] = ["new", "researched", "qualified", "draft_prepared", "approval_required", "contacted", "active", "parked"];

export default function PAProspects() {
  const [rows, setRows] = useState<PartnerProspect[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const reload = () => fetchProspects().then(setRows).catch(() => {});
  useEffect(() => { reload(); }, []);

  const move = async (id: string, status: OutreachStatus) => {
    setBusy(id);
    await updateProspectStatus(id, status).catch(() => {});
    setBusy(null);
    reload();
  };

  return (
    <PALayout title="Partner Prospect Board"
      subtitle="Identify, research, qualify and draft outreach internally. External contact requires founder approval.">
      <PASection title="Pipeline" description={`${rows.length} prospects across ${COLUMNS.length} stages.`}>
        <div className="grid md:grid-cols-4 gap-2">
          {COLUMNS.map(col => {
            const list = rows.filter(r => r.outreach_status === col);
            const meta = OUTREACH_STATUS_META[col];
            return (
              <div key={col} className="border border-border/50 rounded p-2 space-y-2 bg-card/40">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${meta.cls}`}>{meta.label}</span>
                  <span className="text-[10px] text-muted-foreground">{list.length}</span>
                </div>
                {list.length === 0 && <p className="text-[11px] text-muted-foreground">—</p>}
                {list.map(p => (
                  <div key={p.id} className="border border-border/50 rounded p-2 text-xs space-y-1 bg-background/50">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium truncate">{p.partner_name}</span>
                      <PartnerTypeBadge type={p.partner_type as PartnerType} />
                    </div>
                    {p.category && <p className="text-[11px] text-muted-foreground">{p.category}</p>}
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                      {p.fit_score != null && <span>Fit {Number(p.fit_score).toFixed(0)}</span>}
                      {p.expected_value != null && <span>· EV {fmtMoney(p.expected_value)}</span>}
                    </div>
                    {(p.risk_flags ?? []).length > 0 && (
                      <p className="text-[10px] text-yellow-300">⚑ {(p.risk_flags ?? []).join(", ")}</p>
                    )}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {nextActions(col).map(s => (
                        <Button key={s} size="sm" variant="outline" disabled={busy === p.id}
                          className="h-6 text-[10px] px-2"
                          onClick={() => move(p.id, s)}>
                          → {OUTREACH_STATUS_META[s].label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </PASection>

      <PASection title="Partner types in pipeline">
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.keys(PARTNER_TYPE_META).map(t => {
            const c = rows.filter(r => r.partner_type === t).length;
            return (
              <div key={t} className="border border-border/50 rounded px-2 py-1 flex items-center gap-2">
                <PartnerTypeBadge type={t as PartnerType} />
                <span className="text-muted-foreground">{c}</span>
              </div>
            );
          })}
        </div>
      </PASection>
    </PALayout>
  );
}

function nextActions(status: OutreachStatus): OutreachStatus[] {
  switch (status) {
    case "new":               return ["researched", "rejected"];
    case "researched":        return ["qualified", "parked"];
    case "qualified":         return ["draft_prepared", "parked"];
    case "draft_prepared":    return ["approval_required"];
    case "approval_required": return ["contacted", "rejected"];
    case "contacted":         return ["active", "rejected"];
    case "active":            return ["parked"];
    case "parked":            return ["qualified"];
    default: return [];
  }
}
