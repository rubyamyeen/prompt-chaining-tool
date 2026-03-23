import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  // DEBUG: Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  console.log("[Supabase Server] Creating client...");
  console.log("[Supabase Server] SUPABASE_URL defined:", !!supabaseUrl);
  console.log("[Supabase Server] SUPABASE_URL value:", supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : "MISSING");
  console.log("[Supabase Server] SUPABASE_ANON_KEY defined:", !!supabaseAnonKey);
  console.log("[Supabase Server] SUPABASE_ANON_KEY length:", supabaseAnonKey?.length ?? 0);

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL environment variable is not set");
  }

  if (!supabaseAnonKey) {
    throw new Error("SUPABASE_ANON_KEY environment variable is not set");
  }

  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
