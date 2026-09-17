import { backendConfigured, requireSupabase } from "./supabase";

export type OrganizationKind = "business" | "charity" | "nonprofit";
export type GivingBasis = "fixed_per_sale" | "percentage_of_sales" | "fixed_campaign" | "direct_corporate";

export type OrganizationInput = {
  kind: OrganizationKind;
  legalName: string;
  registrationNumber?: string;
  countryCode?: string;
  website?: string;
};

export type CampaignInput = {
  businessOrganizationId: string;
  charityOrganizationId: string;
  projectId?: string;
  title?: string;
  jurisdictionCode?: string;
  givingBasis: GivingBasis;
  contributionValue: number;
  eligibleOffer?: string;
  expectedEligibleSales?: number;
  expectedEligibleRevenue?: number;
  expectedContribution?: number;
  startsOn?: string;
  endsOn?: string;
  publicStatementDraft?: string;
};

const unwrap = <T>(result: { data: T; error: { message: string } | null }) => {
  if (result.error) throw new Error(result.error.message);
  return result.data;
};

export const platformApi = {
  configured: backendConfigured,

  async session() {
    const client = requireSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async signInWithMagicLink(email: string) {
    const client = requireSupabase();
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/#/workspace" },
    });
    if (error) throw error;
  },

  async signOut() {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  async createOrganization(input: OrganizationInput) {
    const client = requireSupabase();
    return unwrap(await client.rpc("gr_create_organization", {
      p_kind: input.kind,
      p_legal_name: input.legalName,
      p_registration_number: input.registrationNumber || null,
      p_country_code: input.countryCode || "GB",
      p_website: input.website || null,
    }));
  },

  async organizations() {
    const client = requireSupabase();
    const { data, error } = await client
      .from("gr_organization_members")
      .select("role, organization:gr_organizations(*)")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async publicCharities() {
    const client = requireSupabase();
    const { data, error } = await client
      .from("gr_charity_profiles")
      .select("organization_id,cause,public_summary,public_slug,accepts_business_giving,accepts_volunteers,organization:gr_organizations(*)")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async publicProjects() {
    const client = requireSupabase();
    const { data, error } = await client
      .from("gr_projects")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createCampaign(input: CampaignInput) {
    const client = requireSupabase();
    const session = await this.session();
    if (!session?.user) throw new Error("Sign in to create a campaign.");

    const { data, error } = await client
      .from("gr_campaigns")
      .insert({
        business_organization_id: input.businessOrganizationId,
        charity_organization_id: input.charityOrganizationId,
        project_id: input.projectId || null,
        title: input.title || null,
        jurisdiction_code: input.jurisdictionCode || "GB",
        giving_basis: input.givingBasis,
        contribution_value: input.contributionValue,
        eligible_offer: input.eligibleOffer || null,
        expected_eligible_sales: input.expectedEligibleSales ?? null,
        expected_eligible_revenue: input.expectedEligibleRevenue ?? null,
        expected_contribution: input.expectedContribution ?? null,
        starts_on: input.startsOn || null,
        ends_on: input.endsOn || null,
        public_statement_draft: input.publicStatementDraft || null,
        created_by: session.user.id,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async submitCampaign(campaignId: string) {
    const client = requireSupabase();
    return unwrap(await client.rpc("gr_submit_campaign", { p_campaign_id: campaignId }));
  },

  async decideCampaign(campaignId: string, decision: "approved" | "declined", options?: { note?: string; approvedStatement?: string; agreementReference?: string }) {
    const client = requireSupabase();
    return unwrap(await client.rpc("gr_decide_campaign", {
      p_campaign_id: campaignId,
      p_decision: decision,
      p_note: options?.note || null,
      p_approved_statement: options?.approvedStatement || null,
      p_agreement_reference: options?.agreementReference || null,
    }));
  },

  async startCampaign(campaignId: string) {
    const client = requireSupabase();
    return unwrap(await client.rpc("gr_start_campaign", { p_campaign_id: campaignId }));
  },

  async submitReconciliation(campaignId: string, finalContribution: number, finalSales?: number, finalRevenue?: number) {
    const client = requireSupabase();
    return unwrap(await client.rpc("gr_submit_reconciliation", {
      p_campaign_id: campaignId,
      p_final_sales: finalSales ?? null,
      p_final_revenue: finalRevenue ?? null,
      p_final_contribution: finalContribution,
    }));
  },

  async campaigns() {
    const client = requireSupabase();
    const { data, error } = await client
      .from("gr_campaigns")
      .select("*, approvals:gr_campaign_approvals(*), payments:gr_payment_records(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async followProject(projectId: string) {
    const client = requireSupabase();
    const session = await this.session();
    if (!session?.user) throw new Error("Sign in to follow a project.");
    const { error } = await client.from("gr_project_follows").upsert({ project_id: projectId, user_id: session.user.id });
    if (error) throw error;
  },

  async saveVolunteerProfile(profile: { skills: string[]; interests: string[]; availability?: string; location?: string }) {
    const client = requireSupabase();
    const session = await this.session();
    if (!session?.user) throw new Error("Sign in to save a volunteer profile.");
    const { data, error } = await client
      .from("gr_volunteer_profiles")
      .upsert({ user_id: session.user.id, ...profile })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async applyForVolunteerRole(opportunityId: string, note?: string) {
    const client = requireSupabase();
    const session = await this.session();
    if (!session?.user) throw new Error("Sign in to apply.");
    const { data, error } = await client
      .from("gr_volunteer_applications")
      .insert({ opportunity_id: opportunityId, applicant_user_id: session.user.id, applicant_note: note || null })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async submitPublicIntake(payload: Record<string, unknown>) {
    const client = requireSupabase();
    const { data, error } = await client.functions.invoke("gr-public-intake", { body: payload });
    if (error) throw error;
    return data;
  },
};
