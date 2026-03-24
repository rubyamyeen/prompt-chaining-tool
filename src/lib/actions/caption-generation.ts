"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult<T = unknown> = { data?: T; error?: string };

const API_BASE_URL = process.env.ALMOSTCRACKD_API_URL || "https://api.almostcrackd.ai";

/**
 * Gets the authenticated user and their session access token.
 * The access token is used to authenticate with the AlmostCrackd API.
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
async function apiCall<T>(
  endpoint: string,
  accessToken: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<{ data?: T; error?: string }> {
  const { method = "POST", body, headers = {} } = options;

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] ${endpoint} error:`, response.status, errorText);
      return { error: `API error (${response.status}): ${errorText}` };
    }

    const data = await response.json();
    return { data };
  } catch (err) {
    console.error(`[API] ${endpoint} exception:`, err);
    return { error: err instanceof Error ? err.message : "API call failed" };
  }
}

export interface CaptionGenerationResult {
  caption: string;
  captions?: string[];
  imageId?: string;
  stepResults?: {
    stepId: number;
    stepDescription: string | null;
    output: string;
    processingTimeSeconds?: number;
  }[];
}

/**
 * Generates captions for an image using a specific humor flavor.
 *
 * Pipeline flow:
 * 1. POST /pipeline/upload-image-from-url - Register the image URL
 * 2. POST /pipeline/generate-captions - Generate captions for the image
 *
 * For existing images with URLs, we skip the presigned URL upload steps.
 *
 * @param params.imageId - The UUID of the image from the images table
 * @param params.humorFlavorId - The ID of the humor flavor to use
 * @returns The generated caption and results
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

    // Fetch the humor flavor to verify it exists
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
    // POST /pipeline/upload-image-from-url
    // ============================================================
    console.log("[CaptionGeneration] Step 1: Registering image URL...");

    const uploadResult = await apiCall<{ imageId: string; url: string }>(
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

    const pipelineImageId = uploadResult.data?.imageId;
    if (!pipelineImageId) {
      return { error: "No imageId returned from upload-image-from-url" };
    }

    console.log("[CaptionGeneration] Step 1 complete. Pipeline imageId:", pipelineImageId);

    // ============================================================
    // PIPELINE STEP 2: Generate captions
    // POST /pipeline/generate-captions
    // ============================================================
    console.log("[CaptionGeneration] Step 2: Generating captions...");

    const captionResult = await apiCall<{
      caption?: string;
      captions?: string[];
      content?: string;
      step_results?: Array<{
        stepId: number;
        stepDescription: string | null;
        output: string;
        processingTimeSeconds?: number;
      }>;
    }>(
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

    console.log("[CaptionGeneration] Step 2 complete. Result:", captionResult.data);

    const result = captionResult.data;
    return {
      data: {
        caption: result?.caption ?? result?.content ?? result?.captions?.[0] ?? "",
        captions: result?.captions,
        imageId: pipelineImageId,
        stepResults: result?.step_results,
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
 * Full pipeline flow for uploading a new image and generating captions.
 *
 * Pipeline flow:
 * 1. POST /pipeline/generate-presigned-url - Get presigned URL for upload
 * 2. PUT image bytes to presigned URL
 * 3. POST /pipeline/upload-image-from-url - Register the uploaded image
 * 4. POST /pipeline/generate-captions - Generate captions
 *
 * @param params.imageFile - The image file to upload (as base64)
 * @param params.contentType - The MIME type of the image
 * @param params.humorFlavorId - The ID of the humor flavor to use
 */
export async function uploadAndGenerateCaptions({
  imageBase64,
  contentType,
  humorFlavorId,
}: {
  imageBase64: string;
  contentType: string;
  humorFlavorId: number;
}): Promise<ActionResult<CaptionGenerationResult>> {
  try {
    const { accessToken } = await requireAuthWithSession();

    // ============================================================
    // PIPELINE STEP 1: Get presigned URL
    // POST /pipeline/generate-presigned-url
    // ============================================================
    console.log("[Upload] Step 1: Getting presigned URL...");

    const presignedResult = await apiCall<{ presignedUrl: string; cdnUrl: string }>(
      "/pipeline/generate-presigned-url",
      accessToken,
      {
        body: { contentType },
      }
    );

    if (presignedResult.error || !presignedResult.data) {
      return { error: `Failed to get presigned URL: ${presignedResult.error}` };
    }

    const { presignedUrl, cdnUrl } = presignedResult.data;
    console.log("[Upload] Step 1 complete. CDN URL:", cdnUrl);

    // ============================================================
    // PIPELINE STEP 2: Upload image to presigned URL
    // PUT image bytes
    // ============================================================
    console.log("[Upload] Step 2: Uploading image...");

    // Convert base64 to binary
    const imageBuffer = Buffer.from(imageBase64, "base64");

    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: imageBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return { error: `Failed to upload image: ${uploadResponse.status} ${errorText}` };
    }

    console.log("[Upload] Step 2 complete.");

    // ============================================================
    // PIPELINE STEP 3: Register the uploaded image
    // POST /pipeline/upload-image-from-url
    // ============================================================
    console.log("[Upload] Step 3: Registering image...");

    const registerResult = await apiCall<{ imageId: string }>(
      "/pipeline/upload-image-from-url",
      accessToken,
      {
        body: {
          imageUrl: cdnUrl,
          isCommonUse: false,
        },
      }
    );

    if (registerResult.error || !registerResult.data?.imageId) {
      return { error: `Failed to register image: ${registerResult.error}` };
    }

    const pipelineImageId = registerResult.data.imageId;
    console.log("[Upload] Step 3 complete. Image ID:", pipelineImageId);

    // ============================================================
    // PIPELINE STEP 4: Generate captions
    // POST /pipeline/generate-captions
    // ============================================================
    console.log("[Upload] Step 4: Generating captions...");

    const captionResult = await apiCall<{
      caption?: string;
      captions?: string[];
      content?: string;
    }>(
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

    console.log("[Upload] Step 4 complete.");

    const result = captionResult.data;
    return {
      data: {
        caption: result?.caption ?? result?.content ?? result?.captions?.[0] ?? "",
        captions: result?.captions,
        imageId: pipelineImageId,
      },
    };
  } catch (err) {
    console.error("[Upload] Unexpected error:", err);
    return {
      error: err instanceof Error ? err.message : "Unknown error during upload"
    };
  }
}

/**
 * Gets test images from the images table.
 * Fetches public/common-use images suitable for testing.
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
