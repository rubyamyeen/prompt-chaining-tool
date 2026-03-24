import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import HumorFlavorStepsManager from "./HumorFlavorStepsManager";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface LookupOption {
  id: number;
  name: string;
}

interface Lookups {
  llmModels: LookupOption[];
  llmInputTypes: LookupOption[];
  llmOutputTypes: LookupOption[];
  humorFlavorStepTypes: LookupOption[];
}

interface HumorFlavorStep {
  id: number;
  humor_flavor_id: number;
  order_by: number;
  llm_temperature: number | null;
  llm_input_type_id: number;
  llm_output_type_id: number;
  llm_model_id: number;
  humor_flavor_step_type_id: number;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  description: string | null;
}

export default async function FlavorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const flavorId = parseInt(id, 10);

  if (isNaN(flavorId)) {
    return (
      <div className="space-y-6">
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
          &larr; Back to Flavors
        </Link>
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <h1 className="text-red-700 dark:text-red-400 font-bold">Invalid Flavor ID</h1>
          <p className="text-red-600 dark:text-red-300 text-sm mt-1">The ID &quot;{id}&quot; is not a valid number.</p>
        </div>
      </div>
    );
  }

  let flavor: { id: number; slug: string; description: string | null } | null = null;
  let steps: HumorFlavorStep[] = [];
  let lookups: Lookups = {
    llmModels: [],
    llmInputTypes: [],
    llmOutputTypes: [],
    humorFlavorStepTypes: [],
  };
  let errorMessage: string | null = null;
  let stepsErrorMessage: string | null = null;

  try {
    const supabase = await createClient();

    // Fetch flavor
    const { data: flavorData, error: flavorError } = await supabase
      .from("humor_flavors")
      .select("id, slug, description")
      .eq("id", flavorId)
      .single();

    if (flavorError) {
      console.error("[FlavorDetailPage] Flavor query error:", JSON.stringify(flavorError, null, 2));
      errorMessage = `Failed to load flavor: ${flavorError.message}`;
    } else if (!flavorData) {
      errorMessage = `Flavor with ID ${flavorId} not found`;
    } else {
      flavor = flavorData;

      // Fetch steps (without joins - lookups fetched separately)
      const { data: stepsData, error: stepsError } = await supabase
        .from("humor_flavor_steps")
        .select("*")
        .eq("humor_flavor_id", flavorId)
        .order("order_by", { ascending: true });

      if (stepsError) {
        console.error("[FlavorDetailPage] Steps query error:", JSON.stringify(stepsError, null, 2));
        stepsErrorMessage = stepsError.message;
      } else {
        steps = (stepsData as HumorFlavorStep[]) ?? [];
      }

      // Fetch lookup data
      const [modelsResult, inputTypesResult, outputTypesResult, stepTypesResult] = await Promise.all([
        supabase.from("llm_models").select("id, name").order("name"),
        supabase.from("llm_input_types").select("id, name").order("name"),
        supabase.from("llm_output_types").select("id, name").order("name"),
        supabase.from("humor_flavor_step_types").select("id, name").order("name"),
      ]);

      if (modelsResult.error) {
        console.error("[FlavorDetailPage] Models lookup error:", JSON.stringify(modelsResult.error, null, 2));
      }
      if (inputTypesResult.error) {
        console.error("[FlavorDetailPage] Input types lookup error:", JSON.stringify(inputTypesResult.error, null, 2));
      }
      if (outputTypesResult.error) {
        console.error("[FlavorDetailPage] Output types lookup error:", JSON.stringify(outputTypesResult.error, null, 2));
      }
      if (stepTypesResult.error) {
        console.error("[FlavorDetailPage] Step types lookup error:", JSON.stringify(stepTypesResult.error, null, 2));
      }

      lookups = {
        llmModels: modelsResult.data ?? [],
        llmInputTypes: inputTypesResult.data ?? [],
        llmOutputTypes: outputTypesResult.data ?? [],
        humorFlavorStepTypes: stepTypesResult.data ?? [],
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    console.error("[FlavorDetailPage] Exception:", msg);
    console.error("[FlavorDetailPage] Stack:", stack);
    errorMessage = msg;
  }

  if (errorMessage || !flavor) {
    return (
      <div className="space-y-6">
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
          &larr; Back to Flavors
        </Link>
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <h1 className="text-red-700 dark:text-red-400 font-bold">Error Loading Flavor</h1>
          <p className="text-red-600 dark:text-red-300 text-sm mt-1">{errorMessage ?? "Flavor not found"}</p>
        </div>
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

        {stepsErrorMessage && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-red-700 dark:text-red-400 font-medium">Failed to load steps</p>
            <p className="text-red-600 dark:text-red-300 text-sm mt-1">{stepsErrorMessage}</p>
          </div>
        )}

        <HumorFlavorStepsManager
          humorFlavorId={flavorId}
          initialSteps={steps}
          lookups={lookups}
        />
      </div>
    </div>
  );
}
