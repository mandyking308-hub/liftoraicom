import { supabase } from "@/integrations/supabase/client";

/** Roles allowed into the Founder / Executive Console. */
export const FOUNDER_CONSOLE_ROLES = ["founder", "admin"] as const;

export const hasFounderConsoleRole = (roles: ReadonlyArray<{ role: string }> | null | undefined) =>
  roles?.some((r) => (FOUNDER_CONSOLE_ROLES as readonly string[]).includes(r.role)) ?? false;

/** Reads the signed-in user's own roles (RLS-scoped) and checks founder/admin access. Fails closed. */
export const userHasFounderConsoleAccess = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) return false;
  return hasFounderConsoleRole(data);
};
