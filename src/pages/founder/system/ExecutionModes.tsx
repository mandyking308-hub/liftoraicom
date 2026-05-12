import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import ControlledLiveActivation from "@/components/founder/ControlledLiveActivation";

type Mode = { id: string; mode_name: string; description: string; is_default: boolean };
type Flag = { id: string; feature_name: string; enabled: boolean; execution_mode_id: string };
type Business = { id: string; name: string; execution_mode_id: string | null };

const FEATURES = ["proposals", "deals", "invoicing", "suppliers", "outreach", "demos"];

export default function ExecutionModes() {
  const [modes, setModes] = useState<Mode[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [m, f, b] = await Promise.all([
      supabase.from("system_execution_modes" as never).select("*").order("mode_name"),
      supabase.from("system_feature_flags" as never).select("*"),
      supabase.from("businesses" as never).select("*").order("name"),
    ]);
    setModes((m.data as Mode[]) ?? []);
    setFlags((f.data as Flag[]) ?? []);
    setBusinesses((b.data as Business[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleFlag = async (flag: Flag) => {
    const { error } = await supabase
      .from("system_feature_flags" as never)
      .update({ enabled: !flag.enabled } as never)
      .eq("id", flag.id);
    if (error) { toast.error(error.message); return; }
    setFlags((prev) => prev.map((x) => (x.id === flag.id ? { ...x, enabled: !x.enabled } : x)));
    toast.success(`${flag.feature_name} ${!flag.enabled ? "enabled" : "disabled"}`);
  };

  const setDefault = async (modeId: string) => {
    await supabase.from("system_execution_modes" as never).update({ is_default: false } as never).neq("id", "00000000-0000-0000-0000-000000000000");
    const { error } = await supabase.from("system_execution_modes" as never).update({ is_default: true } as never).eq("id", modeId);
    if (error) { toast.error(error.message); return; }
    toast.success("Default mode updated");
    load();
  };

  const assignBusiness = async (businessId: string, modeId: string | null) => {
    const { error } = await supabase
      .from("businesses" as never)
      .update({ execution_mode_id: modeId } as never)
      .eq("id", businessId);
    if (error) { toast.error(error.message); return; }
    setBusinesses((prev) => prev.map((b) => (b.id === businessId ? { ...b, execution_mode_id: modeId } : b)));
    toast.success("Business mode assigned");
  };

  if (loading) {
    return (
      <FounderLayout>
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </FounderLayout>
    );
  }

  return (
    <FounderLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">System Modes</h1>
          <p className="text-sm text-muted-foreground">
            Liftor now defaults to CONTROLLED LIVE. SANDBOX remains available only as an admin/development fallback, while execution modes and business overrides stay configurable here.
          </p>
        </div>

        <ControlledLiveActivation />

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-medium">Modes & Feature Flags</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">Mode</th>
                  {FEATURES.map((f) => (
                    <th key={f} className="py-2 px-2 capitalize">{f}</th>
                  ))}
                  <th className="py-2 pl-4">Default</th>
                </tr>
              </thead>
              <tbody>
                {modes.map((m) => (
                  <tr key={m.id} className="border-b">
                    <td className="py-3 pr-4">
                      <div className="font-medium capitalize">{m.mode_name}</div>
                      <div className="text-xs text-muted-foreground">{m.description}</div>
                    </td>
                    {FEATURES.map((feat) => {
                      const flag = flags.find((f) => f.execution_mode_id === m.id && f.feature_name === feat);
                      if (!flag) return <td key={feat} className="py-3 px-2 text-muted-foreground">—</td>;
                      return (
                        <td key={feat} className="py-3 px-2">
                          <Switch checked={flag.enabled} onCheckedChange={() => toggleFlag(flag)} />
                        </td>
                      );
                    })}
                    <td className="py-3 pl-4">
                      {m.is_default ? (
                        <Badge variant="default" className="gap-1"><Star size={12} /> Default</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setDefault(m.id)}>Set default</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-medium">Business Assignments</h2>
          <div className="space-y-3">
            {businesses.length === 0 && (
              <p className="text-sm text-muted-foreground">No businesses registered yet.</p>
            )}
            {businesses.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.execution_mode_id
                      ? `Override: ${modes.find((m) => m.id === b.execution_mode_id)?.mode_name ?? "unknown"}`
                      : "Using system default"}
                  </div>
                </div>
                <Select
                  value={b.execution_mode_id ?? "default"}
                  onValueChange={(v) => assignBusiness(b.id, v === "default" ? null : v)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Use system default</SelectItem>
                    {modes.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="capitalize">{m.mode_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </FounderLayout>
  );
}