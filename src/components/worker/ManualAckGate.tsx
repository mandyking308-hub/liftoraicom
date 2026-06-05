import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ManualAckGate({ workerId, role, onAcknowledged, children }: {
  workerId: string;
  role: string;
  onAcknowledged?: () => void;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [manual, setManual] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: m } = await (supabase as any).from("worker_manuals").select("*").eq("role", role).eq("status", "active").maybeSingle();
      const { data: wp } = await (supabase as any).from("worker_profiles").select("manual_acknowledged_version").eq("id", workerId).maybeSingle();
      setManual(m);
      if (m) {
        const { data: s } = await (supabase as any).from("worker_manual_sections").select("*").eq("manual_id", m.id).order("display_order");
        setSections(s ?? []);
      }
      if (!m || (wp?.manual_acknowledged_version && wp.manual_acknowledged_version === m.manual_version)) {
        setAcknowledged(true);
      }
      setLoading(false);
    })();
  }, [workerId, role]);

  const ack = async () => {
    await (supabase as any).from("worker_profiles").update({
      manual_acknowledged_version: manual.manual_version,
      manual_acknowledged_at: new Date().toISOString(),
    }).eq("id", workerId);
    await (supabase as any).from("worker_audit_events").insert({
      worker_id: workerId, event_type: "manual_acknowledged",
      metadata: { manual_id: manual.id, version: manual.manual_version },
    });
    toast.success("Manual acknowledged");
    setAcknowledged(true);
    onAcknowledged?.();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }
  if (acknowledged) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-2">Confirm you have read the active manual</h1>
      <p className="text-sm text-muted-foreground mb-4">You must confirm the current role manual before this session can begin.</p>
      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">{manual.manual_title} <span className="text-xs text-muted-foreground">({manual.manual_version})</span></h2>
        {manual.manual_body && <p className="text-sm whitespace-pre-wrap">{manual.manual_body}</p>}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {sections.map((s) => (
            <div key={s.id} className="border-t border-border/40 pt-2">
              <div className="text-sm font-medium">{s.section_title}</div>
              <p className="text-xs whitespace-pre-wrap text-muted-foreground">{s.section_body}</p>
            </div>
          ))}
        </div>
        <Button onClick={ack}>I have read this manual</Button>
      </Card>
    </div>
  );
}