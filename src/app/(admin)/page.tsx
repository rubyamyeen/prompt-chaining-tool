import { createClient } from "@/lib/supabase/server";
import HumorFlavorsTable from "./HumorFlavorsTable";

async function getData() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("humor_flavors")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("[HumorFlavors] Fetch error:", error);
    return { flavors: [], error: error.message };
  }

  return { flavors: data ?? [], error: null };
}

export default async function HumorFlavorsPage() {
  const { flavors, error } = await getData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Humor Flavors
        </h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {flavors.length} total
        </span>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400 font-medium">Failed to load data</p>
          <p className="text-red-600 dark:text-red-300 text-sm mt-1 font-mono">{error}</p>
        </div>
      )}

      <HumorFlavorsTable initialData={flavors} />
    </div>
  );
}
