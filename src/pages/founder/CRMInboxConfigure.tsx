import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Send, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

type Inbox = {
  id: string; email_address: string; business_name: string;
  provider_type: "simulated" | "ionos_smtp";
  live_readiness: string;
  from_name: string | null; from_email: string | null; reply_to_email: string | null;
  daily_send_limit: number; warmup_status: "new" | "warming" | "active";
  active: boolean; sending_domain_id: string | null; inbound_webhook_url: string;
  last_test_send_status: string | null; last_test_send_at: string | null;
  last_test_send_to: string | null; last_error_message: string | null;
};

type CredsPublic = {
  inbox_id: string; provider_type: string;
  smtp_host: string | null; smtp_port: number | null;
  smtp_username: string | null; smtp_encryption: string | null;
  password_is_set: boolean; password_set_at: string | null;
};

const READINESS_LABELS: Record<string, { label: string; tone: "default" | "secondary" | "destructive" | "outline" }> = {
  simulated_only: { label: "Simulated only", tone: "outline" },
  not_configured: { label: "Not configured", tone: "secondary" },
  configured_not_tested: { label: "Configured, not tested", tone: "secondary" },
  test_failed: { label: "Test failed", tone: "destructive" },
  test_passed: { label: "Test passed", tone: "default" },
  live_ready: { label: "Live ready", tone: "default" },
  paused: { label: "Paused", tone: "outline" },
  error: { label: "Error", tone: "destructive" },
};

const CRMInboxConfigure = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [creds, setCreds] = useState<CredsPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState("");

  const [form, setForm] = useState({
    provider_type: "ionos_smtp" as "simulated" | "ionos_smtp",
    from_name: "", from_email: "", reply_to_email: "",
    smtp_host: "smtp.ionos.co.uk", smtp_port: 587,
    smtp_encryption: "starttls" as "starttls" | "ssl",
    smtp_username: "", smtp_password: "",
    daily_send_limit: 10, warmup_status: "new" as "new" | "warming" | "active",
    active: true,
  });

  useEffect(() => { if (id) void load(id); }, [id]);

  async function load(inboxId: string) {
    setLoading(true);
    const [{ data: ix, error: ixErr }, { data: cr }] = await Promise.all([
      supabase.from("inboxes").select("*").eq("id", inboxId).maybeSingle(),
      supabase.rpc("list_inbox_credentials_public", { _inbox_id: inboxId }),
    ]);
    if (ixErr || !ix) { toast.error(ixErr?.message ?? "Inbox not found"); setLoading(false); return; }
    const inboxRow = ix as Inbox;
    setInbox(inboxRow);
    const credsRow = (Array.isArray(cr) && cr[0]) ? (cr[0] as CredsPublic) : null;
    setCreds(credsRow);
    setForm((f) => ({
      ...f,
      provider_type: inboxRow.provider_type ?? "ionos_smtp",
      from_name: inboxRow.from_name ?? f.from_name,
      from_email: inboxRow.from_email ?? inboxRow.email_address,
      reply_to_email: inboxRow.reply_to_email ?? "",
      smtp_host: credsRow?.smtp_host ?? f.smtp_host,
      smtp_port: credsRow?.smtp_port ?? f.smtp_port,
      smtp_encryption: (credsRow?.smtp_encryption as "starttls" | "ssl") ?? f.smtp_encryption,
      smtp_username: credsRow?.smtp_username ?? inboxRow.email_address,
      smtp_password: "",
      daily_send_limit: inboxRow.daily_send_limit ?? 10,
      warmup_status: inboxRow.warmup_status ?? "new",
      active: inboxRow.active,
    }));
    setTestTo(inboxRow.reply_to_email ?? inboxRow.email_address);
    setLoading(false);
  }

  async function save() {
    if (!id || !inbox) return;
    if (form.provider_type === "ionos_smtp") {
      if (!form.smtp_host || !form.smtp_port || !form.smtp_username || !form.smtp_encryption) {
        toast.error("SMTP host, port, username and encryption are required");
        return;
      }
      if (!creds?.password_is_set && !form.smtp_password) {
        toast.error("SMTP password is required for first-time setup");
        return;
      }
    }
    setSaving(true);
    // 1. Save inbox-level non-secret fields directly
    const { error: ixErr } = await supabase.from("inboxes").update({
      daily_send_limit: form.daily_send_limit,
      warmup_status: form.warmup_status,
      active: form.active,
    }).eq("id", id);
    if (ixErr) { setSaving(false); toast.error(ixErr.message); return; }

    // 2. Save credentials via secure edge function (encrypts on server)
    const { data, error } = await supabase.functions.invoke("outreach-save-credentials", {
      body: {
        inbox_id: id,
        provider_type: form.provider_type,
        smtp_host: form.smtp_host,
        smtp_port: Number(form.smtp_port),
        smtp_username: form.smtp_username,
        smtp_encryption: form.smtp_encryption,
        smtp_password: form.smtp_password || null, // null preserves existing
        from_name: form.from_name,
        from_email: form.from_email,
        reply_to_email: form.reply_to_email,
      },
    });
    setSaving(false);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error ?? error!.message);
      return;
    }
    toast.success("Configuration saved securely");
    setForm((f) => ({ ...f, smtp_password: "" }));
    void load(id);
  }

  async function sendTest() {
    if (!id || !testTo) { toast.error("Recipient required"); return; }
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("outreach-send-test", {
      body: { inbox_id: id, to: testTo },
    });
    setTesting(false);
    const payload = (data ?? {}) as { ok?: boolean; error?: string };
    if (error || !payload.ok) {
      toast.error(payload.error ?? error?.message ?? "Test send failed");
    } else {
      toast.success("Real SMTP test send succeeded — inbox is now Live Ready");
      setTestOpen(false);
    }
    void load(id);
  }

  if (loading || !inbox) {
    return <FounderLayout><p className="text-muted-foreground text-sm p-6">Loading…</p></FounderLayout>;
  }

  const readiness = READINESS_LABELS[inbox.live_readiness] ?? { label: inbox.live_readiness, tone: "outline" as const };
  const passwordKnown = creds?.password_is_set ?? false;

  return (
    <FounderLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => nav("/founder/crm/inboxes")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Inboxes
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">{inbox.email_address}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure outbound sending provider for {inbox.business_name || "this inbox"}.
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge variant={readiness.tone}>{readiness.label}</Badge>
            {inbox.last_test_send_at && (
              <span className="text-xs text-muted-foreground">
                Last test: {new Date(inbox.last_test_send_at).toLocaleString()}
                {inbox.last_test_send_to ? ` → ${inbox.last_test_send_to}` : ""}
              </span>
            )}
          </div>
        </div>

        {inbox.live_readiness !== "live_ready" ? (
          <Card className="tech-card border-destructive/50">
            <CardContent className="p-4 flex gap-3 items-start">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-destructive">Not Live Ready</p>
                <p className="text-destructive/90 text-xs mt-1">
                  This inbox is not live-ready until IONOS SMTP credentials are added and a real test email passes.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="tech-card border-primary/50">
            <CardContent className="p-4 flex gap-3 items-start">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">IONOS SMTP connected</p>
                <p className="text-muted-foreground text-xs mt-1">Real outbound sending available from this inbox.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {inbox.last_test_send_status === "failed" && inbox.last_error_message && (
          <Card className="tech-card border-destructive/50">
            <CardContent className="p-4 text-xs text-destructive whitespace-pre-wrap">
              <strong>Last test error:</strong> {inbox.last_error_message}
            </CardContent>
          </Card>
        )}

        <Card className="tech-card">
          <CardHeader><CardTitle className="text-base">Provider</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Provider type</Label>
              <Select value={form.provider_type} onValueChange={(v) => setForm({ ...form, provider_type: v as "simulated" | "ionos_smtp" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simulated">Simulated (no real email)</SelectItem>
                  <SelectItem value="ionos_smtp">IONOS SMTP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">From name</Label>
                <Input value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} placeholder="NeonCandy" /></div>
              <div className="space-y-1.5"><Label className="text-xs">From email</Label>
                <Input value={form.from_email} onChange={(e) => setForm({ ...form, from_email: e.target.value })} placeholder="hello@neoncandy.online" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Reply-to email</Label>
                <Input value={form.reply_to_email} onChange={(e) => setForm({ ...form, reply_to_email: e.target.value })} placeholder="music@neoncandy.net" /></div>
            </div>
          </CardContent>
        </Card>

        {form.provider_type === "ionos_smtp" && (
          <Card className="tech-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> IONOS SMTP credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">SMTP host</Label>
                  <Input value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })} placeholder="smtp.ionos.co.uk" /></div>
                <div className="space-y-1.5"><Label className="text-xs">SMTP port</Label>
                  <Input type="number" value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Encryption</Label>
                  <Select value={form.smtp_encryption} onValueChange={(v) => setForm({ ...form, smtp_encryption: v as "starttls" | "ssl" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starttls">STARTTLS / TLS (port 587)</SelectItem>
                      <SelectItem value="ssl">SSL (port 465)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">SMTP username</Label>
                  <Input value={form.smtp_username} onChange={(e) => setForm({ ...form, smtp_username: e.target.value })} placeholder="hello@neoncandy.online" /></div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  SMTP password {passwordKnown && <span className="text-muted-foreground">(stored — leave blank to keep existing)</span>}
                </Label>
                <Input type="password" autoComplete="new-password"
                  value={form.smtp_password}
                  onChange={(e) => setForm({ ...form, smtp_password: e.target.value })}
                  placeholder={passwordKnown ? "••••••••  (saved on server, not displayed)" : "Enter IONOS mailbox password"} />
                <p className="text-[11px] text-muted-foreground">
                  Encrypted at rest. Never returned to the browser. Decrypted only by send/test edge functions.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="tech-card">
          <CardHeader><CardTitle className="text-base">Sending limits & status</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Daily send limit</Label>
              <Input type="number" value={form.daily_send_limit} onChange={(e) => setForm({ ...form, daily_send_limit: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Warmup</Label>
              <Select value={form.warmup_status} onValueChange={(v) => setForm({ ...form, warmup_status: v as "new" | "warming" | "active" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="warming">Warming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Active</Label>
              <Select value={form.active ? "true" : "false"} onValueChange={(v) => setForm({ ...form, active: v === "true" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader><CardTitle className="text-base">Inbound replies</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">Webhook URL: <code className="font-mono">{inbox.inbound_webhook_url}</code></p>
            <p className="text-xs text-muted-foreground">
              Configure inbound forwarding or reply handling at the mailbox/provider so replies can be routed back to Liftor when inbound processing is implemented.
            </p>
            <Badge variant="outline">Inbound reply capture not yet live</Badge>
            <p className="text-[11px] text-muted-foreground">AI reply handling is not yet connected to real inbound email replies.</p>
          </CardContent>
        </Card>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save configuration"}</Button>
          <Button variant="outline" disabled={!passwordKnown || form.provider_type !== "ionos_smtp"} onClick={() => setTestOpen(true)}>
            <Send className="h-4 w-4 mr-1" /> Send Test Email
          </Button>
        </div>

        <Dialog open={testOpen} onOpenChange={setTestOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Real SMTP test send</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                A real email will be sent through {form.smtp_host}:{form.smtp_port} using the saved IONOS credentials.
                On success, this inbox becomes <strong>Live Ready</strong>.
              </p>
              <div className="space-y-1.5"><Label className="text-xs">Recipient</Label>
                <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTestOpen(false)}>Cancel</Button>
              <Button onClick={sendTest} disabled={testing}>{testing ? "Sending…" : "Send real test"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FounderLayout>
  );
};

export default CRMInboxConfigure;