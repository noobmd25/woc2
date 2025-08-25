'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAccessGate } from '@/lib/useAccessGate';
import Header from '@/components/Header';

type VitalGroup = {
  id: number;
  vital_group_name: string;
  group_code: string;
};

export default function VitalGroupsLookupPage() {
  useAccessGate();

  const [groups, setGroups] = useState<VitalGroup[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchGroups = async () => {
      const { data, error } = await supabase
        .from('vital_medical_groups')
        .select('*');
      if (!error && data) setGroups(data);
    };

    fetchGroups();
  }, []);

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