// src/app/page.tsx (SERVER)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import * as React from 'react';
import { Suspense } from 'react';
import HomeClient from './HomeClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-600">Loading…</div>}>
      <HomeClient />
    </Suspense>
  );
}
