// STEP 3: Add humor flavors query
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  try {
    console.log("[Page Step 3] Creating Supabase client...");
    const supabase = await createClient();

    console.log("[Page Step 3] Querying humor_flavors...");
    const { data: flavors, error } = await supabase
      .from("humor_flavors")
      .select("id, slug, description")
      .order("id", { ascending: true });

    console.log("[Page Step 3] Query result:", {
      count: flavors?.length ?? 0,
      error: error?.message,
      errorCode: error?.code,
    });

    if (error) {
      return (
        <div className="max-w-2xl mx-auto">
          <div className="p-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <h1 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
              Step 3 FAILED: humor_flavors query error
            </h1>
            <pre className="text-red-600 dark:text-red-400 text-sm whitespace-pre-wrap">
Error: {error.message}
Code: {error.code}
Details: {error.details}
Hint: {error.hint}
            </pre>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto">
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg mb-6">
          <p className="text-green-700 dark:text-green-400 font-medium">
            Step 3 OK: humor_flavors query passed
          </p>
          <p className="text-green-600 dark:text-green-500 text-sm mt-1">
            Found {flavors?.length ?? 0} flavor(s)
          </p>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Humor Flavors
        </h1>

        {flavors && flavors.length > 0 ? (
          <ul className="space-y-2">
            {flavors.map((f) => (
              <li key={f.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="font-medium text-gray-900 dark:text-white">{f.slug}</span>
                {f.description && (
                  <span className="text-gray-500 dark:text-gray-400 ml-2">— {f.description}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No flavors found.</p>
        )}
      </div>
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : "";

    console.error("[Page Step 3] Exception:", err);

    return (
      <div className="max-w-2xl mx-auto">
        <div className="p-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <h1 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
            Step 3 FAILED: Exception
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
