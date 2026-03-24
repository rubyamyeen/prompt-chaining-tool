// TEMPORARY: Simplified layout for debugging - no auth checks
export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      {children}
    </div>
  );
}
