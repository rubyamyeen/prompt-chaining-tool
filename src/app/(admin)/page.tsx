// STEP 2: Minimal page - auth + profile check in layout
export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Prompt chaining tool is alive
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        Profile role check passed. Next step: humor flavors query.
      </p>
    </div>
  );
}
