import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Founder-only, read-only review of the Kindnesss launch kit saved in existing
// records (brief metadata, outreach drafts, social calendar). Nothing here sends,
// schedules or publishes; status and reason codes come from the saved records.
const KINDNESSS_ID = "640de582-a112-4d16-a221-03c27f00c6ec";
const KIT_BRIEF_ID = "7afe9177-3427-4492-aec4-163b35194b7c";

type Step = { step: number; day: number; subject: string; body: string; cta_url?: string };
type Draft = { id: string; campaign_name: string; campaign_key: string | null; status: string; external_send_blocked: boolean; email_sequence: any };
type Post = { id: string; platform_key: string; post_date: string; suggested_time: string; content_pillar: string; post_type: string; caption: string; cta: string; hashtags: string[]; visual_direction: string; asset_requirements: string[]; approval_status: string; metadata: any };

const plain = (b: string) => b.replace(/<table[\s\S]*<\/table>/, "[unsubscribe box]");

export default function KindnesssLaunchKitPanel() {
  const [brief, setBrief] = useState<any>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const db = supabase as any;
      const [b, d, p] = await Promise.all([
        db.from("marketing_campaign_briefs").select("id,campaign_name,approval_status,launch_allowed,metadata").eq("id", KIT_BRIEF_ID).maybeSingle(),
        db.from("outreach_campaign_drafts").select("id,campaign_name,campaign_key,status,external_send_blocked,email_sequence").eq("business_id", KINDNESSS_ID).not("campaign_key", "is", null).order("campaign_name"),
        db.from("social_post_drafts").select("*").eq("business_id", KINDNESSS_ID).filter("metadata->>kit", "eq", "KINDNESSS_LAUNCH_KIT_2026_11").order("post_date"),
      ]);
      if (b.error || d.error || p.error) setError((b.error || d.error || p.error).message);
      setBrief(b.data); setDrafts(d.data ?? []); setPosts(p.data ?? []);
    })();
  }, []);

  if (error) return <Card><CardContent className="p-4 text-sm text-destructive">Launch kit could not load: {error}</CardContent></Card>;
  if (!brief) return null;
  const m = brief.metadata ?? {};
  const defs: Record<string, string> = m.reason_code_definitions ?? {};

  const stepsOf = (d: Draft): { label: string; steps: Step[] }[] => {
    const out = [{ label: "Active steps", steps: (d.email_sequence?.steps ?? []) as Step[] }];
    const pv = d.email_sequence?.metadata?.launch_kit_proposed_version;
    if (pv) out.push({ label: `Proposed ${pv.version} (not active)`, steps: pv.steps });
    return out;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {brief.campaign_name}
          <Badge variant="outline">{brief.approval_status}</Badge>
          <Badge variant="destructive">Sending blocked</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{m.central_message}</p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <h3 className="mb-2 font-medium">Streams and blockers</h3>
          <ul className="space-y-2">
            {(m.streams ?? []).map((s: any) => (
              <li key={s.stream} className="rounded-md border border-border p-2">
                <div className="flex items-center gap-2"><span className="font-medium">{s.stream}</span><Badge variant="secondary">{s.status}</Badge></div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {s.reason_codes.map((r: string) => <Badge key={r} variant="outline" title={defs[r]}>{r}</Badge>)}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <Accordion type="multiple">
          <AccordionItem value="personas">
            <AccordionTrigger>Personas ({(m.personas ?? []).length})</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                {(m.personas ?? []).map((p: any) => (
                  <div key={p.key} className="rounded-md border border-border p-2 space-y-1">
                    <div className="font-medium">{p.key}</div>
                    {["audience", "pain", "proof", "promise", "offer", "funnel", "qualification", "next_step", "kpi", "channel", "not"].filter((k) => p[k]).map((k) => (
                      <div key={k}><span className="text-muted-foreground">{k}: </span>{p[k]}</div>
                    ))}
                    <a className="text-primary hover:underline" href={p.cta} target="_blank" rel="noreferrer">{p.cta}</a>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {drafts.map((d) => (
            <AccordionItem key={d.id} value={d.id}>
              <AccordionTrigger>{d.campaign_name} · {d.status}{d.external_send_blocked ? " · blocked" : ""}</AccordionTrigger>
              <AccordionContent>
                {stepsOf(d).map((g) => (
                  <div key={g.label} className="mb-3">
                    <div className="mb-1 text-muted-foreground">{g.label} · {g.steps.length} emails</div>
                    {g.steps.map((s) => (
                      <div key={s.step} className="mb-2 rounded-md border border-border p-2">
                        <div className="font-medium">Day {s.day ?? "?"} · {s.subject || "(same thread)"}</div>
                        <pre className="mt-1 whitespace-pre-wrap font-sans text-muted-foreground">{plain(s.body)}</pre>
                      </div>
                    ))}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}

          <AccordionItem value="social">
            <AccordionTrigger>Social calendar ({posts.length} posts, UK time, not scheduled)</AccordionTrigger>
            <AccordionContent>
              {posts.map((p) => (
                <div key={p.id} className="mb-2 rounded-md border border-border p-2 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    {p.post_date} {p.suggested_time?.slice(0, 5)} · {p.content_pillar} · {p.post_type}
                    <Badge variant="outline">{p.approval_status}</Badge>
                    {p.metadata?.demo_or_comparison && <Badge variant="secondary">demo/comparison</Badge>}
                  </div>
                  {Object.entries(p.metadata?.platform_variants ?? {}).map(([k, v]) => (
                    <div key={k}><span className="text-muted-foreground">{k}: </span><span className="whitespace-pre-wrap">{v as string}</span></div>
                  ))}
                  <div className="text-muted-foreground">{(p.hashtags ?? []).join(" ")}</div>
                  <div><span className="text-muted-foreground">Creative: </span>{p.visual_direction}</div>
                  <div><span className="text-muted-foreground">Assets needed: </span>{(p.asset_requirements ?? []).join(", ")}</div>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
