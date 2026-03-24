import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// TEMP: Simplified page without HumorFlavorsTable to isolate crash
export default async function HumorFlavorsPage() {
  try {
    console.log("[Page] Step 1: Creating client");
    const supabase = await createClient();

    console.log("[Page] Step 2: Querying flavors");
    const { data: flavors, error } = await supabase
      .from("humor_flavors")
      .select("id, slug, description")
      .order("id", { ascending: true });

    console.log("[Page] Step 3: Got", flavors?.length ?? 0, "flavors");

    if (error) {
      return (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded">
          <h1 className="text-red-400 font-bold">Query Error</h1>
          <p className="text-red-400 text-sm">{error.message}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Humor Flavors</h1>
          <span className="text-sm text-gray-400">{flavors?.length ?? 0} total</span>
        </div>

        <div className="bg-gray-800 rounded-lg shadow">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Slug</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Description</th>
              </tr>
            </thead>
            <tbody>
              {flavors?.map((flavor) => (
                <tr key={flavor.id} className="border-b border-gray-700/50">
                  <td className="px-4 py-3 text-sm text-gray-100">{flavor.id}</td>
                  <td className="px-4 py-3 text-sm text-blue-400">{flavor.slug}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{flavor.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    console.error("[Page] Exception:", msg);

    return (
      <div className="p-4 bg-red-900/30 border border-red-800 rounded">
        <h1 className="text-red-400 font-bold">Page Exception</h1>
        <pre className="text-red-400 text-sm whitespace-pre-wrap">{msg}</pre>
        <pre className="text-red-500 text-xs mt-2 whitespace-pre-wrap">{stack}</pre>
      </div>
    );
  }
}
