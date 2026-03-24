// STEP 2: Add profile role check (is_superadmin OR is_matrix_admin)
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    console.log("[Layout Step 2] Creating Supabase client...");
    const supabase = await createClient();

    console.log("[Layout Step 2] Calling getUser()...");
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.log("[Layout Step 2] No user, redirecting to /login");
      redirect("/login");
    }

    console.log("[Layout Step 2] User authenticated:", authData.user.email);
    console.log("[Layout Step 2] Querying profiles table...");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, is_superadmin, is_matrix_admin")
      .eq("id", authData.user.id)
      .single();

    console.log("[Layout Step 2] Profile query result:", {
      hasProfile: !!profile,
      profileId: profile?.id,
      is_superadmin: profile?.is_superadmin,
      is_matrix_admin: profile?.is_matrix_admin,
      error: profileError?.message,
      errorCode: profileError?.code,
    });

    if (profileError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
          <div className="max-w-2xl mx-auto p-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <h1 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
              Step 2 FAILED: Profile query error
            </h1>
            <pre className="text-red-600 dark:text-red-400 text-sm whitespace-pre-wrap">
Error: {profileError.message}
Code: {profileError.code}
Details: {profileError.details}
Hint: {profileError.hint}
            </pre>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-4">
              User ID: {authData.user.id}
            </p>
          </div>
        </div>
      );
    }

    if (!profile || (!profile.is_superadmin && !profile.is_matrix_admin)) {
      console.log("[Layout Step 2] User lacks admin access, redirecting");
      redirect("/unauthorized");
    }

    // SUCCESS: User is authenticated AND has admin access
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-700 dark:text-green-400 font-medium">
            Step 2 OK: Profile role check passed
          </p>
          <p className="text-green-600 dark:text-green-500 text-sm mt-1">
            User: {authData.user.email} | superadmin: {String(profile.is_superadmin)} | matrix_admin: {String(profile.is_matrix_admin)}
          </p>
        </div>
        {children}
      </div>
    );
  } catch (err) {
    // Re-throw redirects
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      throw err;
    }

    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : "";

    console.error("[Layout Step 2] Exception:", err);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-2xl mx-auto p-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <h1 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
            Step 2 FAILED: Exception
          </h1>
          <pre className="text-red-600 dark:text-red-400 text-sm whitespace-pre-wrap overflow-x-auto">
            {errorMessage}
          </pre>
          <pre className="text-red-500 dark:text-red-500 text-xs mt-4 whitespace-pre-wrap overflow-x-auto">
            {errorStack}
          </pre>
        </div>
      </div>
    );
  }
}
