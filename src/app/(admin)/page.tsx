// TEMPORARY: Minimal page for debugging - no auth, no Supabase, no API calls
export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Prompt chaining tool is alive
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        If you see this message, the basic Next.js rendering is working.
      </p>
      <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
        <p className="text-green-700 dark:text-green-400 font-medium">
          Status: Basic rendering OK
        </p>
      </div>
    </div>
  );
}
