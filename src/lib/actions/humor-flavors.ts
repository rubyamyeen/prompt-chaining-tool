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
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("humor_flavors")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("[HumorFlavors] Fetch error:", error);
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}

export async function getHumorFlavor(id: number) {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("humor_flavors")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[HumorFlavors] Fetch single error:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createHumorFlavor(formData: HumorFlavorFormData): Promise<ActionResult> {
  const { supabase, userId } = await requireAuth();

  const { data, error } = await supabase
    .from("humor_flavors")
    .insert({
      slug: formData.slug,
      description: formData.description,
      created_by_user_id: userId,
      modified_by_user_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error("[HumorFlavors] Create error:", error);
    return { error: error.message };
  }

  revalidatePath("/");
  return { data };
}

export async function updateHumorFlavor(id: number, formData: HumorFlavorFormData): Promise<ActionResult> {
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
    console.error("[HumorFlavors] Update error:", error);
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/flavor/${id}`);
  return { data };
}

export async function deleteHumorFlavor(id: number): Promise<ActionResult> {
  const { supabase } = await requireAuth();

  // First delete all steps for this flavor
  const { error: stepsError } = await supabase
    .from("humor_flavor_steps")
    .delete()
    .eq("humor_flavor_id", id);

  if (stepsError) {
    console.error("[HumorFlavors] Delete steps error:", stepsError);
    return { error: `Failed to delete steps: ${stepsError.message}` };
  }

  // Then delete the flavor
  const { error } = await supabase
    .from("humor_flavors")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[HumorFlavors] Delete error:", error);
    return { error: error.message };
  }

  revalidatePath("/");
  return { data: { success: true } };
}
