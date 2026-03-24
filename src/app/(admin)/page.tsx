import { createClient } from "@/lib/supabase/server";
import HumorFlavorsTable from "./HumorFlavorsTable";
import type { HumorFlavor } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function HumorFlavorsPage() {
  const supabase = await createClient();

  const { data: flavors, error } = await supabase
    .from("humor_flavors")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
        <h1 className="text-red-700 dark:text-red-400 font-bold">Error Loading Flavors</h1>
        <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Humor Flavors</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {flavors?.length ?? 0} total
        </span>
      </div>

      <HumorFlavorsTable initialData={(flavors as HumorFlavor[]) ?? []} />
    </div>
  );
}
