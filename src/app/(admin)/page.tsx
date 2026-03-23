import { createClient } from "@/lib/supabase/server";
import HumorFlavorsTable from "./HumorFlavorsTable";

async function getData() {
  try {
    console.log("[HumorFlavorsPage] Creating Supabase client...");
    const supabase = await createClient();

    console.log("[HumorFlavorsPage] Querying humor_flavors...");
    const { data, error } = await supabase
      .from("humor_flavors")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("[HumorFlavorsPage] Supabase error:", error);
      return {
        flavors: [],
        error: `Supabase error: ${error.message}\nCode: ${error.code}\nDetails: ${error.details}\nHint: ${error.hint}`
      };
    }

    console.log("[HumorFlavorsPage] Query successful, got", data?.length ?? 0, "flavors");
    return { flavors: data ?? [], error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const errorStack = err instanceof Error ? err.stack : String(err);

    console.error("[HumorFlavorsPage] Caught exception:", err);
    console.error("[HumorFlavorsPage] Stack:", errorStack);

    return {
      flavors: [],
      error: `Exception: ${errorMessage}\n\nStack: ${errorStack}`
    };
  }
}

export default async function HumorFlavorsPage() {
  try {
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
            <pre className="text-red-600 dark:text-red-300 text-sm mt-1 font-mono whitespace-pre-wrap overflow-x-auto">
              {error}
            </pre>
          </div>
        )}

        <HumorFlavorsTable initialData={flavors} />
      </div>
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const errorStack = err instanceof Error ? err.stack : String(err);

    console.error("[HumorFlavorsPage] Render exception:", err);

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-red-700 dark:text-red-400">
          Page Error
        </h1>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 font-medium">{errorMessage}</p>
          <pre className="text-red-600 dark:text-red-400 text-xs mt-2 whitespace-pre-wrap overflow-x-auto">
            {errorStack}
          </pre>
        </div>
      </div>
    );
  }
}
