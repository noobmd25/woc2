'use client';

import { useAccessGate } from '@/lib/useAccessGate';
import OnCallViewer from '@/components/OnCallViewer';

export default function OnCallPage() {
  const { status } = useAccessGate({ requireApproved: true });

  if (status !== 'approved') {
    return (
      <div className="p-6 text-gray-600">Checking access…</div>
    );
  }

  return <OnCallViewer />;
}