"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult<T = unknown> = { data?: T; error?: string };

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export interface CaptionGenerationResult {
  caption: string;
  stepResults?: {
    stepId: number;
    stepDescription: string | null;
    output: string;
    processingTimeSeconds?: number;
  }[];
  error?: string;
}

/**
 * Generates captions for an image using a specific humor flavor.
 *
 * This function is isolated so the API call can be easily adjusted
 * when the exact endpoint specification is provided.
 *
 * @param params.imageId - The UUID of the image from the images table
 * @param params.humorFlavorId - The ID of the humor flavor to use
 * @returns The generated caption and intermediate step results
 */
export async function generateCaptionsForFlavor({
  imageId,
  humorFlavorId,
}: {
  imageId: string;
  humorFlavorId: number;
}): Promise<ActionResult<CaptionGenerationResult>> {
  const { supabase } = await requireAuth();

  // Fetch the image URL
  const { data: image, error: imageError } = await supabase
    .from("images")
    .select("id, url")
    .eq("id", imageId)
    .single();

  if (imageError || !image) {
    return { error: `Image not found: ${imageError?.message ?? "Unknown error"}` };
  }

  // Fetch the humor flavor to verify it exists
  const { data: flavor, error: flavorError } = await supabase
    .from("humor_flavors")
    .select("id, slug")
    .eq("id", humorFlavorId)
    .single();

  if (flavorError || !flavor) {
    return { error: `Humor flavor not found: ${flavorError?.message ?? "Unknown error"}` };
  }

  try {
    // ============================================================
    // API CALL TO api.almostcrackd.ai
    //
    // This section is isolated for easy adjustment when the exact
    // API specification is provided. Current implementation uses
    // a reasonable default structure.
    // ============================================================

    const apiUrl = process.env.ALMOSTCRACKD_API_URL || "https://api.almostcrackd.ai";
    const apiKey = process.env.ALMOSTCRACKD_API_KEY;

    if (!apiKey) {
      return {
        error: "API key not configured. Set ALMOSTCRACKD_API_KEY environment variable."
      };
    }

    const response = await fetch(`${apiUrl}/v1/captions/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        image_id: imageId,
        image_url: image.url,
        humor_flavor_id: humorFlavorId,
        humor_flavor_slug: flavor.slug,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[CaptionGeneration] API error:", response.status, errorText);
      return {
        error: `API error (${response.status}): ${errorText}`
      };
    }

    const result = await response.json();

    // ============================================================
    // END API CALL SECTION
    // ============================================================

    return {
      data: {
        caption: result.caption ?? result.content ?? "",
        stepResults: result.step_results ?? result.steps ?? [],
      },
    };
  } catch (err) {
    console.error("[CaptionGeneration] Unexpected error:", err);
    return {
      error: err instanceof Error ? err.message : "Unknown error during caption generation"
    };
  }
}

/**
 * Gets test images from the images table.
 * Fetches public/common-use images suitable for testing.
 */
export async function getTestImages(limit = 20) {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("images")
    .select("id, url, image_description, additional_context")
    .or("is_public.eq.true,is_common_use.eq.true")
    .order("created_datetime_utc", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[CaptionGeneration] Fetch images error:", error);
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}

/**
 * Gets all humor flavors for the test UI dropdown.
 */
export async function getHumorFlavorsForTest() {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("humor_flavors")
    .select("id, slug, description")
    .order("slug", { ascending: true });

  if (error) {
    console.error("[CaptionGeneration] Fetch flavors error:", error);
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}
