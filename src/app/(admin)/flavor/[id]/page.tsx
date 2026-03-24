import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import HumorFlavorStepsManager from "./HumorFlavorStepsManager";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FlavorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const flavorId = parseInt(id, 10);

  if (isNaN(flavorId)) {
    notFound();
  }

  const supabase = await createClient();

  // Fetch flavor
  const { data: flavor, error: flavorError } = await supabase
    .from("humor_flavors")
    .select("*")
    .eq("id", flavorId)
    .single();

  if (flavorError || !flavor) {
    notFound();
  }

  // Fetch steps with related data
  const { data: steps, error: stepsError } = await supabase
    .from("humor_flavor_steps")
    .select(`
      *,
      llm_models(id, name),
      llm_input_types(id, name),
      llm_output_types(id, name),
      humor_flavor_step_types(id, name)
    `)
    .eq("humor_flavor_id", flavorId)
    .order("order_by", { ascending: true });

  // Fetch lookup data
  const [modelsResult, inputTypesResult, outputTypesResult, stepTypesResult] = await Promise.all([
    supabase.from("llm_models").select("id, name").order("name"),
    supabase.from("llm_input_types").select("id, name").order("name"),
    supabase.from("llm_output_types").select("id, name").order("name"),
    supabase.from("humor_flavor_step_types").select("id, name").order("name"),
  ]);

  const lookups = {
    llmModels: modelsResult.data ?? [],
    llmInputTypes: inputTypesResult.data ?? [],
    llmOutputTypes: outputTypesResult.data ?? [],
    humorFlavorStepTypes: stepTypesResult.data ?? [],
  };

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
            {steps?.length ?? 0} step{(steps?.length ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>

        {stepsError && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-red-700 dark:text-red-400 font-medium">Failed to load steps</p>
            <p className="text-red-600 dark:text-red-300 text-sm mt-1">{stepsError.message}</p>
          </div>
        )}

        <HumorFlavorStepsManager
          humorFlavorId={flavorId}
          initialSteps={steps ?? []}
          lookups={lookups}
        />
      </div>
    </div>
  );
}
