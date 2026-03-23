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

export interface HumorFlavorStepFormData {
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

export async function getHumorFlavorSteps(humorFlavorId: number) {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .select(`
      *,
      llm_models(id, name),
      llm_input_types(id, name),
      llm_output_types(id, name),
      humor_flavor_step_types(id, name)
    `)
    .eq("humor_flavor_id", humorFlavorId)
    .order("order_by", { ascending: true });

  if (error) {
    console.error("[HumorFlavorSteps] Fetch error:", error);
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}

export async function getHumorFlavorStep(id: number) {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .select(`
      *,
      llm_models(id, name),
      llm_input_types(id, name),
      llm_output_types(id, name),
      humor_flavor_step_types(id, name)
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("[HumorFlavorSteps] Fetch single error:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createHumorFlavorStep(formData: HumorFlavorStepFormData): Promise<ActionResult> {
  const { supabase, userId } = await requireAuth();

  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .insert({
      humor_flavor_id: formData.humor_flavor_id,
      order_by: formData.order_by,
      llm_temperature: formData.llm_temperature,
      llm_input_type_id: formData.llm_input_type_id,
      llm_output_type_id: formData.llm_output_type_id,
      llm_model_id: formData.llm_model_id,
      humor_flavor_step_type_id: formData.humor_flavor_step_type_id,
      llm_system_prompt: formData.llm_system_prompt,
      llm_user_prompt: formData.llm_user_prompt,
      description: formData.description,
      created_by_user_id: userId,
      modified_by_user_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error("[HumorFlavorSteps] Create error:", error);
    return { error: error.message };
  }

  revalidatePath(`/flavor/${formData.humor_flavor_id}`);
  return { data };
}

export async function updateHumorFlavorStep(id: number, formData: Partial<HumorFlavorStepFormData>): Promise<ActionResult> {
  const { supabase, userId } = await requireAuth();

  const updateData: Record<string, unknown> = {
    modified_by_user_id: userId,
  };

  // Only include fields that are provided
  if (formData.order_by !== undefined) updateData.order_by = formData.order_by;
  if (formData.llm_temperature !== undefined) updateData.llm_temperature = formData.llm_temperature;
  if (formData.llm_input_type_id !== undefined) updateData.llm_input_type_id = formData.llm_input_type_id;
  if (formData.llm_output_type_id !== undefined) updateData.llm_output_type_id = formData.llm_output_type_id;
  if (formData.llm_model_id !== undefined) updateData.llm_model_id = formData.llm_model_id;
  if (formData.humor_flavor_step_type_id !== undefined) updateData.humor_flavor_step_type_id = formData.humor_flavor_step_type_id;
  if (formData.llm_system_prompt !== undefined) updateData.llm_system_prompt = formData.llm_system_prompt;
  if (formData.llm_user_prompt !== undefined) updateData.llm_user_prompt = formData.llm_user_prompt;
  if (formData.description !== undefined) updateData.description = formData.description;

  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[HumorFlavorSteps] Update error:", error);
    return { error: error.message };
  }

  if (formData.humor_flavor_id) {
    revalidatePath(`/flavor/${formData.humor_flavor_id}`);
  }
  return { data };
}

export async function deleteHumorFlavorStep(id: number, humorFlavorId: number): Promise<ActionResult> {
  const { supabase } = await requireAuth();

  const { error } = await supabase
    .from("humor_flavor_steps")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[HumorFlavorSteps] Delete error:", error);
    return { error: error.message };
  }

  revalidatePath(`/flavor/${humorFlavorId}`);
  return { data: { success: true } };
}

export async function reorderHumorFlavorSteps(
  humorFlavorId: number,
  stepIds: number[]
): Promise<ActionResult> {
  const { supabase, userId } = await requireAuth();

  // Update each step with its new order
  const updates = stepIds.map((stepId, index) =>
    supabase
      .from("humor_flavor_steps")
      .update({
        order_by: index + 1,
        modified_by_user_id: userId,
      })
      .eq("id", stepId)
      .eq("humor_flavor_id", humorFlavorId)
  );

  const results = await Promise.all(updates);

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.error("[HumorFlavorSteps] Reorder errors:", errors);
    return { error: "Failed to reorder some steps" };
  }

  revalidatePath(`/flavor/${humorFlavorId}`);
  return { data: { success: true } };
}

// Get lookup tables data
export async function getLookupData() {
  const { supabase } = await requireAuth();

  const [modelsResult, inputTypesResult, outputTypesResult, stepTypesResult] = await Promise.all([
    supabase.from("llm_models").select("id, name").order("name"),
    supabase.from("llm_input_types").select("id, name").order("name"),
    supabase.from("llm_output_types").select("id, name").order("name"),
    supabase.from("humor_flavor_step_types").select("id, name").order("name"),
  ]);

  return {
    llmModels: modelsResult.data ?? [],
    llmInputTypes: inputTypesResult.data ?? [],
    llmOutputTypes: outputTypesResult.data ?? [],
    humorFlavorStepTypes: stepTypesResult.data ?? [],
    errors: [
      modelsResult.error?.message,
      inputTypesResult.error?.message,
      outputTypesResult.error?.message,
      stepTypesResult.error?.message,
    ].filter(Boolean),
  };
}
