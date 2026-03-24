"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult<T = unknown> = { data?: T; error?: string };

const API_BASE_URL = process.env.ALMOSTCRACKD_API_URL || "https://api.almostcrackd.ai";

/**
 * Gets the authenticated user and their session access token.
 */
async function requireAuthWithSession() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error("No active session");
  }

  return { supabase, userId: user.id, accessToken: session.access_token };
}

/**
 * Makes an authenticated API call to the AlmostCrackd pipeline.
 */
async function apiCall<T = unknown>(
  endpoint: string,
  accessToken: string,
  options: {
    method?: string;
    body?: unknown;
  } = {}
): Promise<{ data?: T; error?: string }> {
  const { method = "POST", body } = options;
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const rawText = await response.text();

    if (!response.ok) {
      return { error: `API error (${response.status}): ${rawText}` };
    }

    try {
      const data = JSON.parse(rawText);
      return { data };
    } catch {
      return { data: rawText as T };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "API call failed" };
  }
}

/**
 * Caption record returned by the generate-captions API.
 */
export interface CaptionRecord {
  id: string;
  content: string;
  image_id: string;
  humor_flavor_id: number;
  is_public?: boolean;
  is_featured?: boolean;
  like_count?: number;
  created_datetime_utc?: string;
}

export interface CaptionGenerationResult {
  captions: CaptionRecord[];
  primaryCaption: string;
  imageId: string;
  humorFlavorId: number;
  humorFlavorSlug: string;
}

/**
 * Generates captions for an image using a specific humor flavor.
 *
 * Pipeline flow:
 * 1. POST /pipeline/upload-image-from-url - Register the image URL
 * 2. POST /pipeline/generate-captions - Generate captions
 *
 * The generate-captions API returns an array of caption records:
 * [{ id, content, image_id, humor_flavor_id, ... }]
 */
export async function generateCaptionsForFlavor({
  imageId,
  humorFlavorId,
}: {
  imageId: string;
  humorFlavorId: number;
}): Promise<ActionResult<CaptionGenerationResult>> {
  try {
    const { supabase, accessToken } = await requireAuthWithSession();

    // Fetch the image URL from the database
    const { data: image, error: imageError } = await supabase
      .from("images")
      .select("id, url")
      .eq("id", imageId)
      .single();

    if (imageError || !image) {
      return { error: `Image not found: ${imageError?.message ?? "Unknown error"}` };
    }

    if (!image.url) {
      return { error: "Image has no URL" };
    }

    // Fetch the humor flavor
    const { data: flavor, error: flavorError } = await supabase
      .from("humor_flavors")
      .select("id, slug")
      .eq("id", humorFlavorId)
      .single();

    if (flavorError || !flavor) {
      return { error: `Humor flavor not found: ${flavorError?.message ?? "Unknown error"}` };
    }

    // ============================================================
    // PIPELINE STEP 1: Register the image URL
    // ============================================================
    const uploadResult = await apiCall<{ imageId?: string; image_id?: string; id?: string }>(
      "/pipeline/upload-image-from-url",
      accessToken,
      {
        body: {
          imageUrl: image.url,
          isCommonUse: false,
        },
      }
    );

    if (uploadResult.error) {
      return { error: `Failed to register image: ${uploadResult.error}` };
    }

    const uploadData = uploadResult.data;
    const pipelineImageId = uploadData?.imageId ?? uploadData?.image_id ?? uploadData?.id;

    if (!pipelineImageId) {
      return { error: "No imageId returned from upload-image-from-url" };
    }

    // ============================================================
    // PIPELINE STEP 2: Generate captions
    // Response is an array of caption records: [{ id, content, ... }]
    // ============================================================
    const captionResult = await apiCall<CaptionRecord[]>(
      "/pipeline/generate-captions",
      accessToken,
      {
        body: {
          imageId: pipelineImageId,
          humorFlavorId: humorFlavorId,
        },
      }
    );

    if (captionResult.error) {
      return { error: `Failed to generate captions: ${captionResult.error}` };
    }

    // Parse the response - it's a direct array of caption records
    const captionsArray = captionResult.data;

    if (!Array.isArray(captionsArray) || captionsArray.length === 0) {
      return { error: "No captions returned from API" };
    }

    // Extract the primary caption (first one) and all captions
    const primaryCaption = captionsArray[0]?.content ?? "";

    return {
      data: {
        captions: captionsArray,
        primaryCaption,
        imageId: String(pipelineImageId),
        humorFlavorId,
        humorFlavorSlug: flavor.slug,
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error during caption generation"
    };
  }
}

/**
 * Gets test images from the images table.
 */
export async function getTestImages(limit = 20) {
  try {
    const { supabase } = await requireAuthWithSession();

    const { data, error } = await supabase
      .from("images")
      .select("id, url, image_description, additional_context")
      .or("is_public.eq.true,is_common_use.eq.true")
      .order("created_datetime_utc", { ascending: false })
      .limit(limit);

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data ?? [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Gets all humor flavors for the test UI dropdown.
 */
export async function getHumorFlavorsForTest() {
  try {
    const { supabase } = await requireAuthWithSession();

    const { data, error } = await supabase
      .from("humor_flavors")
      .select("id, slug, description")
      .order("slug", { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data ?? [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : "Unknown error" };
  }
}
