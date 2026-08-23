import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase as any;

export type PortfolioContactRow = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  status: string;
  last_replied_at: string | null;
  conversation_active: boolean;
  business_relationships: Array<{
    id: string;
    business_name: string;
    qualification: string;
    current_stage: string;
    campaign_eligible: boolean;
    do_not_contact: boolean;
    relevance_category?: string | null;
  }>;
};

export async function loadPortfolioContacts(limit = 200): Promise<PortfolioContactRow[]> {
  const { data: contacts, error } = await sb
    .from("contacts")
    .select("id,email,name,company,status,last_replied_at,conversation_active")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const ids = (contacts ?? []).map((c: any) => c.id);
  if (!ids.length) return [];

  const { data: relationships, error: relError } = await sb
    .from("business_contact_relationships")
    .select("id,contact_id,business_name,qualification,current_stage,campaign_eligible,do_not_contact,relevance_category")
    .in("contact_id", ids);
  if (relError) throw relError;

  const byContact = new Map<string, any[]>();
  for (const r of relationships ?? []) {
    if (!byContact.has(r.contact_id)) byContact.set(r.contact_id, []);
    byContact.get(r.contact_id)!.push(r);
  }

  return (contacts ?? []).map((c: any) => ({
    ...c,
    business_relationships: byContact.get(c.id) ?? [],
  }));
}

export async function getPortfolioCrmSummary() {
  const [peopleRes, relationshipsRes, contactOrgNamesRes, canonicalOrgRes] = await Promise.all([
    sb.from("contacts").select("id", { count: "exact", head: true }),
    sb.from("business_contact_relationships").select("id", { count: "exact", head: true }),
    sb.from("contacts").select("company").not("company", "is", null).limit(5000),
    sb.from("organisations").select("id", { count: "exact", head: true }),
  ]);

  const crmOrganisationNames = new Set(
    (contactOrgNamesRes.data ?? []).map((r: any) => (r.company ?? "").trim().toLowerCase()).filter(Boolean),
  ).size;

  return {
    people: peopleRes.count ?? 0,
    crmOrganisationNames,
    canonicalOrganisations: canonicalOrgRes.count ?? 0,
    businessRelationships: relationshipsRes.count ?? 0,
  };
}
