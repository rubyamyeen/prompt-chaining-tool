"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult<T = unknown> = { data?: T; error?: string };

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export interface HumorFlavorFormData {
  slug: string;
  description: string | null;
}

export async function getHumorFlavors() {
  try {
    const { supabase } = await requireAuth();

    const { data, error } = await supabase
      .from("humor_flavors")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("[HumorFlavors] Fetch error:", JSON.stringify(error, null, 2));
      return { data: [], error: error.message };
    }

    return { data: data ?? [], error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[HumorFlavors] Fetch exception:", msg);
    return { data: [], error: msg };
  }
}

export async function getHumorFlavor(id: number) {
  try {
    const { supabase } = await requireAuth();

    const { data, error } = await supabase
      .from("humor_flavors")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[HumorFlavors] Fetch single error:", JSON.stringify(error, null, 2));
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[HumorFlavors] Fetch single exception:", msg);
    return { data: null, error: msg };
  }
}

export async function createHumorFlavor(formData: HumorFlavorFormData): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    // Get the max ID to generate the next one (no default on id column)
    const { data: maxIdResult, error: maxIdError } = await supabase
      .from("humor_flavors")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (maxIdError && maxIdError.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is fine for empty table
      console.error("[HumorFlavors] Max ID query error:", JSON.stringify(maxIdError, null, 2));
      return { error: `Failed to get next ID: ${maxIdError.message}` };
    }

    const nextId = (maxIdResult?.id ?? 0) + 1;

    const { data, error } = await supabase
      .from("humor_flavors")
      .insert({
        id: nextId,
        slug: formData.slug,
        description: formData.description,
        created_by_user_id: userId,
        modified_by_user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("[HumorFlavors] Create error:", JSON.stringify(error, null, 2));
      return { error: error.message };
    }

    revalidatePath("/");
    return { data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[HumorFlavors] Create exception:", msg);
    return { error: msg };
  }
}

export async function updateHumorFlavor(id: number, formData: HumorFlavorFormData): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data, error } = await supabase
      .from("humor_flavors")
      .update({
        slug: formData.slug,
        description: formData.description,
        modified_by_user_id: userId,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[HumorFlavors] Update error:", JSON.stringify(error, null, 2));
      return { error: error.message };
    }

    revalidatePath("/");
    revalidatePath(`/flavor/${id}`);
    return { data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[HumorFlavors] Update exception:", msg);
    return { error: msg };
  }
}

export async function deleteHumorFlavor(id: number): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();

    // First delete all steps for this flavor
    const { error: stepsError } = await supabase
      .from("humor_flavor_steps")
      .delete()
      .eq("humor_flavor_id", id);

    if (stepsError) {
      console.error("[HumorFlavors] Delete steps error:", JSON.stringify(stepsError, null, 2));
      return { error: `Failed to delete steps: ${stepsError.message}` };
    }

    // Then delete the flavor
    const { error } = await supabase
      .from("humor_flavors")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[HumorFlavors] Delete error:", JSON.stringify(error, null, 2));
      return { error: error.message };
    }

    revalidatePath("/");
    return { data: { success: true } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[HumorFlavors] Delete exception:", msg);
    return { error: msg };
  }
}

export async function duplicateHumorFlavor(
  originalId: number,
  newSlug: string
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    // Validate newSlug is not empty
    const trimmedSlug = newSlug.trim();
    if (!trimmedSlug) {
      return { error: "Slug is required" };
    }

    // Check if slug already exists
    const { data: existingFlavor, error: checkError } = await supabase
      .from("humor_flavors")
      .select("id")
      .eq("slug", trimmedSlug)
      .maybeSingle();

    if (checkError) {
      console.error("[HumorFlavors] Duplicate check error:", JSON.stringify(checkError, null, 2));
      return { error: `Failed to check slug uniqueness: ${checkError.message}` };
    }

    if (existingFlavor) {
      return { error: `A flavor with slug "${trimmedSlug}" already exists. Please choose a different name.` };
    }

    // Get the original flavor
    const { data: originalFlavor, error: fetchFlavorError } = await supabase
      .from("humor_flavors")
      .select("*")
      .eq("id", originalId)
      .single();

    if (fetchFlavorError || !originalFlavor) {
      console.error("[HumorFlavors] Fetch original error:", JSON.stringify(fetchFlavorError, null, 2));
      return { error: `Failed to fetch original flavor: ${fetchFlavorError?.message ?? "Not found"}` };
    }

    // Get all steps for the original flavor
    const { data: originalSteps, error: fetchStepsError } = await supabase
      .from("humor_flavor_steps")
      .select("*")
      .eq("humor_flavor_id", originalId)
      .order("order_by", { ascending: true });

    if (fetchStepsError) {
      console.error("[HumorFlavors] Fetch steps error:", JSON.stringify(fetchStepsError, null, 2));
      return { error: `Failed to fetch original steps: ${fetchStepsError.message}` };
    }

    // Get the max flavor ID
    const { data: maxFlavorIdResult, error: maxFlavorIdError } = await supabase
      .from("humor_flavors")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (maxFlavorIdError && maxFlavorIdError.code !== "PGRST116") {
      console.error("[HumorFlavors] Max flavor ID error:", JSON.stringify(maxFlavorIdError, null, 2));
      return { error: `Failed to get next flavor ID: ${maxFlavorIdError.message}` };
    }

    const newFlavorId = (maxFlavorIdResult?.id ?? 0) + 1;

    // Create the new flavor
    const { data: newFlavor, error: createFlavorError } = await supabase
      .from("humor_flavors")
      .insert({
        id: newFlavorId,
        slug: trimmedSlug,
        description: originalFlavor.description,
        created_by_user_id: userId,
        modified_by_user_id: userId,
      })
      .select()
      .single();

    if (createFlavorError || !newFlavor) {
      console.error("[HumorFlavors] Create new flavor error:", JSON.stringify(createFlavorError, null, 2));
      return { error: `Failed to create new flavor: ${createFlavorError?.message ?? "Unknown error"}` };
    }

    // Copy steps if there are any
    if (originalSteps && originalSteps.length > 0) {
      // Get the max step ID
      const { data: maxStepIdResult, error: maxStepIdError } = await supabase
        .from("humor_flavor_steps")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)
        .single();

      if (maxStepIdError && maxStepIdError.code !== "PGRST116") {
        console.error("[HumorFlavors] Max step ID error:", JSON.stringify(maxStepIdError, null, 2));
        // Flavor was created, but steps failed - return partial success info
        return {
          error: `Flavor created but failed to copy steps: ${maxStepIdError.message}`,
          data: newFlavor,
        };
      }

      let nextStepId = (maxStepIdResult?.id ?? 0) + 1;

      // Create new steps
      const newSteps = originalSteps.map((step) => ({
        id: nextStepId++,
        humor_flavor_id: newFlavorId,
        order_by: step.order_by,
        llm_temperature: step.llm_temperature,
        llm_input_type_id: step.llm_input_type_id,
        llm_output_type_id: step.llm_output_type_id,
        llm_model_id: step.llm_model_id,
        humor_flavor_step_type_id: step.humor_flavor_step_type_id,
        llm_system_prompt: step.llm_system_prompt,
        llm_user_prompt: step.llm_user_prompt,
        description: step.description,
        created_by_user_id: userId,
        modified_by_user_id: userId,
      }));

      const { error: insertStepsError } = await supabase
        .from("humor_flavor_steps")
        .insert(newSteps);

      if (insertStepsError) {
        console.error("[HumorFlavors] Insert steps error:", JSON.stringify(insertStepsError, null, 2));
        // Flavor was created, but steps failed
        return {
          error: `Flavor created but failed to copy ${originalSteps.length} step(s): ${insertStepsError.message}`,
          data: newFlavor,
        };
      }
    }

    revalidatePath("/");
    revalidatePath(`/flavor/${newFlavorId}`);
    return { data: newFlavor };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[HumorFlavors] Duplicate exception:", msg);
    return { error: msg };
  }
}
