'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FaSortUp, FaSortDown } from 'react-icons/fa';
import useUserRole from '@/app/hooks/useUserRole';

interface Provider {
  id: string;
  provider_name: string;
  specialty: string;
  phone_number: string;
}

interface Specialty {
  id: string;
  name: string;
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
  const [editOpen, setEditOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [editName, setEditName] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [allSpecialties, setAllSpecialties] = useState<Specialty[]>([]);
  const [manageSpecsOpen, setManageSpecsOpen] = useState(false);
  // Directory management modal edit states
  const [editingDirectoryId, setEditingDirectoryId] = useState<string | null>(null);
  const [dirEditName, setDirEditName] = useState('');
  const [dirEditSpecialty, setDirEditSpecialty] = useState('');
  const [dirEditPhone, setDirEditPhone] = useState('');
  const role = useUserRole();

  const fetchSpecialties = async () => {
    const { data, error } = await supabase
      .from('specialties')
      .select('id, name')
      .order('name');
    if (error) {
      console.error('Error fetching specialties table:', error);
      return;
    }
    setAllSpecialties(data || []);
  };

  useEffect(() => {
    const fetchProviders = async () => {
      const { data, error } = await supabase.from('directory').select('*');
      if (error) console.error("Supabase fetch error:", error);
      if (data) setProviders(data);
    };
    fetchProviders();
    fetchSpecialties();
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

  const specialties = (allSpecialties.length > 0
    ? allSpecialties.map(s => s.name)
    : Array.from(new Set(providers.map(p => p.specialty).filter(Boolean)))
  ).sort();

  const handleEditOpen = (p: Provider) => {
    setEditingProvider(p);
    setEditName(p.provider_name || '');
    setEditSpecialty(p.specialty || '');
    setEditPhone(p.phone_number || '');
    setEditOpen(true);
  };

  const handleUpdateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'admin') return;
    if (!editingProvider) return;
    const { error } = await supabase
      .from('directory')
      .update({
        provider_name: editName,
        specialty: editSpecialty,
        phone_number: editPhone,
      })
      .eq('id', editingProvider.id);
    if (error) {
      console.error('Error updating provider:', error);
      return;
    }
    setEditOpen(false);
    setEditingProvider(null);
    setEditName('');
    setEditSpecialty('');
    setEditPhone('');
    const { data: updated } = await supabase.from('directory').select('*');
    setProviders(updated || []);
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'admin' && role !== 'scheduler') return;
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

  // Directory management handlers
  const handleDirectoryEdit = (provider: Provider) => {
    setEditingDirectoryId(provider.id);
    setDirEditName(provider.provider_name);
    setDirEditSpecialty(provider.specialty);
    setDirEditPhone(provider.phone_number);
  };

  const handleDirectorySave = async (providerId: string) => {
    if (role !== 'admin') return;
    const { error } = await supabase
      .from('directory')
      .update({
        provider_name: dirEditName,
        specialty: dirEditSpecialty,
        phone_number: dirEditPhone,
      })
      .eq('id', providerId);
    if (error) {
      console.error('Error updating provider:', error);
      return;
    }
    setEditingDirectoryId(null);
    setDirEditName('');
    setDirEditSpecialty('');
    setDirEditPhone('');
    const { data: updated } = await supabase.from('directory').select('*');
    setProviders(updated || []);
  };

  const handleDirectoryCancel = () => {
    setEditingDirectoryId(null);
    setDirEditName('');
    setDirEditSpecialty('');
    setDirEditPhone('');
  };

  const handleDirectoryDelete = async (providerId: string) => {
    if (role !== 'admin') return;
    const { error } = await supabase
      .from('directory')
      .delete()
      .eq('id', providerId);
    if (error) {
      console.error('Error deleting provider:', error);
      return;
    }
    // Refresh providers list
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
          {role === 'admin' && (
            <button
              onClick={() => setManageSpecsOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transition"
            >
              ⚙️ Manage Specialties
            </button>
          )}
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
              <tr key={provider.id} className="border-b hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white">
                <td className="p-2">
                  <div className="group inline-flex items-center gap-2">
                    <span>{provider.provider_name}</span>
                    {role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleEditOpen(provider)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                        aria-label={`Edit ${provider.provider_name}`}
                        title="Edit"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </td>
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

      {(role === 'admin' || role === 'scheduler') && modalOpen && (
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
              <select
                value={newSpecialty}
                onChange={e => setNewSpecialty(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded"
              >
                <option value="">Select Specialty</option>
                {specialties.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
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

      {role === 'admin' && editOpen && (
        <div className="fixed inset-0 z-[1100] bg-black/70 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Edit Provider</h2>
            <form onSubmit={handleUpdateProvider} className="space-y-4">
              <input
                type="text"
                placeholder="Provider Name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded"
              />
              <select
                value={editSpecialty}
                onChange={e => setEditSpecialty(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded"
              >
                {Array.from(new Set([editSpecialty, ...specialties].filter(Boolean))).map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
              <input
                type="tel"
                placeholder="Phone Number"
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
              <div className="flex justify-between gap-4">
                <button
                  type="button"
                  onClick={() => { setEditOpen(false); setEditingProvider(null); }}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <div className="ml-auto flex gap-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {role === 'admin' && manageSpecsOpen && (
        <div className="fixed inset-0 z-[1200] bg-black/70 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Manage Directory</h2>
              <div className="flex items-center gap-2">
                {/* Add Provider button for admin, styled like original */}
                {role === 'admin' && (
                  <button
                    onClick={() => { setModalOpen(true); setManageSpecsOpen(false); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transition"
                  >
                    ➕ Add Provider
                  </button>
                )}
                <button onClick={() => setManageSpecsOpen(false)} className="px-3 py-1 rounded border">Close</button>
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-auto">
              {providers.length === 0 && (
                <p className="text-sm text-gray-500">No providers in directory.</p>
              )}
              {providers.map((provider) => (
                <div key={provider.id} className="flex items-center gap-2 border rounded p-2">
                  {editingDirectoryId === provider.id ? (
                    <>
                      <input
                        value={dirEditName}
                        onChange={e => setDirEditName(e.target.value)}
                        className="flex-1 px-3 py-1 border rounded"
                        placeholder="Provider Name"
                      />
                      <input
                        value={dirEditSpecialty}
                        onChange={e => setDirEditSpecialty(e.target.value)}
                        className="flex-1 px-3 py-1 border rounded"
                        placeholder="Specialty"
                      />
                      <input
                        value={dirEditPhone}
                        onChange={e => setDirEditPhone(e.target.value)}
                        className="flex-1 px-3 py-1 border rounded"
                        placeholder="Phone Number"
                      />
                      <button
                        type="button"
                        onClick={() => handleDirectorySave(provider.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleDirectoryCancel}
                        className="px-3 py-1 border rounded"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{provider.provider_name}</span>
                      <span className="flex-1">{provider.specialty}</span>
                      <span className="flex-1">{provider.phone_number}</span>
                      <button
                        type="button"
                        onClick={() => handleDirectoryEdit(provider)}
                        className="px-3 py-1 border rounded"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDirectoryDelete(provider.id)}
                        className="px-3 py-1 border rounded text-red-600"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}