'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import debounce from 'lodash/debounce';
import { getBrowserClient } from '@/lib/supabase/client';
import Header from '@/components/Header'; // added
import { usePageRefresh } from '@/components/PullToRefresh';

export const dynamic = 'force-dynamic';

export default function MMMPcpLookupPage() {
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null as any; // safeguard
    return getBrowserClient();
  }, []);

  const [pcpName, setPcpName] = useState('');
  const [results, setResults] = useState<{ name: string; medical_group: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortByGroup, setSortByGroup] = useState(false);
  const [groupColors, setGroupColors] = useState<Record<string, string>>({});

  const runLookup = useCallback(async (name: string) => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('mmm_medical_groups')
      .select('name, medical_group')
      .ilike('name', `%${name}%`)
      .order('name', { ascending: true });
    if (!error) setResults(data || []);
    setLoading(false);
  }, [supabase]);

  const debouncedLookup = useMemo(() => debounce(runLookup, 300), [runLookup]);

  useEffect(() => {
    debouncedLookup('');
    return () => { debouncedLookup.cancel(); };
  }, [debouncedLookup]);

  usePageRefresh(async () => { await runLookup(pcpName); });

  useEffect(() => {
    if (results.length === 0) return;
    const palette = [
      'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
      'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
      'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
      'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
      'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200',
      'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
      'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
    ];
    const unique = Array.from(new Set(results.map(r => r.medical_group))).sort((a,b)=>a.localeCompare(b));
    const mapping: Record<string,string> = {};
    unique.forEach((g, idx) => { mapping[g] = palette[idx % palette.length]; });
    setGroupColors(mapping);
  }, [results]);

  const sorted = [...results].sort((a, b) => {
    const key = sortByGroup ? 'medical_group' : 'name';
    return a[key].localeCompare(b[key]);
  });

  return (
    <>
      <Header />
      <section className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-semibold mb-6 tracking-tight">MMM PCP Medical Group Lookup</h1>
        <div className="flex flex-col md:flex-row gap-3 mb-4 items-start md:items-center">
          <input
            type="text"
            placeholder="Enter PCP Name"
            value={pcpName}
            onChange={(e) => {
              setPcpName(e.target.value);
              debouncedLookup(e.target.value);
            }}
            className="w-full md:w-72 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 outline-none rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800/70 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
          />
          {results.length > 0 && (
            <div className="inline-flex items-center gap-2 text-sm">
              <label className="text-gray-600 dark:text-gray-300">Sort:</label>
              <select
                value={sortByGroup ? 'group' : 'name'}
                onChange={(e) => setSortByGroup(e.target.value === 'group')}
                className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/70 rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-blue-500 outline-none text-gray-800 dark:text-gray-100"
              >
                <option value="name">By Physician</option>
                <option value="group">By Group</option>
              </select>
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 ml-0 md:ml-auto">{results.length} result{results.length === 1 ? '' : 's'}</p>
        </div>

        {loading && (
          <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">Looking up...</p>
        )}

        {!loading && results.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((r, idx) => (
              <div
                key={idx}
                className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/50 backdrop-blur supports-[backdrop-filter]:bg-gray-900/40 p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-400/70 dark:hover:border-blue-500/60"
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100 tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {r.name}
                  </span>
                  <span className={`ml-2 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${groupColors[r.medical_group] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'} ring-black/0`}>
                    {r.medical_group}
                  </span>
                </div>
                <div className="mt-2 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  PCP #{idx + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && pcpName && (
          <p className="text-sm text-gray-600 dark:text-gray-400">No matching provider found.</p>
        )}
      </section>
    </>
  );
}