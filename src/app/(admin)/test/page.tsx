import { createClient } from "@/lib/supabase/server";
import CaptionTester from "./CaptionTester";

export const dynamic = "force-dynamic";

interface HumorFlavorOption {
  id: number;
  slug: string;
  description: string | null;
}

interface ImageOption {
  id: string;
  url: string | null;
  image_description: string | null;
  additional_context: string | null;
}

export default async function TestCaptionsPage() {
  let flavors: HumorFlavorOption[] = [];
  let images: ImageOption[] = [];
  const errors: string[] = [];

  try {
    const supabase = await createClient();

    // Fetch humor flavors
    const { data: flavorsData, error: flavorsError } = await supabase
      .from("humor_flavors")
      .select("id, slug, description")
      .order("slug", { ascending: true });

    if (flavorsError) {
      console.error("[TestCaptionsPage] Flavors query error:", JSON.stringify(flavorsError, null, 2));
      errors.push(`Flavors: ${flavorsError.message}`);
    } else {
      flavors = (flavorsData as HumorFlavorOption[]) ?? [];
    }

    // Fetch test images (public or common use)
    const { data: imagesData, error: imagesError } = await supabase
      .from("images")
      .select("id, url, image_description, additional_context")
      .or("is_public.eq.true,is_common_use.eq.true")
      .order("created_datetime_utc", { ascending: false })
      .limit(50);

    if (imagesError) {
      console.error("[TestCaptionsPage] Images query error:", JSON.stringify(imagesError, null, 2));
      errors.push(`Images: ${imagesError.message}`);
    } else {
      images = (imagesData as ImageOption[]) ?? [];
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    console.error("[TestCaptionsPage] Exception:", msg);
    console.error("[TestCaptionsPage] Stack:", stack);
    errors.push(msg);
  }

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
            <p key={i} className="text-red-600 dark:text-red-300 text-sm mt-1">{err}</p>
          ))}
        </div>
      )}

      <CaptionTester flavors={flavors} images={images} />
    </div>
  );
}
