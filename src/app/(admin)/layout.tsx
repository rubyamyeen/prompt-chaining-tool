import { requireAdminAccess } from "@/lib/auth";
import AdminLayout from "@/components/AdminLayout";

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let debugInfo = "";

  try {
    console.log("[AdminLayout] Starting requireAdminAccess...");
    const { user, error, debugInfo: authDebug } = await requireAdminAccess();
    debugInfo = authDebug ?? "";

    console.log("[AdminLayout] requireAdminAccess completed", { user: user?.email, error });

    if (error) {
      console.error("[AdminLayout] Auth error:", error);
      return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl w-full">
            <h1 className="text-xl font-bold text-red-700 dark:text-red-400 mb-4">
              Admin Error
            </h1>
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-4">
              <p className="text-red-800 dark:text-red-300 font-medium">
                Failed to load admin area
              </p>
              <pre className="text-red-600 dark:text-red-400 text-sm mt-2 whitespace-pre-wrap overflow-x-auto">
                {error}
              </pre>
            </div>

            {/* DEBUG INFO - REMOVE AFTER FIXING */}
            <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded p-4">
              <p className="text-yellow-800 dark:text-yellow-300 font-medium text-sm">
                Debug Info (remove after fixing):
              </p>
              <pre className="text-yellow-700 dark:text-yellow-400 text-xs mt-2 whitespace-pre-wrap overflow-x-auto">
                {debugInfo}
              </pre>
            </div>

            <a
              href="/login"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Login
            </a>
          </div>
        </div>
      );
    }

    return <AdminLayout userEmail={user?.email ?? "Unknown"}>{children}</AdminLayout>;
  } catch (err) {
    // Re-throw redirect errors
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      throw err;
    }

    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const errorStack = err instanceof Error ? err.stack : String(err);

    console.error("[AdminLayout] Caught exception:", err);
    console.error("[AdminLayout] Stack:", errorStack);

    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl w-full">
          <h1 className="text-xl font-bold text-red-700 dark:text-red-400 mb-4">
            Server Error (Caught Exception)
          </h1>
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-4">
            <p className="text-red-800 dark:text-red-300 font-medium">
              {errorMessage}
            </p>
            <pre className="text-red-600 dark:text-red-400 text-xs mt-2 whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
              {errorStack}
            </pre>
          </div>

          {/* DEBUG INFO - REMOVE AFTER FIXING */}
          {debugInfo && (
            <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded p-4">
              <p className="text-yellow-800 dark:text-yellow-300 font-medium text-sm">
                Debug Steps:
              </p>
              <pre className="text-yellow-700 dark:text-yellow-400 text-xs mt-2 whitespace-pre-wrap overflow-x-auto">
                {debugInfo}
              </pre>
            </div>
          )}

          <a
            href="/login"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }
}
