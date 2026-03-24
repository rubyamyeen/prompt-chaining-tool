import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

interface AuthResult {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  error: string | null;
}

/**
 * Requires the user to be authenticated and have either:
 * - is_superadmin === true
 * - OR is_matrix_admin === true
 *
 * Redirects to /login if not authenticated.
 * Redirects to /unauthorized if authenticated but lacks permissions.
 */
export async function requireAdminAccess(): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      redirect("/login");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, is_superadmin, is_matrix_admin, created_datetime_utc, modified_datetime_utc, created_by_user_id, modified_by_user_id")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      return {
        user: { id: authData.user.id, email: authData.user.email ?? "" },
        profile: null,
        error: `Failed to load profile: ${profileError.message}`,
      };
    }

    if (!profile || (!profile.is_superadmin && !profile.is_matrix_admin)) {
      redirect("/unauthorized");
    }

    return {
      user: { id: authData.user.id, email: authData.user.email ?? "" },
      profile: profile as Profile,
      error: null,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      throw err;
    }
    return {
      user: null,
      profile: null,
      error: err instanceof Error ? err.message : "Unknown auth error",
    };
  }
}

/**
 * Gets the current user without requiring admin access.
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}
