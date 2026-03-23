import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import HumorFlavorStepsManager from "./HumorFlavorStepsManager";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getData(id: number) {
  const debugInfo: string[] = [];

  try {
    debugInfo.push(`1. Getting data for flavor ID: ${id}`);
    console.log("[FlavorDetailPage] Getting data for flavor ID:", id);

    const supabase = await createClient();
    debugInfo.push("2. Supabase client created");

    // Fetch flavor
    debugInfo.push("3. Fetching flavor...");
    const { data: flavor, error: flavorError } = await supabase
      .from("humor_flavors")
      .select("*")
      .eq("id", id)
      .single();

    debugInfo.push(`4. Flavor result - error: ${flavorError?.message ?? 'none'}, found: ${!!flavor}`);
    console.log("[FlavorDetailPage] Flavor result:", { error: flavorError?.message, found: !!flavor });

    if (flavorError || !flavor) {
      return {
        flavor: null,
        steps: [],
        lookups: null,
        error: `Flavor error: ${flavorError?.message ?? "Flavor not found"}\nCode: ${flavorError?.code}\nDetails: ${flavorError?.details}`,
        debugInfo: debugInfo.join("\n"),
      };
    }

    // Fetch steps with related data
    debugInfo.push("5. Fetching steps...");
    const { data: steps, error: stepsError } = await supabase
      .from("humor_flavor_steps")
      .select(`
        *,
        llm_models(id, name),
        llm_input_types(id, name),
        llm_output_types(id, name),
        humor_flavor_step_types(id, name)
      `)
      .eq("humor_flavor_id", id)
      .order("order_by", { ascending: true });

    debugInfo.push(`6. Steps result - error: ${stepsError?.message ?? 'none'}, count: ${steps?.length ?? 0}`);
    console.log("[FlavorDetailPage] Steps result:", { error: stepsError?.message, count: steps?.length });

    if (stepsError) {
      console.error("[FlavorDetailPage] Steps error:", stepsError);
    }

    // Fetch lookup data
    debugInfo.push("7. Fetching lookup tables...");
    const [modelsResult, inputTypesResult, outputTypesResult, stepTypesResult] = await Promise.all([
      supabase.from("llm_models").select("id, name").order("name"),
      supabase.from("llm_input_types").select("id, name").order("name"),
      supabase.from("llm_output_types").select("id, name").order("name"),
      supabase.from("humor_flavor_step_types").select("id, name").order("name"),
    ]);

    debugInfo.push(`8. Lookups - models: ${modelsResult.data?.length ?? 0}, inputTypes: ${inputTypesResult.data?.length ?? 0}, outputTypes: ${outputTypesResult.data?.length ?? 0}, stepTypes: ${stepTypesResult.data?.length ?? 0}`);
    debugInfo.push(`   Lookup errors: models=${modelsResult.error?.message}, inputTypes=${inputTypesResult.error?.message}, outputTypes=${outputTypesResult.error?.message}, stepTypes=${stepTypesResult.error?.message}`);

    console.log("[FlavorDetailPage] Lookups loaded");

    return {
      flavor,
      steps: steps ?? [],
      lookups: {
        llmModels: modelsResult.data ?? [],
        llmInputTypes: inputTypesResult.data ?? [],
        llmOutputTypes: outputTypesResult.data ?? [],
        humorFlavorStepTypes: stepTypesResult.data ?? [],
      },
      error: stepsError?.message ?? null,
      debugInfo: debugInfo.join("\n"),
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const errorStack = err instanceof Error ? err.stack : String(err);

    debugInfo.push(`ERROR: ${errorMessage}`);
    debugInfo.push(`Stack: ${errorStack}`);

    console.error("[FlavorDetailPage] Exception:", err);

    return {
      flavor: null,
      steps: [],
      lookups: null,
      error: `Exception: ${errorMessage}\n\nStack: ${errorStack}`,
      debugInfo: debugInfo.join("\n"),
    };
  }
}

export default async function FlavorDetailPage({ params }: PageProps) {
  try {
    const { id } = await params;
    const flavorId = parseInt(id, 10);

    console.log("[FlavorDetailPage] Rendering for ID:", id, "parsed:", flavorId);

    if (isNaN(flavorId)) {
      console.log("[FlavorDetailPage] Invalid ID, returning notFound");
      notFound();
    }

    const { flavor, steps, lookups, error, debugInfo } = await getData(flavorId);

    if (!flavor) {
      // Show error instead of notFound for debugging
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-red-700 dark:text-red-400">
            Flavor Not Found
          </h1>
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <pre className="text-red-600 dark:text-red-400 text-sm whitespace-pre-wrap">{error}</pre>
          </div>
          {debugInfo && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-300 font-medium text-sm">Debug Info:</p>
              <pre className="text-yellow-700 dark:text-yellow-400 text-xs mt-2 whitespace-pre-wrap">{debugInfo}</pre>
            </div>
          )}
          <Link href="/" className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Back to Flavors
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {flavor.slug}
            </h1>
            {flavor.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {flavor.description}
              </p>
            )}
          </div>
        </div>

        {/* Steps section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Steps
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {steps.length} step{steps.length !== 1 ? "s" : ""}
            </span>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-700 dark:text-red-400 font-medium">Failed to load steps</p>
              <pre className="text-red-600 dark:text-red-300 text-sm mt-1 font-mono whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          <HumorFlavorStepsManager
            humorFlavorId={flavorId}
            initialSteps={steps}
            lookups={lookups!}
          />
        </div>
      </div>
    );
  } catch (err) {
    // Re-throw redirect/notFound errors
    if (err instanceof Error && (err.message.includes("NEXT_REDIRECT") || err.message.includes("NEXT_NOT_FOUND"))) {
      throw err;
    }

    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const errorStack = err instanceof Error ? err.stack : String(err);

    console.error("[FlavorDetailPage] Render exception:", err);

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
