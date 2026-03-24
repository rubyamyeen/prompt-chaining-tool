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
 * Checks if a response body looks like a timeout or transient error.
 */
function isTimeoutError(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("timeout") || lower.includes("timed out") || lower.includes("gateway");
}

/**
 * Extracts a user-friendly error message from API response.
 */
function extractErrorMessage(rawText: string, status: number): string {
  // Check for timeout-specific errors
  if (isTimeoutError(rawText)) {
    return "Caption generation timed out. Please try again.";
  }

  // Try to parse as JSON and extract error message
  try {
    const parsed = JSON.parse(rawText);
    if (parsed.error?.message) return parsed.error.message;
    if (parsed.message) return parsed.message;
    if (parsed.error && typeof parsed.error === "string") return parsed.error;
  } catch {
    // Not JSON, use raw text
  }

  // Truncate very long error messages
  const truncated = rawText.length > 200 ? rawText.substring(0, 200) + "..." : rawText;
  return `API error (${status}): ${truncated}`;
}

/**
 * Safely parses response body based on content-type.
 */
async function safeParseResponse(response: Response): Promise<{ json?: unknown; text: string; isJson: boolean }> {
  const contentType = response.headers.get("content-type") || "";
  const isJsonContent = contentType.includes("application/json");

  // Always get the text first (can only read body once)
  let text: string;
  try {
    text = await response.text();
  } catch (err) {
    console.error("[apiCall] Failed to read response body:", err);
    return { text: "Failed to read response body", isJson: false };
  }

  // If content-type is JSON, try to parse
  if (isJsonContent) {
    try {
      const json = JSON.parse(text);
      return { json, text, isJson: true };
    } catch (err) {
      console.error("[apiCall] Content-type was JSON but parsing failed:", err);
      return { text, isJson: false };
    }
  }

  // Content-type is not JSON, but try parsing anyway (some APIs don't set headers correctly)
  try {
    const json = JSON.parse(text);
    return { json, text, isJson: true };
  } catch {
    // Not JSON, that's fine
    return { text, isJson: false };
  }
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

    // Log response details for debugging
    console.log("[apiCall] Response:", {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
    });

    // Safely parse the response
    const { json, text, isJson } = await safeParseResponse(response);

    // Log parsed body for debugging (truncated)
    console.log("[apiCall] Body:", {
      isJson,
      preview: text.length > 500 ? text.substring(0, 500) + "..." : text,
    });

    // Handle error responses
    if (!response.ok) {
      const errorMessage = extractErrorMessage(text, response.status);
      return { error: errorMessage };
    }

    // Handle successful responses
    if (isJson && json !== undefined) {
      return { data: json as T };
    }

    // Response was OK but not JSON - check if it's an error message disguised as success
    if (isTimeoutError(text)) {
      return { error: "Caption generation timed out. Please try again." };
    }

    // Return text as data (some endpoints might return plain text on success)
    return { data: text as T };
  } catch (err) {
    console.error("[apiCall] Fetch exception:", err);
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
