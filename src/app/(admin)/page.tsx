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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Humor Flavors</h1>
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <h2 className="text-red-700 dark:text-red-400 font-bold">Error Loading Flavors</h2>
          <p className="text-red-600 dark:text-red-300 text-sm mt-1">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Humor Flavors</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {flavors.length} total
        </span>
      </div>

      <HumorFlavorsTable initialData={flavors} />
    </div>
  );
}
