'use client';

import { useState, useEffect } from 'react';
import debounce from 'lodash/debounce';
import { supabase } from '@/lib/supabaseClient';
import { useAccessGate } from '@/lib/useAccessGate';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function MMMPcpLookupPage() {
  useAccessGate();

  const [pcpName, setPcpName] = useState('');
  const [results, setResults] = useState<{ name: string; medical_group: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortByGroup, setSortByGroup] = useState(false);

  const debouncedLookup = debounce(async (name: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mmm_medical_groups')
      .select('name, medical_group')
      .ilike('name', `%${name}%`);

    if (!error) setResults(data || []);
    setLoading(false);
  }, 300);

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
                      <td className="p-2 font-semibold">{r.medical_group}</td>
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