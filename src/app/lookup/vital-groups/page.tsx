'use client';

import { useEffect, useMemo, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import Header from '@/components/Header';

// Force dynamic so Next.js doesn't try to prerender with missing public env vars
export const dynamic = 'force-dynamic';

type VitalGroup = {
  id: number;
  vital_group_name: string;
  group_code: string;
};

export default function VitalGroupsLookupPage() {
  // Create browser client only on client side
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null as any;
    return getBrowserClient();
  }, []);

  const [groups, setGroups] = useState<VitalGroup[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!supabase) return; // skip during SSR/build
    const fetchGroups = async () => {
      const { data, error } = await supabase
        .from('vital_medical_groups')
        .select('*');
      if (!error && data) setGroups(data);
    };
    fetchGroups();
  }, [supabase]);

  const filtered = groups.filter(
    (g) =>
      g.vital_group_name.toLowerCase().includes(search.toLowerCase()) ||
      g.group_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4">
      <Header />
      <h1 className="text-2xl font-semibold mb-4">Vital Medical Group Lookup</h1>
      <input
        type="text"
        placeholder="Search by name or group code"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-3 py-2 border rounded mb-4"
      />
      <ul className="space-y-2">
        {filtered.map((group) => (
          <li
            key={group.id}
            className="flex justify-between items-center border px-4 py-2 rounded"
          >
            <span className="font-medium">{group.vital_group_name}</span>
            <span className="text-sm font-bold text-gray-800">{group.group_code}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}