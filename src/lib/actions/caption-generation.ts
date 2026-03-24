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
 * Returns the raw response for debugging.
 */
async function apiCall<T = unknown>(
  endpoint: string,
  accessToken: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<{ data?: T; error?: string; rawResponse?: string; status?: number }> {
  const { method = "POST", body, headers = {} } = options;

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[API] ${method} ${url}`);
  console.log(`[API] Request body:`, JSON.stringify(body, null, 2));

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const rawText = await response.text();
    console.log(`[API] ${endpoint} status:`, response.status);
    console.log(`[API] ${endpoint} raw response:`, rawText);

    if (!response.ok) {
      return {
        error: `API error (${response.status}): ${rawText}`,
        rawResponse: rawText,
        status: response.status,
      };
    }

    // Try to parse as JSON
    let data: T;
    try {
      data = JSON.parse(rawText);
      console.log(`[API] ${endpoint} parsed JSON:`, JSON.stringify(data, null, 2));
    } catch {
      console.log(`[API] ${endpoint} response is not JSON`);
      return { data: rawText as T, rawResponse: rawText, status: response.status };
    }

    return { data, rawResponse: rawText, status: response.status };
  } catch (err) {
    console.error(`[API] ${endpoint} exception:`, err);
    return { error: err instanceof Error ? err.message : "API call failed" };
  }
}

export interface CaptionGenerationResult {
  caption: string;
  captions?: string[];
  imageId?: string;
  humorFlavorId?: number;
  humorFlavorSlug?: string;
  // Raw response for debugging
  rawApiResponse?: unknown;
  debugInfo?: {
    uploadImageResponse?: unknown;
    generateCaptionsResponse?: unknown;
  };
}

/**
 * Generates captions for an image using a specific humor flavor.
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

    console.log("[CaptionGeneration] Using humor flavor:", flavor.slug, "(ID:", humorFlavorId, ")");
    console.log("[CaptionGeneration] Image URL:", image.url);

    // ============================================================
    // PIPELINE STEP 1: Register the image URL
    // ============================================================
    console.log("[CaptionGeneration] Step 1: Registering image URL...");

    const uploadResult = await apiCall<unknown>(
      "/pipeline/upload-image-from-url",
      accessToken,
      {
        body: {
          imageUrl: image.url,
          isCommonUse: false,
        },
      }
    );

    console.log("[CaptionGeneration] Step 1 full response:", uploadResult);

    if (uploadResult.error) {
      return {
        error: `Failed to register image: ${uploadResult.error}`,
        data: {
          caption: "",
          rawApiResponse: uploadResult.rawResponse,
          debugInfo: { uploadImageResponse: uploadResult },
        }
      };
    }

    // Extract imageId from response - try various shapes
    const uploadData = uploadResult.data as Record<string, unknown>;
    const pipelineImageId = uploadData?.imageId ?? uploadData?.image_id ?? uploadData?.id;

    if (!pipelineImageId) {
      return {
        error: `No imageId in upload response. Raw response: ${JSON.stringify(uploadResult.data)}`,
        data: {
          caption: "",
          rawApiResponse: uploadResult.data,
          debugInfo: { uploadImageResponse: uploadResult.data },
        }
      };
    }

    console.log("[CaptionGeneration] Step 1 complete. Pipeline imageId:", pipelineImageId);

    // ============================================================
    // PIPELINE STEP 2: Generate captions
    // ============================================================
    console.log("[CaptionGeneration] Step 2: Generating captions...");
    console.log("[CaptionGeneration] Request body will include humorFlavorId:", humorFlavorId);

    const captionResult = await apiCall<unknown>(
      "/pipeline/generate-captions",
      accessToken,
      {
        body: {
          imageId: pipelineImageId,
          humorFlavorId: humorFlavorId,
          // Also try alternate field names in case API expects different format
          humor_flavor_id: humorFlavorId,
          flavorId: humorFlavorId,
          flavor_id: humorFlavorId,
        },
      }
    );

    console.log("[CaptionGeneration] Step 2 full response:", captionResult);

    if (captionResult.error) {
      return {
        error: `Failed to generate captions: ${captionResult.error}`,
        data: {
          caption: "",
          rawApiResponse: captionResult.rawResponse,
          debugInfo: {
            uploadImageResponse: uploadResult.data,
            generateCaptionsResponse: captionResult,
          },
        }
      };
    }

    // Return raw response for debugging
    const result = captionResult.data;

    // Try to extract caption from various possible response shapes
    let caption = "";
    let captions: string[] = [];

    if (result) {
      const r = result as Record<string, unknown>;

      // Try different field names
      if (typeof r.caption === "string") caption = r.caption;
      else if (typeof r.content === "string") caption = r.content;
      else if (typeof r.text === "string") caption = r.text;
      else if (typeof r.result === "string") caption = r.result;
      else if (typeof r.output === "string") caption = r.output;

      // Check for array of captions
      if (Array.isArray(r.captions)) captions = r.captions;
      else if (Array.isArray(r.results)) captions = r.results;
      else if (Array.isArray(result)) captions = result as string[];

      // If we have captions array but no single caption, use first one
      if (!caption && captions.length > 0) {
        caption = typeof captions[0] === "string" ? captions[0] : JSON.stringify(captions[0]);
      }
    }

    return {
      data: {
        caption,
        captions: captions.length > 0 ? captions : undefined,
        imageId: String(pipelineImageId),
        humorFlavorId,
        humorFlavorSlug: flavor.slug,
        rawApiResponse: result,
        debugInfo: {
          uploadImageResponse: uploadResult.data,
          generateCaptionsResponse: result,
        },
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
      console.error("[CaptionGeneration] Fetch images error:", error);
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
      console.error("[CaptionGeneration] Fetch flavors error:", error);
      return { data: [], error: error.message };
    }

    return { data: data ?? [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : "Unknown error" };
  }
}
