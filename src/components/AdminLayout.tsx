"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// TEMP: Add usePathname back to test
interface AdminLayoutProps {
  children: React.ReactNode;
  userEmail: string;
}

export default function AdminLayout({ children, userEmail }: AdminLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Simple sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-gray-800 border-r border-gray-700 p-4">
        <h1 className="text-xl font-bold text-white mb-4">Prompt Chain Tool</h1>
        <nav className="space-y-2">
          <Link
            href="/"
            className={`block px-3 py-2 rounded ${
              pathname === "/" ? "bg-blue-900/30 text-blue-400" : "text-gray-300 hover:bg-gray-700"
            }`}
          >
            Humor Flavors
          </Link>
          <Link
            href="/test"
            className={`block px-3 py-2 rounded ${
              pathname === "/test" ? "bg-blue-900/30 text-blue-400" : "text-gray-300 hover:bg-gray-700"
            }`}
          >
            Test Captions
          </Link>
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
