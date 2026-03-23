import { createClient } from "@/lib/supabase/server";
import CaptionTester from "./CaptionTester";

async function getData() {
  const debugInfo: string[] = [];

  try {
    debugInfo.push("1. Creating Supabase client...");
    console.log("[TestPage] Creating Supabase client");

    const supabase = await createClient();
    debugInfo.push("2. Supabase client created");

    // Fetch humor flavors
    debugInfo.push("3. Fetching humor_flavors...");
    const { data: flavors, error: flavorsError } = await supabase
      .from("humor_flavors")
      .select("id, slug, description")
      .order("slug", { ascending: true });

    debugInfo.push(`4. Flavors result - error: ${flavorsError?.message ?? 'none'}, count: ${flavors?.length ?? 0}`);
    console.log("[TestPage] Flavors:", { error: flavorsError?.message, count: flavors?.length });

    if (flavorsError) {
      console.error("[TestPage] Fetch flavors error:", flavorsError);
    }

    // Fetch test images (public or common use)
    debugInfo.push("5. Fetching images...");
    const { data: images, error: imagesError } = await supabase
      .from("images")
      .select("id, url, image_description, additional_context")
      .or("is_public.eq.true,is_common_use.eq.true")
      .order("created_datetime_utc", { ascending: false })
      .limit(50);

    debugInfo.push(`6. Images result - error: ${imagesError?.message ?? 'none'}, count: ${images?.length ?? 0}`);
    console.log("[TestPage] Images:", { error: imagesError?.message, count: images?.length });

    if (imagesError) {
      console.error("[TestPage] Fetch images error:", imagesError);
    }

    return {
      flavors: flavors ?? [],
      images: images ?? [],
      errors: [
        flavorsError ? `Flavors: ${flavorsError.message} (code: ${flavorsError.code})` : null,
        imagesError ? `Images: ${imagesError.message} (code: ${imagesError.code})` : null,
      ].filter(Boolean) as string[],
      debugInfo: debugInfo.join("\n"),
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const errorStack = err instanceof Error ? err.stack : String(err);

    debugInfo.push(`ERROR: ${errorMessage}`);
    debugInfo.push(`Stack: ${errorStack}`);

    console.error("[TestPage] Exception:", err);

    return {
      flavors: [],
      images: [],
      errors: [`Exception: ${errorMessage}`],
      debugInfo: debugInfo.join("\n"),
    };
  }
}

export default async function TestCaptionsPage() {
  try {
    const { flavors, images, errors, debugInfo } = await getData();

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Test Caption Generation
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Select an image and a humor flavor to test caption generation.
          </p>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-400 font-medium">Failed to load data</p>
            {errors.map((err, i) => (
              <pre key={i} className="text-red-600 dark:text-red-300 text-sm mt-1 font-mono whitespace-pre-wrap">{err}</pre>
            ))}
            {/* DEBUG INFO - REMOVE AFTER FIXING */}
            <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
              <p className="text-yellow-700 dark:text-yellow-400 font-medium text-sm">Debug Info:</p>
              <pre className="text-yellow-600 dark:text-yellow-500 text-xs mt-1 whitespace-pre-wrap">{debugInfo}</pre>
            </div>
          </div>
        )}

        <CaptionTester flavors={flavors} images={images} />
      </div>
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const errorStack = err instanceof Error ? err.stack : String(err);

    console.error("[TestPage] Render exception:", err);

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-red-700 dark:text-red-400">
          Page Error
        </h1>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 font-medium">{errorMessage}</p>
          <pre className="text-red-600 dark:text-red-400 text-xs mt-2 whitespace-pre-wrap overflow-x-auto">
            {errorStack}
          </pre>
        </div>
      </div>
    );
  }
}
