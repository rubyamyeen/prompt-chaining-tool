"use client";

// TEMP: Minimal AdminLayout to isolate crash
interface AdminLayoutProps {
  children: React.ReactNode;
  userEmail: string;
}

export default function AdminLayout({ children, userEmail }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Simple sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-gray-800 border-r border-gray-700 p-4">
        <h1 className="text-xl font-bold text-white mb-4">Prompt Chain Tool</h1>
        <nav className="space-y-2">
          <a href="/" className="block px-3 py-2 text-gray-300 hover:bg-gray-700 rounded">
            Humor Flavors
          </a>
          <a href="/test" className="block px-3 py-2 text-gray-300 hover:bg-gray-700 rounded">
            Test Captions
          </a>
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-sm text-gray-400 truncate">{userEmail}</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
