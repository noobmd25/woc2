'use client';

import { useState, useEffect } from 'react';
import debounce from 'lodash/debounce';
import { getBrowserClient } from '@/lib/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
const supabase = getBrowserClient();

// Added: palette for group color coding
const GROUP_COLOR_PALETTE = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
];

export default function MMMPcpLookupPage() {
  const [pcpName, setPcpName] = useState('');
  const [results, setResults] = useState<{ name: string; medical_group: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortByGroup, setSortByGroup] = useState(false);
  const [groupColors, setGroupColors] = useState<Record<string, string>>({}); // NEW

  const debouncedLookup = debounce(async (name: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mmm_medical_groups')
      .select('name, medical_group')
      .ilike('name', `%${name}%`)
      .order('name', { ascending: true });

    if (!error) setResults(data || []);
    setLoading(false);
  }, 300);

  // NEW: initial load of full list (blank filter) on mount
  useEffect(() => {
    debouncedLookup('');
    return () => {
      debouncedLookup.cancel();
    };
  }, []); // run once

  // NEW: assign stable colors to each unique medical_group whenever result set changes
  useEffect(() => {
    if (results.length === 0) return;
    const unique = Array.from(new Set(results.map(r => r.medical_group))).sort((a, b) => a.localeCompare(b));
    const mapping: Record<string, string> = {};
    unique.forEach((g, idx) => {
      mapping[g] = GROUP_COLOR_PALETTE[idx % GROUP_COLOR_PALETTE.length];
    });
    setGroupColors(mapping);
  }, [results]);

  return (
    <>
      <Header />
      <div className="p-4">
        <h1 className="text-2xl font-semibold mb-4">MMM PCP Medical Group Lookup</h1>
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="Enter PCP Name"
            value={pcpName}
            onChange={(e) => {
              setPcpName(e.target.value);
              debouncedLookup(e.target.value);
            }}
            className="w-full md:w-auto border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>

        {loading && <p>Looking up...</p>}

        {!loading && results.length > 0 && (
          <>
            <div className="mb-2 text-sm text-right">
              <label className="mr-2">Sort:</label>
              <select
                value={sortByGroup ? 'group' : 'name'}
                onChange={(e) => setSortByGroup(e.target.value === 'group')}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="name">By Physician</option>
                <option value="group">By Group</option>
              </select>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Group</th>
                </tr>
              </thead>
              <tbody>
                {[...results]
                  .sort((a, b) => {
                    const key = sortByGroup ? 'medical_group' : 'name';
                    return a[key].localeCompare(b[key]);
                  })
                  .map((r, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white">
                      <td className="p-2">{r.name}</td>
                      <td className="p-2 font-semibold">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold tracking-wide ${groupColors[r.medical_group] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>
                          {r.medical_group}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        )}

        {!loading && results.length === 0 && pcpName && (
          <p>No matching provider found.</p>
        )}
      </div>
    </>
  );
}