import { createClient } from "@/lib/supabase/server";
import CaptionTester from "./CaptionTester";

export const dynamic = "force-dynamic";

export default async function TestCaptionsPage() {
  const supabase = await createClient();

  // Fetch humor flavors
  const { data: flavors, error: flavorsError } = await supabase
    .from("humor_flavors")
    .select("id, slug, description")
    .order("slug", { ascending: true });

  // Fetch test images (public or common use)
  const { data: images, error: imagesError } = await supabase
    .from("images")
    .select("id, url, image_description, additional_context")
    .or("is_public.eq.true,is_common_use.eq.true")
    .order("created_datetime_utc", { ascending: false })
    .limit(50);

  const errors = [flavorsError?.message, imagesError?.message].filter(Boolean);

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

      <CaptionTester flavors={flavors ?? []} images={images ?? []} />
    </div>
  );
}
