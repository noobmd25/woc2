'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FaSortUp, FaSortDown } from 'react-icons/fa';

interface Provider {
  id: string;
  provider_name: string;
  specialty: string;
  phone_number: string;
}

export default function DirectoryPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [filtered, setFiltered] = useState<Provider[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [sortKey, setSortKey] = useState<'provider_name' | 'specialty' | 'phone_number' | ''>('');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const fetchProviders = async () => {
      const { data, error } = await supabase.from('directory').select('*');
      if (error) console.error("Supabase fetch error:", error);
      if (data) setProviders(data);
    };
    fetchProviders();
  }, []);

  useEffect(() => {
    const lowerSearch = search.toLowerCase();
    setFiltered(
      providers.filter((p) => {
        const matchesSearch =
          (p.provider_name || '').toLowerCase().includes(lowerSearch) ||
          (p.specialty || '').toLowerCase().includes(lowerSearch) ||
          (p.phone_number || '').includes(lowerSearch);
        const matchesSpecialty = !specialtyFilter || p.specialty === specialtyFilter;
        return matchesSearch && matchesSpecialty;
      })
    );
  }, [search, specialtyFilter, providers]);

  const specialties = Array.from(new Set(providers.map(p => p.specialty).filter(Boolean))).sort();

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from('directory').insert({
      provider_name: newName,
      specialty: newSpecialty,
      phone_number: newPhone,
    });
    if (error) {
      console.error('Error adding provider:', error);
      return;
    }
    setNewName('');
    setNewSpecialty('');
    setNewPhone('');
    setModalOpen(false);
    const { data: updated } = await supabase.from('directory').select('*');
    setProviders(updated || []);
  };

  const sorted = [...filtered].sort((a, b) => {
    const key = sortKey as keyof Provider;
    if (!key) return 0;
    const aVal = (a[key] || '').toString().toLowerCase();
    const bVal = (b[key] || '').toString().toLowerCase();
    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  return (
    <>
      <main className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Provider Directory</h1>
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border rounded shadow-sm"
          />
          <select
            value={specialtyFilter}
            onChange={e => setSpecialtyFilter(e.target.value)}
            className="px-4 py-2 border rounded shadow-sm"
          >
            <option value="">All Specialties</option>
            {specialties.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transition"
          >
            ➕ Add Provider
          </button>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">
                <button
                  onClick={() => {
                    setSortKey('provider_name');
                    setSortAsc(sortKey === 'provider_name' ? !sortAsc : true);
                  }}
                  className="hover:underline flex items-center gap-1"
                >
                  Name
                  {sortKey === 'provider_name' && (
                    <span className="transition-transform duration-200">
                      {sortAsc ? <FaSortUp className="text-xs" /> : <FaSortDown className="text-xs" />}
                    </span>
                  )}
                </button>
              </th>
              <th className="text-left p-2">
                <button
                  onClick={() => {
                    setSortKey('specialty');
                    setSortAsc(sortKey === 'specialty' ? !sortAsc : true);
                  }}
                  className="hover:underline flex items-center gap-1"
                >
                  Specialty
                  {sortKey === 'specialty' && (
                    <span className="transition-transform duration-200">
                      {sortAsc ? <FaSortUp className="text-xs" /> : <FaSortDown className="text-xs" />}
                    </span>
                  )}
                </button>
              </th>
              <th className="text-left p-2">
                <button
                  onClick={() => {
                    setSortKey('phone_number');
                    setSortAsc(sortKey === 'phone_number' ? !sortAsc : true);
                  }}
                  className="hover:underline flex items-center gap-1"
                >
                  Phone
                  {sortKey === 'phone_number' && (
                    <span className="transition-transform duration-200">
                      {sortAsc ? <FaSortUp className="text-xs" /> : <FaSortDown className="text-xs" />}
                    </span>
                  )}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((provider) => (
              <tr key={provider.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{provider.provider_name}</td>
                <td className="p-2">{provider.specialty}</td>
                <td className="p-2">
                  <a href={`tel:${provider.phone_number}`} className="text-blue-600 hover:underline">
                    {provider.phone_number}
                  </a>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center p-4 text-gray-500">
                  No matching providers.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black bg-opacity-70 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-md shadow-xl z-[1001]">
            <h2 className="text-xl font-bold mb-4">Add New Provider</h2>
            <form onSubmit={handleAddProvider} className="space-y-4">
              <input
                type="text"
                placeholder="Provider Name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Specialty"
                value={newSpecialty}
                onChange={e => setNewSpecialty(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
              <div className="flex justify-end gap-4">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-gray-300 rounded">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}