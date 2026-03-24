import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";

export const dynamic = "force-dynamic";

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    console.log("[Layout] Step 1: Creating client");
    const supabase = await createClient();

    console.log("[Layout] Step 2: Getting user");
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.log("[Layout] No user, redirecting");
      redirect("/login");
    }

    console.log("[Layout] Step 3: Getting profile");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, is_superadmin, is_matrix_admin")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      console.log("[Layout] Profile error:", profileError.message);
      return (
        <div className="min-h-screen bg-gray-900 p-8">
          <div className="bg-red-900/30 border border-red-800 rounded p-4">
            <h1 className="text-red-400 font-bold">Profile Error</h1>
            <p className="text-red-400 text-sm">{profileError.message}</p>
          </div>
        </div>
      );
    }

    if (!profile || (!profile.is_superadmin && !profile.is_matrix_admin)) {
      console.log("[Layout] No admin access");
      redirect("/unauthorized");
    }

    console.log("[Layout] Step 4: Rendering AdminLayout");
    return <AdminLayout userEmail={authData.user.email ?? "Unknown"}>{children}</AdminLayout>;
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      throw err;
    }

    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    console.error("[Layout] Exception:", msg);

    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="bg-red-900/30 border border-red-800 rounded p-4">
          <h1 className="text-red-400 font-bold">Layout Exception</h1>
          <pre className="text-red-400 text-sm whitespace-pre-wrap">{msg}</pre>
          <pre className="text-red-500 text-xs mt-2 whitespace-pre-wrap">{stack}</pre>
        </div>
      </div>
    );
  }
}
