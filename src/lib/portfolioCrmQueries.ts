import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase as any;

export type PortfolioContactRow = {
  id: string;
  email: string | null;
  name: string | null;
  company: string | null;
  role: string | null;
  status: string;
  tags: string[] | null;
  email_verified_status: string | null;
  sendable_status: string | null;
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

const sel = (s: string): string => s;

/** Loads all master CRM contacts using safe 1000-row pages (no 500-row ceiling). */
export async function loadPortfolioContacts(maxRows = 50000): Promise<PortfolioContactRow[]> {
  const PAGE = 1000;
  const contacts: any[] = [];
  for (let from = 0; from < maxRows; from += PAGE) {
    const { data, error } = await sb
      .from("contacts")
      .select(sel("id,email,name,company,role,status,tags,email_verified_status,sendable_status,last_replied_at,conversation_active"))
      .order("created_at", { ascending: false })
      .range(from, Math.min(from + PAGE, maxRows) - 1);
    if (error) throw error;
    contacts.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  const ids = contacts.map((c: any) => c.id);
  if (!ids.length) return [];

  const relationships: any[] = [];
  for (let i = 0; i < ids.length; i += 500) {
    const { data, error } = await sb
      .from("business_contact_relationships")
      .select(sel("id,contact_id,business_name,qualification,current_stage,campaign_eligible,do_not_contact,relevance_category"))
      .in("contact_id", ids.slice(i, i + 500));
    if (error) throw error;
    relationships.push(...(data ?? []));
  }

  const byContact = new Map<string, any[]>();
  for (const r of relationships) {
    if (!byContact.has(r.contact_id)) byContact.set(r.contact_id, []);
    byContact.get(r.contact_id)!.push(r);
  }

  return contacts.map((c: any) => ({
    ...c,
    business_relationships: byContact.get(c.id) ?? [],
  }));
}


export async function getPortfolioCrmSummary() {
  const [peopleRes, relationshipsRes, contactOrgNamesRes, tenantOrgRes] = await Promise.all([
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
    clientTenantOrganisations: tenantOrgRes.count ?? 0,
    businessRelationships: relationshipsRes.count ?? 0,
  };
}
