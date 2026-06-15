import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ShieldAlert, Copy, Save, BookOpen, Scale, Eye } from "lucide-react";
import { CONVERSATION_POSTURE, COMPLIANCE_BOUNDARY } from "./CapitalInfluenceTab";

const sb: any = supabase as any;

function pretty(s?: string | null) { return (s ?? "").replace(/_/g, " "); }

export type PositioningSnippet = {
  key: string;
  title: string;
  vehicle: "carren_estate" | "ghat" | "both" | "liftor_hidden" | "none";
  audience: string;
  posture: typeof CONVERSATION_POSTURE[number];
  disclosure: "public_only" | "light_context" | "nda_before_detail" | "confidential_allowed" | "restricted";
  compliance: typeof COMPLIANCE_BOUNDARY[number];
  body: string;
  safety: string[];
};

export const POSITIONING_SNIPPETS: PositioningSnippet[] = [
  {
    key: "carren_principal",
    title: "Carren Estate — principal-to-principal introduction",
    vehicle: "carren_estate",
    audience: "Principals, family offices, serious private capital, direct opportunity people",
    posture: "principal_to_principal",
    disclosure: "light_context",
    compliance: "relationship_only",
    body:
`Hello {{contact_name}},

Reaching out on a principal-to-principal basis from Carren Estate.

Carren Estate is a privately held investment and operating platform positioned at the intersection of principal capital, private company intelligence, proprietary operating infrastructure and acquisition-led value creation.

This is not a fundraising approach and not product literature — it is a relationship-only introduction to map serious, aligned principals and direct opportunities over time.

{{relationship_angle_line}}

If useful, I'd welcome a short, confidential conversation at the right moment.

Warm regards,
Mandy`,
    safety: [
      "Not a fundraising or product approach",
      "No solicitation of client money",
      "No disclosure of Liftor architecture",
      "Founder approval required before any send",
    ],
  },
  {
    key: "private_bank_wealth",
    title: "Private bank / wealth adviser relationship",
    vehicle: "carren_estate",
    audience: "Private bankers, wealth managers, financial advisers close to serious capital",
    posture: "elite_adviser",
    disclosure: "light_context",
    compliance: "no_client_money_request",
    body:
`Hello {{contact_name}},

Carren Estate is mapping principal relationships across private banking and wealth-advisory routes.

Our interest is in private capital intelligence, business-exit routes, direct opportunities and long-term value creation — not in asking you to distribute a product, and not a client-money introduction request.

If there is a relationship-only conversation worth having at a principal level, I would value a brief, discreet exchange.

Warm regards,
Mandy`,
    safety: [
      "No request to distribute a product",
      "No client-money introduction",
      "Relationship-only",
      "No fund or return claims",
    ],
  },
  {
    key: "family_office",
    title: "Family office conversation",
    vehicle: "carren_estate",
    audience: "Single and multi-family offices",
    posture: "principal_to_principal",
    disclosure: "light_context",
    compliance: "relationship_only",
    body:
`Hello {{contact_name}},

Reaching out principal-to-principal from Carren Estate — a privately held investment and operating platform combining private company intelligence, proprietary operating infrastructure and acquisition-shaped opportunities.

This is not a public product or fundraising process. The intent is long-term alignment with serious family offices where principal-level conversations may be mutually useful over time.

If of interest, happy to share more context confidentially at the right moment.

Warm regards,
Mandy`,
    safety: [
      "No public product or fundraising process",
      "Principal-to-principal only",
      "No confidential structure disclosed before alignment",
    ],
  },
  {
    key: "independent_sponsor",
    title: "Independent sponsor / deal-flow conversation",
    vehicle: "carren_estate",
    audience: "Independent sponsors, search funds, acquisition entrepreneurs, deal-by-deal capital",
    posture: "deal_flow",
    disclosure: "light_context",
    compliance: "relationship_only",
    body:
`Hello {{contact_name}},

Carren Estate is building a focused map of independent sponsors and acquisition-entrepreneurs.

Our angle is deal flow, operating leverage, AI-enabled operating infrastructure and acquisition-led value creation — with the possibility of future operating partnership or principal participation where alignment is high. No automatic commitment is implied.

If a brief, discreet exchange is useful, I'd welcome it.

Warm regards,
Mandy`,
    safety: [
      "No automatic commitment",
      "No disclosure of Liftor architecture",
      "Relationship-only deal-flow conversation",
    ],
  },
  {
    key: "ma_adviser",
    title: "M&A adviser / corporate finance conversation",
    vehicle: "carren_estate",
    audience: "M&A boutiques, corporate finance advisers, business-exit advisers",
    posture: "deal_flow",
    disclosure: "light_context",
    compliance: "relationship_only",
    body:
`Hello {{contact_name}},

Carren Estate operates as a principal and operating platform, not a generic buyer. Our focus spans founder succession, acquisition targets, strategic-buyer awareness, private company intelligence and exit architecture.

I'd welcome a relationship-only conversation to understand where our principal-led posture may complement situations you are advising on.

Warm regards,
Mandy`,
    safety: [
      "Principal/operating platform — not generic buyer spam",
      "No fee solicitation",
      "Relationship-only",
    ],
  },
  {
    key: "pe_operating_partner",
    title: "Private equity / operating partner conversation",
    vehicle: "carren_estate",
    audience: "PE operating partners, value-creation teams",
    posture: "operating_partnership",
    disclosure: "nda_before_detail",
    compliance: "legal_review_required",
    body:
`Hello {{contact_name}},

Carren Estate combines operational value creation with an AI-enabled execution layer that drives revenue and process leverage inside portfolio companies, with principal and operating alignment.

Detail on the operating infrastructure is reserved for NDA/engagement. This note is a relationship-only introduction.

Warm regards,
Mandy`,
    safety: [
      "No disclosure of Liftor architecture before NDA/engagement",
      "No fund solicitation",
      "Principal/operating alignment only",
    ],
  },
  {
    key: "ghat_adviser",
    title: "GHAT philanthropy adviser introduction",
    vehicle: "ghat",
    audience: "Philanthropy advisers, foundation advisers, health-access advisers",
    posture: "philanthropy_alignment",
    disclosure: "public_only",
    compliance: "relationship_only",
    body:
`Hello {{contact_name}},

Reaching out about Global Health Access Trust (GHAT) — a controlled high-value giving platform focused on health access, accountable donation routing, donor registration, fund allocation tracking and measurable impact.

This is a philanthropy-only conversation. It is not a commercial investment approach and is kept clean from any private investment activity.

If relevant, I'd welcome a brief introductory exchange.

Warm regards,
Mandy`,
    safety: [
      "Philanthropy-only",
      "Clean separation from Carren Estate / private capital",
      "No commercial investment context",
    ],
  },
  {
    key: "ghat_donor",
    title: "GHAT donor / foundation alignment",
    vehicle: "ghat",
    audience: "Donors, foundations, donor-advised funds, health-access grant makers",
    posture: "philanthropy_alignment",
    disclosure: "public_only",
    compliance: "relationship_only",
    body:
`Hello {{contact_name}},

Sharing a short note about Global Health Access Trust (GHAT) — a high-value giving platform built around measurable impact, transparent allocation, governance and global health access.

Charitable activity is kept entirely separate from any private investment. This is a philanthropy-aligned, relationship-only introduction.

If of interest, I'd welcome a discreet conversation.

Warm regards,
Mandy`,
    safety: [
      "No mixing charitable funds with private investment",
      "Governance-led, measurable-impact framing",
      "Relationship-only",
    ],
  },
  {
    key: "media_profile",
    title: "Media / profile relationship",
    vehicle: "both",
    audience: "Journalists, editors, source platforms, podcast hosts, profile routes",
    posture: "media_profile",
    disclosure: "public_only",
    compliance: "no_product_literature",
    body:
`Hello {{contact_name}},

I work across private company intelligence, AI-enabled operating infrastructure and acquisition-led value creation under the Carren Estate platform, with a parallel philanthropy focus via Global Health Access Trust.

This note is for founder-controlled profile building only. No confidential structure, financials or operating architecture is being shared.

If relevant for a piece, source list or conversation, I'd be happy to engage on a discreet basis.

Warm regards,
Mandy`,
    safety: [
      "Founder-controlled profile only",
      "No confidential structure disclosed",
      "No operating architecture detail",
    ],
  },
  {
    key: "no_contact",
    title: "Restricted / no-contact posture",
    vehicle: "none",
    audience: "Parked, parasite-risk, poor alignment, do-not-contact, restricted",
    posture: "no_contact",
    disclosure: "restricted",
    compliance: "restricted",
    body:
`Internal posture only — no outreach.

Keep this contact as intelligence only. No disclosure of Carren Estate, GHAT or operating infrastructure. Any future movement requires an explicit founder decision and a re-assessment of alignment.`,
    safety: [
      "No outreach",
      "No disclosure",
      "Intelligence-only",
      "Founder decision required before any movement",
    ],
  },
];

const DISCLOSURE_GUIDE: { level: string; label: string; body: string; tone: string }[] = [
  { level: "public_only", label: "Public only", tone: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    body: "Use only public Carren Estate / GHAT positioning. No Liftor architecture, no tax / extraction strategy, no bank details, no private family information." },
  { level: "light_context", label: "Light context", tone: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    body: "May mention high-level operating platform and relationship purpose. No confidential documents, no entity structure, no financials." },
  { level: "nda_before_detail", label: "NDA before detail", tone: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    body: "No architecture, entity structure, financials, exit targets, private documents or tax planning until NDA / engagement is clear." },
  { level: "confidential_allowed", label: "Confidential allowed", tone: "bg-red-500/15 text-red-300 border-red-500/30",
    body: "Use only where NDA / engagement is in place and founder has approved the specific context." },
  { level: "restricted", label: "Restricted", tone: "bg-red-500/15 text-red-300 border-red-500/30",
    body: "No disclosure. Intelligence-only. Founder decision required before any movement." },
];

function renderSnippet(s: PositioningSnippet, c: any): string {
  const name = (c?.contact_name?.split(" ")?.[0]) || "there";
  const angleBits: string[] = [];
  if (c?.organisation_name) angleBits.push(`Context: ${c.organisation_name}`);
  if (c?.capital_role && c.capital_role !== "unknown") angleBits.push(`Role read: ${pretty(c.capital_role)}`);
  if (c?.capital_lane) angleBits.push(`Lane: ${pretty(c.capital_lane)}`);
  if (c?.best_vehicle) angleBits.push(`Vehicle fit: ${pretty(c.best_vehicle)}`);
  if (c?.money_signal) angleBits.push(`Signal: ${c.money_signal}`);
  if (c?.relationship_angle) angleBits.push(`Angle: ${c.relationship_angle}`);
  const angleLine = angleBits.length ? angleBits.join(" · ") : "";
  return s.body
    .replaceAll("{{contact_name}}", name)
    .replaceAll("{{relationship_angle_line}}", angleLine);
}

export default function PositioningLibrary({
  contacts,
  initialContactId,
}: {
  contacts: any[];
  initialContactId?: string | null;
}) {
  const qc = useQueryClient();
  const [contactId, setContactId] = useState<string>(initialContactId ?? "");
  const [snippetKey, setSnippetKey] = useState<string>(POSITIONING_SNIPPETS[0].key);
  const [posture, setPosture] = useState<string>("principal_to_principal");
  const [draft, setDraft] = useState<string>("");
  const [boundary, setBoundary] = useState<string>("relationship_only");
  const [boundaryChecks, setBoundaryChecks] = useState<Record<string, boolean>>({
    relationship_only: true,
    no_product_literature: true,
    no_solicitation: true,
    no_client_money_request: true,
    no_external_send_without_approval: true,
    legal_review_required: false,
    restricted: false,
  });

  useEffect(() => { if (initialContactId) setContactId(initialContactId); }, [initialContactId]);

  const contact = useMemo(() => contacts.find((c) => c.id === contactId) || null, [contacts, contactId]);
  const snippet = useMemo(() => POSITIONING_SNIPPETS.find((s) => s.key === snippetKey) || POSITIONING_SNIPPETS[0], [snippetKey]);

  useEffect(() => { setPosture(snippet.posture); }, [snippet.posture]);

  function build() {
    setDraft(renderSnippet(snippet, contact));
  }

  async function copyDraft() {
    const text = draft || renderSnippet(snippet, contact);
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Draft copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }

  const saveDraft = useMutation({
    mutationFn: async () => {
      if (!contact?.id) throw new Error("Select a contact first");
      const text = draft || renderSnippet(snippet, contact);
      const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      const header = `\n\n— Positioning draft (${snippet.title}, posture: ${pretty(posture)}, ${stamp}) —\n`;
      const next = `${(contact.priority_notes ?? "").trim()}${header}${text}`.trim();
      const patch: any = { priority_notes: next };
      if (posture) patch.conversation_posture = posture;
      if (boundary) patch.compliance_boundary = boundary;
      const { error } = await sb.from("relationship_intelligence_contacts").update(patch).eq("id", contact.id);
      if (error) throw error;
      await sb.from("relationship_intelligence_events").insert({
        contact_id: contact.id,
        event_type: "positioning_draft_saved",
        summary: `Positioning draft saved for ${snippet.title}`,
      });
    },
    onSuccess: () => {
      toast({ title: "Draft saved to contact" });
      qc.invalidateQueries({ queryKey: ["rni-contacts"] });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const applyBoundary = useMutation({
    mutationFn: async (b: string) => {
      if (!contact?.id) throw new Error("Select a contact first");
      const { error } = await sb.from("relationship_intelligence_contacts").update({ compliance_boundary: b }).eq("id", contact.id);
      if (error) throw error;
      await sb.from("relationship_intelligence_events").insert({
        contact_id: contact.id,
        event_type: "compliance_boundary_set",
        summary: `Compliance boundary set to ${pretty(b)}`,
      });
    },
    onSuccess: () => {
      toast({ title: "Compliance boundary updated" });
      qc.invalidateQueries({ queryKey: ["rni-contacts"] });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card className="tech-card border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-3 text-xs text-yellow-200/90 flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            Use this system to prepare relationship language only. It must not be used for investment promotion, fund distribution, client-money solicitation, guaranteed-return claims, or automatic outreach. Drafts are founder-only and never sent from this module.
          </div>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Positioning snippets</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-2">
          {POSITIONING_SNIPPETS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSnippetKey(s.key)}
              className={`text-left rounded border p-3 transition ${snippetKey === s.key ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/40"}`}
            >
              <div className="text-xs font-semibold">{s.title}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.audience}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge variant="outline" className="text-[10px]">{pretty(s.vehicle)}</Badge>
                <Badge variant="outline" className="text-[10px]">{pretty(s.posture)}</Badge>
                <Badge variant="outline" className="text-[10px]">{pretty(s.disclosure)}</Badge>
                <Badge variant="outline" className="text-[10px]">{pretty(s.compliance)}</Badge>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Draft builder</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Contact</label>
              <Select value={contactId || undefined} onValueChange={setContactId}>
                <SelectTrigger><SelectValue placeholder="Select a contact" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {contacts.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contact_name}{c.organisation_name ? ` — ${c.organisation_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Snippet</label>
              <Select value={snippetKey} onValueChange={setSnippetKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POSITIONING_SNIPPETS.map((s) => <SelectItem key={s.key} value={s.key}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Posture</label>
              <Select value={posture} onValueChange={setPosture}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONVERSATION_POSTURE.map((p) => <SelectItem key={p} value={p}>{pretty(p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={build}>Generate draft</Button>
            <Button size="sm" variant="outline" onClick={copyDraft}><Copy className="h-3 w-3 mr-1" /> Copy</Button>
            <Button size="sm" variant="outline" disabled={!contact || saveDraft.isPending} onClick={() => saveDraft.mutate()}>
              <Save className="h-3 w-3 mr-1" /> Save draft note to contact
            </Button>
            <Badge variant="outline" className="text-[10px]">No external send</Badge>
            <Badge variant="outline" className="text-[10px]">Founder-only</Badge>
          </div>

          <Textarea
            rows={14}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Click Generate draft to render relationship-only language. Edit freely. Nothing is sent from this module."
            className="font-mono text-xs"
          />

          <div className="grid md:grid-cols-2 gap-3 text-xs">
            <div className="border border-border/50 rounded p-3">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Safety checklist</p>
              <ul className="space-y-1">
                {snippet.safety.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
            <div className="border border-border/50 rounded p-3 space-y-1">
              <p className="text-[10px] uppercase text-muted-foreground">Recommended disclosure</p>
              <Badge variant="outline" className={`text-[10px] ${DISCLOSURE_GUIDE.find(d => d.level === snippet.disclosure)?.tone}`}>{pretty(snippet.disclosure)}</Badge>
              <p className="text-[10px] uppercase text-muted-foreground mt-2">Recommended compliance boundary</p>
              <Badge variant="outline" className="text-[10px]">{pretty(snippet.compliance)}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Scale className="h-4 w-4 text-primary" /> Compliance controls</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-2">
            {COMPLIANCE_BOUNDARY.map((b) => (
              <label key={b} className="flex items-start gap-2 text-xs border border-border/50 rounded p-2">
                <Checkbox
                  checked={!!boundaryChecks[b]}
                  onCheckedChange={(v) => setBoundaryChecks((s) => ({ ...s, [b]: !!v }))}
                />
                <span>{pretty(b)}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Set boundary on selected contact:</span>
            <Select value={boundary} onValueChange={setBoundary}>
              <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMPLIANCE_BOUNDARY.map((b) => <SelectItem key={b} value={b}>{pretty(b)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!contact || applyBoundary.isPending} onClick={() => applyBoundary.mutate(boundary)}>
              Apply to contact
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Use this system to prepare relationship language only. It must not be used for investment promotion, fund distribution, client-money solicitation, guaranteed-return claims, or automatic outreach.
          </p>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Disclosure posture guide</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-2">
          {DISCLOSURE_GUIDE.map((d) => (
            <div key={d.level} className="border border-border/50 rounded p-3">
              <Badge variant="outline" className={`text-[10px] ${d.tone}`}>{d.label}</Badge>
              <p className="text-xs text-muted-foreground mt-2">{d.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}