import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mailbox, ShieldCheck, RefreshCw, FlaskConical } from "lucide-react";

interface ChecklistRow {
  checklist_key: string;
  checklist_label: string | null;
  status: string;
  blocker_reason: string | null;
}

interface InboxRow {
  id: string;
  email_address: string;
  estate_key: string | null;
  business_name: string | null;
  provider_ready: boolean | null;
  warmup_ready: boolean | null;
  ramp_daily_cap: number | null;
  excluded_from_allocation: boolean | null;
  live_readiness: string | null;
}

const statusTone = (status: string) =>
  status === "ready" ? "default" : status === "blocked" ? "destructive" : "secondary";

export default function SendingInfrastructurePage() {
  const { toast } = useToast();
  const [checklist, setChecklist] = useState<ChecklistRow[]>([]);
  const [inboxes, setInboxes] = useState<InboxRow[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [estateKey, setEstateKey] = useState("education-2026");
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [{ data: c }, { data: i }] = await Promise.all([
      supabase
        .from("smartlead_activation_checklist")
        .select("checklist_key, checklist_label, status, blocker_reason")
        .order("checklist_key"),
      supabase
        .from("inboxes")
        .select(
          "id, email_address, estate_key, business_name, provider_ready, warmup_ready, ramp_daily_cap, excluded_from_allocation, live_readiness",
        )
        .order("email_address")
        .limit(500),
    ]);
    setChecklist((c ?? []) as ChecklistRow[]);
    setInboxes((i ?? []) as InboxRow[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const call = async (fn: string, body: Record<string, unknown>, label: string) => {
    setBusy(label);
    setResult(null);
    const { data, error } = await supabase.functions.invoke(fn, { body });
    setBusy(null);
    if (error) {
      toast({ title: `${label} failed`, description: error.message, variant: "destructive" });
      return;
    }
    setResult(data);
    await load();
    toast({ title: `${label} complete`, description: "No email was sent and no provider record was changed." });
  };

  return (
    <FounderLayout>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Sending Infrastructure
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Register and check the mailbox estate before anything goes out. Nothing on this page
              sends email, creates a campaign at the provider, or spends Apollo credit. Legacy Neon
              Candy mailboxes are locked to Neon Candy and cannot be used for education.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() => call("smartlead-activation-refresh", { business_name: businessName || null }, "Readiness refresh")}
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh readiness
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => call("smartlead-send-dry-run", { business_name: businessName || null }, "Dry run")}
            >
              <FlaskConical className="h-4 w-4 mr-1" /> Send dry run (no provider call)
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => call("smartlead-mailbox-discovery", { dry_run: true }, "Mailbox discovery")}
            >
              <Mailbox className="h-4 w-4 mr-1" /> Read provider mailboxes
            </Button>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle>Readiness checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {checklist.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No readiness rows yet. Use “Refresh readiness” to calculate them.
              </p>
            )}
            {checklist.map((row) => (
              <div key={row.checklist_key} className="flex items-center justify-between gap-3 border-b border-border/40 pb-1">
                <span className="text-sm">{row.checklist_label ?? row.checklist_key}</span>
                <div className="flex items-center gap-2">
                  {row.blocker_reason && (
                    <span className="text-xs text-muted-foreground">{row.blocker_reason}</span>
                  )}
                  <Badge variant={statusTone(row.status)}>{row.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle>Register mailboxes in bulk</CardTitle>
            <p className="text-sm text-muted-foreground">
              Paste a spreadsheet export or CSV with a header row. Preview first, then apply. Applying
              twice with the same list will not create duplicates.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Business name (e.g. Kingsbridge Global)"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
              <Input
                placeholder="Estate key (e.g. education-2026)"
                value={estateKey}
                onChange={(e) => setEstateKey(e.target.value)}
              />
            </div>
            <Textarea
              rows={8}
              placeholder="email,domain,business,daily_cap,from_name"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null || !csv.trim()}
                onClick={() =>
                  call(
                    "mailbox-estate-register",
                    { csv, estate_key: estateKey, business_name: businessName || null, dry_run: true },
                    "Mailbox preview",
                  )
                }
              >
                Preview
              </Button>
              <Button
                size="sm"
                disabled={busy !== null || !csv.trim()}
                onClick={() =>
                  call(
                    "mailbox-estate-register",
                    { csv, estate_key: estateKey, business_name: businessName || null, dry_run: false, confirm: true },
                    "Mailbox registration",
                  )
                }
              >
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle>Mailbox estate ({inboxes.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {inboxes.length === 0 && (
              <p className="text-sm text-muted-foreground">No mailboxes registered yet.</p>
            )}
            {inboxes.map((box) => (
              <div key={box.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 py-1">
                <span className="text-sm">{box.email_address}</span>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">{box.estate_key ?? "unassigned"}</Badge>
                  <Badge variant="outline">{box.business_name ?? "no business"}</Badge>
                  <Badge variant={box.provider_ready ? "default" : "secondary"}>
                    {box.provider_ready ? "provider ready" : "not provider ready"}
                  </Badge>
                  <Badge variant={box.warmup_ready ? "default" : "secondary"}>
                    {box.warmup_ready ? "warmed up" : "warmup pending"}
                  </Badge>
                  <Badge variant="outline">cap {box.ramp_daily_cap ?? 0}/day</Badge>
                  {box.excluded_from_allocation && <Badge variant="destructive">excluded</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {result !== null && (
          <Card className="tech-card">
            <CardHeader>
              <CardTitle>Last result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </FounderLayout>
  );
}
