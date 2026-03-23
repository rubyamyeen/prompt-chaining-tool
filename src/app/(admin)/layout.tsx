import { requireAdminAccess } from "@/lib/auth";
import AdminLayout from "@/components/AdminLayout";

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, error } = await requireAdminAccess();

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-lg w-full">
          <h1 className="text-xl font-bold text-red-700 dark:text-red-400 mb-4">
            Admin Error
          </h1>
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-4">
            <p className="text-red-800 dark:text-red-300 font-medium">
              Failed to load admin area
            </p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-2">{error}</p>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-4">
            Check Vercel logs for more details.
          </p>
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
}
