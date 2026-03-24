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

/**
 * Step info for debugging.
 */
export interface StepDebugInfo {
  stepNumber: number;
  orderId: number;
  stepType: string;
  model: string;
  inputType: string;
  outputType: string;
  hasSystemPrompt: boolean;
  hasUserPrompt: boolean;
  temperature: number | null;
}

/**
 * Configuration warning for a humor flavor.
 */
export interface FlavorWarning {
  type: "error" | "warning";
  message: string;
}

export interface CaptionGenerationResult {
  captions: CaptionRecord[];
  primaryCaption: string;
  imageId: string;
  humorFlavorId: number;
  humorFlavorSlug: string;
  // Debug info
  steps?: StepDebugInfo[];
  warnings?: FlavorWarning[];
}

/**
 * Fetches and validates humor flavor steps.
 */
async function fetchAndValidateSteps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  humorFlavorId: number,
  flavorSlug: string
): Promise<{ steps: StepDebugInfo[]; warnings: FlavorWarning[] }> {
  const warnings: FlavorWarning[] = [];
  const steps: StepDebugInfo[] = [];

  try {
    // Fetch steps with lookups
    const { data: stepsData, error: stepsError } = await supabase
      .from("humor_flavor_steps")
      .select(`
        id,
        order_by,
        llm_temperature,
        llm_system_prompt,
        llm_user_prompt,
        humor_flavor_step_type_id,
        llm_model_id,
        llm_input_type_id,
        llm_output_type_id
      `)
      .eq("humor_flavor_id", humorFlavorId)
      .order("order_by", { ascending: true });

    if (stepsError) {
      warnings.push({ type: "error", message: `Failed to fetch steps: ${stepsError.message}` });
      return { steps, warnings };
    }

    if (!stepsData || stepsData.length === 0) {
      warnings.push({ type: "error", message: "No steps defined for this flavor" });
      return { steps, warnings };
    }

    // Fetch lookup tables
    const [modelsResult, stepTypesResult, inputTypesResult, outputTypesResult] = await Promise.all([
      supabase.from("llm_models").select("id, name"),
      supabase.from("humor_flavor_step_types").select("id, slug, description"),
      supabase.from("llm_input_types").select("id, slug, description"),
      supabase.from("llm_output_types").select("id, slug, description"),
    ]);

    const models = modelsResult.data ?? [];
    const stepTypes = stepTypesResult.data ?? [];
    const inputTypes = inputTypesResult.data ?? [];
    const outputTypes = outputTypesResult.data ?? [];

    // Helper to get names
    const getModelName = (id: number) => models.find(m => m.id === id)?.name ?? `Unknown(${id})`;
    const getStepTypeName = (id: number) => {
      const t = stepTypes.find(t => t.id === id);
      return t ? (t.description || t.slug) : `Unknown(${id})`;
    };
    const getInputTypeName = (id: number) => {
      const t = inputTypes.find(t => t.id === id);
      return t ? (t.description || t.slug) : `Unknown(${id})`;
    };
    const getOutputTypeName = (id: number) => {
      const t = outputTypes.find(t => t.id === id);
      return t ? (t.description || t.slug) : `Unknown(${id})`;
    };

    // Build step debug info
    const orderValues: number[] = [];

    for (let i = 0; i < stepsData.length; i++) {
      const step = stepsData[i];
      const stepNumber = i + 1;

      steps.push({
        stepNumber,
        orderId: step.order_by,
        stepType: getStepTypeName(step.humor_flavor_step_type_id),
        model: getModelName(step.llm_model_id),
        inputType: getInputTypeName(step.llm_input_type_id),
        outputType: getOutputTypeName(step.llm_output_type_id),
        hasSystemPrompt: !!step.llm_system_prompt?.trim(),
        hasUserPrompt: !!step.llm_user_prompt?.trim(),
        temperature: step.llm_temperature,
      });

      // Check for issues
      orderValues.push(step.order_by);

      if (!step.llm_model_id || step.llm_model_id === 0) {
        warnings.push({ type: "error", message: `Step ${stepNumber}: No model selected` });
      }

      if (!step.humor_flavor_step_type_id || step.humor_flavor_step_type_id === 0) {
        warnings.push({ type: "error", message: `Step ${stepNumber}: No step type selected` });
      }

      if (!step.llm_input_type_id || step.llm_input_type_id === 0) {
        warnings.push({ type: "error", message: `Step ${stepNumber}: No input type selected` });
      }

      if (!step.llm_output_type_id || step.llm_output_type_id === 0) {
        warnings.push({ type: "error", message: `Step ${stepNumber}: No output type selected` });
      }

      if (!step.llm_system_prompt?.trim() && !step.llm_user_prompt?.trim()) {
        warnings.push({ type: "warning", message: `Step ${stepNumber}: No prompts defined` });
      }
    }

    // Check for duplicate order values
    const uniqueOrders = new Set(orderValues);
    if (uniqueOrders.size !== orderValues.length) {
      warnings.push({ type: "warning", message: "Duplicate order values detected" });
    }

    // Check for input/output type chain compatibility
    for (let i = 1; i < stepsData.length; i++) {
      const prevStep = stepsData[i - 1];
      const currStep = stepsData[i];
      if (prevStep.llm_output_type_id !== currStep.llm_input_type_id) {
        const prevOutput = getOutputTypeName(prevStep.llm_output_type_id);
        const currInput = getInputTypeName(currStep.llm_input_type_id);
        warnings.push({
          type: "warning",
          message: `Step ${i} output (${prevOutput}) doesn't match Step ${i + 1} input (${currInput})`,
        });
      }
    }

    // Log step chain for debugging
    console.log(`[generateCaptions] Flavor: ${flavorSlug} (ID: ${humorFlavorId})`);
    console.log(`[generateCaptions] Steps (${steps.length}):`);
    steps.forEach((s, i) => {
      console.log(`  ${i + 1}. [${s.stepType}] Model: ${s.model} | Input: ${s.inputType} → Output: ${s.outputType} | Temp: ${s.temperature ?? "default"} | Prompts: sys=${s.hasSystemPrompt}, user=${s.hasUserPrompt}`);
    });
    if (warnings.length > 0) {
      console.log(`[generateCaptions] Warnings (${warnings.length}):`);
      warnings.forEach(w => console.log(`  [${w.type}] ${w.message}`));
    }

  } catch (err) {
    console.error("[generateCaptions] Error fetching steps:", err);
    warnings.push({ type: "error", message: `Failed to validate steps: ${err instanceof Error ? err.message : "Unknown error"}` });
  }

  return { steps, warnings };
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
  let stepDebugInfo: StepDebugInfo[] = [];
  let stepWarnings: FlavorWarning[] = [];

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

    // Fetch and validate steps (for debugging)
    const { steps, warnings } = await fetchAndValidateSteps(supabase, humorFlavorId, flavor.slug);
    stepDebugInfo = steps;
    stepWarnings = warnings;

    // Check for critical errors before proceeding
    const criticalErrors = warnings.filter(w => w.type === "error");
    if (criticalErrors.length > 0 && steps.length === 0) {
      return {
        error: `Flavor configuration error: ${criticalErrors[0].message}`,
        data: {
          captions: [],
          primaryCaption: "",
          imageId: "",
          humorFlavorId,
          humorFlavorSlug: flavor.slug,
          steps: stepDebugInfo,
          warnings: stepWarnings,
        },
      };
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
      console.error(`[generateCaptions] Caption API failed for flavor ${flavor.slug}:`, captionResult.error);
      return {
        error: `Failed to generate captions: ${captionResult.error}`,
        data: {
          captions: [],
          primaryCaption: "",
          imageId: "",
          humorFlavorId,
          humorFlavorSlug: flavor.slug,
          steps: stepDebugInfo,
          warnings: stepWarnings,
        },
      };
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
        steps: stepDebugInfo,
        warnings: stepWarnings,
      },
    };
  } catch (err) {
    console.error("[generateCaptions] Exception:", err);
    return {
      error: err instanceof Error ? err.message : "Unknown error during caption generation",
      data: stepDebugInfo.length > 0 ? {
        captions: [],
        primaryCaption: "",
        imageId: "",
        humorFlavorId,
        humorFlavorSlug: "",
        steps: stepDebugInfo,
        warnings: stepWarnings,
      } : undefined,
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
