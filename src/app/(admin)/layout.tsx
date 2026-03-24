// STEP 1: Add auth check only - no profile query yet
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    console.log("[Layout Step 1] Creating Supabase client...");
    const supabase = await createClient();

    console.log("[Layout Step 1] Calling getUser()...");
    const { data: authData, error: authError } = await supabase.auth.getUser();

    console.log("[Layout Step 1] getUser result:", {
      hasUser: !!authData?.user,
      userId: authData?.user?.id,
      error: authError?.message,
    });

    if (authError || !authData.user) {
      console.log("[Layout Step 1] No user, redirecting to /login");
      redirect("/login");
    }

    // SUCCESS: User is authenticated
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-blue-700 dark:text-blue-400 font-medium">
            Step 1 OK: Auth check passed
          </p>
          <p className="text-blue-600 dark:text-blue-500 text-sm mt-1">
            User: {authData.user.email}
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

    console.error("[Layout Step 1] Exception:", err);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-2xl mx-auto p-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <h1 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
            Step 1 FAILED: Auth check
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
