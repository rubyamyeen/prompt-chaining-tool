import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import HumorFlavorStepsManager from "./HumorFlavorStepsManager";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

// llm_models has: id, name
interface LlmModel {
  id: number;
  name: string;
}

// These tables use description/slug instead of name
interface LookupWithDescription {
  id: number;
  description: string | null;
  slug: string;
}

interface Lookups {
  llmModels: LlmModel[];
  llmInputTypes: LookupWithDescription[];
  llmOutputTypes: LookupWithDescription[];
  humorFlavorStepTypes: LookupWithDescription[];
  errors: string[];
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
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Flavors
        </Link>
        <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h1 className="text-red-700 dark:text-red-400 font-semibold">Invalid Flavor ID</h1>
              <p className="text-red-600 dark:text-red-300 text-sm mt-1">The ID &quot;{id}&quot; is not a valid number.</p>
            </div>
          </div>
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
    errors: [],
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

      // Fetch lookup data - use select("*") to get all columns
      // llm_models: id, name
      // llm_input_types: id, description, slug
      // llm_output_types: id, description, slug
      // humor_flavor_step_types: id, description, slug
      const [modelsResult, inputTypesResult, outputTypesResult, stepTypesResult] = await Promise.all([
        supabase.from("llm_models").select("*").order("name"),
        supabase.from("llm_input_types").select("*").order("slug"),
        supabase.from("llm_output_types").select("*").order("slug"),
        supabase.from("humor_flavor_step_types").select("*").order("slug"),
      ]);

      const lookupErrors: string[] = [];

      if (modelsResult.error) {
        console.error("[FlavorDetailPage] Models lookup error:", JSON.stringify(modelsResult.error, null, 2));
        lookupErrors.push(`LLM Models: ${modelsResult.error.message}`);
      }
      if (inputTypesResult.error) {
        console.error("[FlavorDetailPage] Input types lookup error:", JSON.stringify(inputTypesResult.error, null, 2));
        lookupErrors.push(`Input Types: ${inputTypesResult.error.message}`);
      }
      if (outputTypesResult.error) {
        console.error("[FlavorDetailPage] Output types lookup error:", JSON.stringify(outputTypesResult.error, null, 2));
        lookupErrors.push(`Output Types: ${outputTypesResult.error.message}`);
      }
      if (stepTypesResult.error) {
        console.error("[FlavorDetailPage] Step types lookup error:", JSON.stringify(stepTypesResult.error, null, 2));
        lookupErrors.push(`Step Types: ${stepTypesResult.error.message}`);
      }

      lookups = {
        llmModels: (modelsResult.data as LlmModel[]) ?? [],
        llmInputTypes: (inputTypesResult.data as LookupWithDescription[]) ?? [],
        llmOutputTypes: (outputTypesResult.data as LookupWithDescription[]) ?? [],
        humorFlavorStepTypes: (stepTypesResult.data as LookupWithDescription[]) ?? [],
        errors: lookupErrors,
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
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Flavors
        </Link>
        <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h1 className="text-red-700 dark:text-red-400 font-semibold">Error Loading Flavor</h1>
              <p className="text-red-600 dark:text-red-300 text-sm mt-1">{errorMessage ?? "Flavor not found"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/"
          className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
              {flavor.slug}
            </h1>
          </div>
          {flavor.description && (
            <p className="text-gray-500 dark:text-gray-400 ml-[52px]">
              {flavor.description}
            </p>
          )}
        </div>
      </div>

      {/* Steps section */}
      <div className="bg-white/60 dark:bg-[#1a1f2e]/60 backdrop-blur-sm rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
            Prompt Chain Steps
          </h2>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/[0.06]">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {steps.length} step{steps.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {stepsErrorMessage && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-red-700 dark:text-red-400 font-medium">Failed to load steps</p>
                <p className="text-red-600 dark:text-red-300 text-sm mt-1">{stepsErrorMessage}</p>
              </div>
            </div>
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
