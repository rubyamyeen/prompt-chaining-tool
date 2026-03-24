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
