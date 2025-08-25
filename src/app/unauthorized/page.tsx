'use client';

import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="max-w-xl mx-auto text-center py-20">
      <h1 className="text-2xl font-semibold mb-3">Access denied</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        You don’t have permission to view this page.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link
          href="/"
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Go to Home
        </Link>
        <Link
          href="/oncall"
          className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Open On Call
        </Link>
        <Link
          href="/directory"
          className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Open Directory
        </Link>
      </div>
    </div>
  );
}