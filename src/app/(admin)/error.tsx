"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError] Caught error:", error);
    console.error("[AdminError] Error message:", error.message);
    console.error("[AdminError] Error stack:", error.stack);
    console.error("[AdminError] Error digest:", error.digest);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-6">
          <h1 className="text-red-400 font-bold text-xl mb-4">
            Application Error
          </h1>

          <div className="space-y-4">
            <div>
              <p className="text-red-300 font-medium">Error Message:</p>
              <pre className="text-red-400 text-sm mt-1 p-3 bg-red-950/50 rounded whitespace-pre-wrap break-words">
                {error.message}
              </pre>
            </div>

            {error.digest && (
              <div>
                <p className="text-red-300 font-medium">Error Digest:</p>
                <code className="text-red-400 text-sm">{error.digest}</code>
              </div>
            )}

            {error.stack && (
              <div>
                <p className="text-red-300 font-medium">Stack Trace:</p>
                <pre className="text-red-500 text-xs mt-1 p-3 bg-red-950/50 rounded whitespace-pre-wrap break-words max-h-64 overflow-auto">
                  {error.stack}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600"
            >
              Try Again
            </button>
            <a
              href="/"
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Go Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
