import { createClient } from "@/lib/supabase/server";
import HumorFlavorsTable from "./HumorFlavorsTable";
import type { HumorFlavor } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function HumorFlavorsPage() {
  let flavors: HumorFlavor[] = [];
  let errorMessage: string | null = null;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("humor_flavors")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("[HumorFlavorsPage] Supabase query error:", JSON.stringify(error, null, 2));
      errorMessage = error.message;
    } else {
      flavors = (data as HumorFlavor[]) ?? [];
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    console.error("[HumorFlavorsPage] Exception:", msg);
    console.error("[HumorFlavorsPage] Stack:", stack);
    errorMessage = msg;
  }

  if (errorMessage) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
            Humor Flavors
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Manage your prompt chain configurations
          </p>
        </div>
        <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-red-700 dark:text-red-400">Error Loading Flavors</h2>
              <p className="mt-1 text-sm text-red-600 dark:text-red-300">{errorMessage}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
            Humor Flavors
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Manage your prompt chain configurations
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/[0.06]">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {flavors.length} {flavors.length === 1 ? 'flavor' : 'flavors'}
          </span>
        </div>
      </div>

      {/* Flavors Table */}
      <HumorFlavorsTable initialData={flavors} />
    </div>
  );
}
