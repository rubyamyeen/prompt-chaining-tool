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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
            Test Captions
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Select an image and a humor flavor to test caption generation
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/[0.06]">
          <div className="w-2 h-2 rounded-full bg-cyan-500" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {flavors.length} {flavors.length === 1 ? 'flavor' : 'flavors'} available
          </span>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p className="text-red-700 dark:text-red-400 font-semibold">Failed to load data</p>
              {errors.map((err, i) => (
                <p key={i} className="text-red-600 dark:text-red-300 text-sm mt-1">{err}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <CaptionTester flavors={flavors} images={images} />
    </div>
  );
}
