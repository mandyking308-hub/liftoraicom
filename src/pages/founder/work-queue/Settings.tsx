import { WQLayout, WQSection } from "./_shared";
import { PMO_SOURCES } from "@/lib/masterWorkQueueEngine";

export default function WorkQueueSettings() {
  return (
    <WQLayout title="Master Work Queue settings" subtitle="Source modules, dedupe key and external-action rules.">
      <WQSection title="Dedupe key" description="Items upserted on (source_module, source_table, source_record_id). Re-running ingest never duplicates an open item.">
        <p className="text-xs text-muted-foreground">Configured at the database level via a unique constraint.</p>
      </WQSection>
      <WQSection title="External-action policy" description="Completing a work item never triggers send/post/contact/spend. External actions remain gated through the standard approval queue.">
        <p className="text-xs text-muted-foreground">Approval-required items carry an explicit Approval badge.</p>
      </WQSection>
      <WQSection title="Source modules" description="Modules currently registered with the Master PMO ingestion service.">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {PMO_SOURCES.map(s => (
            <div key={s.module} className="border border-border/50 rounded p-2">
              <p className="text-[11px] font-medium">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.module} · {s.table}</p>
            </div>
          ))}
        </div>
      </WQSection>
    </WQLayout>
  );
}