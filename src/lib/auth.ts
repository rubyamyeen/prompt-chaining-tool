import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

interface AuthResult {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  error: string | null;
  debugInfo?: string;
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
  const debugSteps: string[] = [];

  try {
    debugSteps.push("1. Creating Supabase client...");
    console.log("[Auth Debug] Step 1: Creating Supabase client");

    const supabase = await createClient();
    debugSteps.push("2. Supabase client created successfully");
    console.log("[Auth Debug] Step 2: Supabase client created");

    debugSteps.push("3. Calling supabase.auth.getUser()...");
    console.log("[Auth Debug] Step 3: Getting user");

    const { data: authData, error: authError } = await supabase.auth.getUser();

    debugSteps.push(`4. getUser result - error: ${authError?.message ?? 'none'}, user: ${authData?.user?.id ?? 'null'}`);
    console.log("[Auth Debug] Step 4: getUser result", {
      error: authError?.message,
      userId: authData?.user?.id,
      userEmail: authData?.user?.email
    });

    // No session or auth error means user needs to log in
    if (authError || !authData.user) {
      debugSteps.push("5. No user found, redirecting to /login");
      console.log("[Auth Debug] Step 5: Redirecting to /login");
      redirect("/login");
    }

    debugSteps.push(`5. User authenticated: ${authData.user.email}`);
    debugSteps.push("6. Querying profiles table...");
    console.log("[Auth Debug] Step 6: Querying profiles for user", authData.user.id);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, is_superadmin, is_matrix_admin, created_datetime_utc, modified_datetime_utc, created_by_user_id, modified_by_user_id")
      .eq("id", authData.user.id)
      .single();

    debugSteps.push(`7. Profile query result - error: ${profileError?.message ?? 'none'}, profile: ${profile?.id ?? 'null'}`);
    console.log("[Auth Debug] Step 7: Profile query result", {
      error: profileError?.message,
      profileId: profile?.id,
      is_superadmin: profile?.is_superadmin,
      is_matrix_admin: profile?.is_matrix_admin
    });

    if (profileError) {
      console.error("[Auth] profiles query error:", profileError);
      return {
        user: { id: authData.user.id, email: authData.user.email ?? "" },
        profile: null,
        error: `Failed to load profile: ${profileError.message}`,
        debugInfo: debugSteps.join("\n"),
      };
    }

    // Check for admin access: is_superadmin OR is_matrix_admin
    if (!profile || (!profile.is_superadmin && !profile.is_matrix_admin)) {
      debugSteps.push("8. User lacks admin access, redirecting to /unauthorized");
      console.log("[Auth Debug] Step 8: User lacks admin access", {
        profile: !!profile,
        is_superadmin: profile?.is_superadmin,
        is_matrix_admin: profile?.is_matrix_admin
      });
      redirect("/unauthorized");
    }

    debugSteps.push("8. Admin access confirmed!");
    console.log("[Auth Debug] Step 8: Admin access confirmed");

    return {
      user: { id: authData.user.id, email: authData.user.email ?? "" },
      profile: profile as Profile,
      error: null,
      debugInfo: debugSteps.join("\n"),
    };
  } catch (err) {
    // Re-throw redirect errors (they're not real errors)
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      throw err;
    }

    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const errorStack = err instanceof Error ? err.stack : String(err);

    debugSteps.push(`ERROR: ${errorMessage}`);
    debugSteps.push(`Stack: ${errorStack}`);

    console.error("[Auth] Unexpected error:", err);
    console.error("[Auth] Error stack:", errorStack);
    console.error("[Auth] Debug steps:", debugSteps);

    return {
      user: null,
      profile: null,
      error: `${errorMessage}\n\nStack: ${errorStack}`,
      debugInfo: debugSteps.join("\n"),
    };
  }
}

/**
 * Gets the current user without requiring admin access.
 * Used for checking authentication state.
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (err) {
    console.error("[getCurrentUser] Error:", err);
    return null;
  }
}
