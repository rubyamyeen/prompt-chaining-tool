import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      redirect("/login");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, is_superadmin, is_matrix_admin")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-lg w-full">
            <h1 className="text-xl font-bold text-red-700 dark:text-red-400 mb-4">
              Profile Error
            </h1>
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-4">
              <p className="text-red-600 dark:text-red-400 text-sm">
                {profileError.message}
              </p>
            </div>
            <a
              href="/login"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Login
            </a>
          </div>
        </div>
      );
    }

    if (!profile || (!profile.is_superadmin && !profile.is_matrix_admin)) {
      redirect("/unauthorized");
    }

    return <AdminLayout userEmail={authData.user.email ?? "Unknown"}>{children}</AdminLayout>;
  } catch (err) {
    // Re-throw redirects
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      throw err;
    }

    const errorMessage = err instanceof Error ? err.message : String(err);

    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-lg w-full">
          <h1 className="text-xl font-bold text-red-700 dark:text-red-400 mb-4">
            Server Error
          </h1>
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-4">
            <p className="text-red-600 dark:text-red-400 text-sm">{errorMessage}</p>
          </div>
          <a
            href="/login"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }
}
