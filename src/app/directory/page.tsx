'use client';

import { useEffect, useState, useCallback } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { FaSortUp, FaSortDown } from 'react-icons/fa';
import useUserRole from '@/app/hooks/useUserRole';
import { usePageRefresh } from '@/components/PullToRefresh';

interface Provider {
  id: string;
  provider_name: string;
  specialty: string;
  phone_number: string;
}

interface Specialty {
  id: string;
  name: string | null;
}

export default function DirectoryPage() {
  const supabase = getBrowserClient();
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
  const [newSpecName, setNewSpecName] = useState('');
  const [editingSpecId, setEditingSpecId] = useState<string | null>(null);
  const [specEditName, setSpecEditName] = useState('');

  // Phone action sheet state
  const [phoneActionsOpen, setPhoneActionsOpen] = useState(false);
  const [phoneTarget, setPhoneTarget] = useState<{ name: string; phone: string } | null>(null);
  const [closingSheet, setClosingSheet] = useState(false);

  const cleanPhone = (s: string) => s.replace(/[^\d+]/g, "");

  /**
   * Build a WhatsApp-friendly number (digits only, with country code).
   * If the number has 10 digits, assume US/PR (+1). If it already has a leading +, keep its digits.
   */
  const toWhatsAppNumber = (raw: string) => {
    const cleaned = cleanPhone(raw);
    const digits = cleaned.startsWith("+") ? cleaned.slice(1).replace(/\D/g, "") : cleaned.replace(/\D/g, "");
    if (digits.length === 10) return `1${digits}`; // assume +1
    return digits; // already includes country code or longer
  };

  const openPhoneActions = (provider: Provider) => {
    setPhoneTarget({ name: provider.provider_name, phone: provider.phone_number });
    setClosingSheet(false); // ensure we reset exit animation state when opening
    setPhoneActionsOpen(true);
  };

  // Gracefully close the phone action sheet with exit animation
  const closePhoneSheet = useCallback(() => {
    if (!phoneActionsOpen) return; // nothing to do
    if (closingSheet) return; // already animating out
    setClosingSheet(true);
    // Match the sheet-slide-down / overlay-fade-out duration (approx 240-260ms)
    const timeout = setTimeout(() => {
      setPhoneActionsOpen(false);
      setPhoneTarget(null);
      setClosingSheet(false); // reset for next open
    }, 260);
    return () => clearTimeout(timeout);
  }, [phoneActionsOpen, closingSheet]);

  const role = useUserRole();

  const fetchProviders = useCallback(async () => {
    const { data } = await supabase.from('directory').select('*');
    if (data) setProviders(data);
  }, [supabase]);

  const fetchSpecialties = useCallback(async () => {
    const { data } = await supabase
      .from('specialties')
      .select('id, name')
      .order('name');
    setAllSpecialties(data || []);
  }, [supabase]);

  useEffect(() => {
    fetchProviders();
    fetchSpecialties();
  }, [fetchProviders, fetchSpecialties]);

  usePageRefresh(null); // full reload on pull-to-refresh

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
    ? allSpecialties.map(s => s.name).filter((n): n is string => !!n)
    : Array.from(new Set(providers.map(p => p.specialty).filter(Boolean)))
  ).sort();

  const handleEditOpen = (p: Provider) => {
    setEditingProvider(p);
    setEditName(p.provider_name || '');
    setEditSpecialty(p.specialty || '');
    setEditPhone(p.phone_number || '');
    setEditOpen(true);
  };

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleUpdateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (role !== 'admin') return;
    if (!editingProvider) return;
    setSaving(true);
    const { error, data } = await supabase
      .from('directory')
      .update({
        provider_name: editName.trim(),
        specialty: editSpecialty.trim(),
        phone_number: editPhone.trim() || null,
      })
      .eq('id', editingProvider.id)
      .select('*')
      .maybeSingle();
    setSaving(false);
    if (error) {
      console.error('Update provider failed', error);
      setFormError('Failed to update provider.');
      return;
    }
    setEditOpen(false);
    setEditingProvider(null);
    setEditName('');
    setEditSpecialty('');
    setEditPhone('');
    // Optimistic update
    if (data) {
      setProviders(prev => prev.map(p => p.id === data.id ? (data as Provider) : p));
    } else {
      const { data: updated } = await supabase.from('directory').select('*');
      setProviders(updated || []);
    }
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (role !== 'admin') return;
    if (!newName.trim() || !newSpecialty.trim()) {
      setFormError('Name and Specialty are required.');
      return;
    }
    setSaving(true);
    const { error, data } = await supabase
      .from('directory')
      .insert({
        provider_name: newName.trim(),
        specialty: newSpecialty.trim(),
        phone_number: newPhone.trim() || null,
      })
      .select('*')
      .maybeSingle();
    setSaving(false);
    if (error) {
      console.error('Add provider failed (directory insert)', error);
      // Common RLS / permission hint
      if (error.message?.toLowerCase().includes('row-level security') || error.code === '42501') {
        setFormError('Permission denied (RLS). Ensure your profile role=admin & status=approved and RLS policy allows insert.');
      } else {
        setFormError(error.message || 'Failed to add provider.');
      }
      return;
    }
    setNewName('');
    setNewSpecialty('');
    setNewPhone('');
    setModalOpen(false);
    if (data) {
      setProviders(prev => [...prev, data as Provider]);
    } else {
      const { data: updated } = await supabase.from('directory').select('*');
      setProviders(updated || []);
    }
  };

  const handleAddSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'admin') return;
    const name = newSpecName.trim();
    if (!name) return;
    const { error } = await supabase
      .from('specialties')
      .insert({ name });
    if (error) {
      return;
    }
    setNewSpecName('');
    await fetchSpecialties();
  };

  const handleStartEditSpecialty = (spec: Specialty) => {
    if (role !== 'admin') return;
    setEditingSpecId(spec.id);
    setSpecEditName(spec.name ?? '');
  };

  const handleCancelEditSpecialty = () => {
    setEditingSpecId(null);
    setSpecEditName('');
  };

  const handleSaveSpecialty = async (spec: Specialty) => {
    if (role !== 'admin') return;
    const newName = specEditName.trim();
    if (!newName || newName === spec.name) { setEditingSpecId(null); return; }

    const { error: err1 } = await supabase
      .from('specialties')
      .update({ name: newName })
      .eq('id', spec.id);
    if (err1) { setEditingSpecId(null); return; }

    const { error: err2 } = await supabase
      .from('directory')
      .update({ specialty: newName })
      .eq('specialty', spec.name);
    if (err2) { /* ignore */ }

    setEditingSpecId(null);
    setSpecEditName('');
    await fetchSpecialties();
    const { data: updatedProviders } = await supabase.from('directory').select('*');
    setProviders(updatedProviders || []);
  };

  const handleDeleteSpecialty = async (spec: Specialty) => {
    if (role !== 'admin') return;

    const { error: err1 } = await supabase
      .from('directory')
      .update({ specialty: '' })
      .eq('specialty', spec.name);
    if (err1) { return; }

    const { error: err2 } = await supabase
      .from('specialties')
      .delete()
      .eq('id', spec.id);
    if (err2) { return; }

    await fetchSpecialties();
    const { data: updatedProviders } = await supabase.from('directory').select('*');
    setProviders(updatedProviders || []);
  };

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
      return;
    }
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
      <main className="relative max-w-4xl mx-auto px-4 py-6">
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
              onClick={() => setModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transition"
            >
              ➕ Add Provider
            </button>
          )}
          {role === 'admin' && (
            <button
              onClick={() => setManageSpecsOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transition"
            >
              ⚙️ Manage Directory
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
                  <button
                    type="button"
                    onClick={() => openPhoneActions(provider)}
                    className="text-blue-600 hover:underline"
                    title="Contact options"
                    aria-label={`Contact ${provider.provider_name}`}
                  >
                    {provider.phone_number}
                  </button>
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

      {role === 'admin' && modalOpen && (
        <div
          className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 modal-overlay-in"
          onClick={() => { if(!saving){ setModalOpen(false); setFormError(null);} }}
          role="dialog"
          aria-modal="true"
          aria-label="Add Provider"
        >
          <div
            className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-md shadow-xl z-[1001] modal-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Add New Provider</h2>
            <form onSubmit={handleAddProvider} className="space-y-4">
              {formError && <p className="text-sm text-red-600" role="alert">{formError}</p>}
              <input
                type="text"
                placeholder="Provider Name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded"
              />
              <div>
                <input
                  list="specialty-options"
                  placeholder="Specialty"
                  value={newSpecialty}
                  onChange={e => setNewSpecialty(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded"
                />
                <datalist id="specialty-options">
                  {specialties.map(spec => (
                    <option key={spec} value={spec} />
                  ))}
                </datalist>
              </div>
              <input
                type="tel"
                placeholder="Phone Number"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
              <div className="flex justify-end gap-4">
                <button type="button" onClick={() => { if(!saving){ setModalOpen(false); setFormError(null);} }} className="px-4 py-2 bg-gray-300 rounded">
                  Cancel
                </button>
                <button disabled={saving} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {role === 'admin' && editOpen && (
        <div
          className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 modal-overlay-in"
          onClick={() => { if(!saving){ setEditOpen(false); setEditingProvider(null); setFormError(null);} }}
          role="dialog"
          aria-modal="true"
          aria-label="Edit Provider"
        >
          <div
            className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-md shadow-xl modal-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Edit Provider</h2>
            <form onSubmit={handleUpdateProvider} className="space-y-4">
              {formError && <p className="text-sm text-red-600" role="alert">{formError}</p>}
              <input
                type="text"
                placeholder="Provider Name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded"
              />
              <div>
                <input
                  list="edit-specialty-options"
                  placeholder="Specialty"
                  value={editSpecialty}
                  onChange={e => setEditSpecialty(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded"
                />
                <datalist id="edit-specialty-options">
                  {specialties.map(spec => (
                    <option key={spec} value={spec} />
                  ))}
                </datalist>
              </div>
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
                  onClick={() => { if(!saving){ setEditOpen(false); setEditingProvider(null); setFormError(null);} }}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <div className="ml-auto flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {role === 'admin' && manageSpecsOpen && (
        <div
          className="fixed inset-0 z-[1200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 modal-overlay-in"
          onClick={() => setManageSpecsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Manage Directory"
        >
          <div
            className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-2xl shadow-xl modal-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Manage Directory</h2>
              <div className="flex items-center gap-2">
                {/* Add Provider button for admin only */}
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
            {/* Admin: Add Specialty */}
            <form onSubmit={handleAddSpecialty} className="flex items-center gap-2 mb-3">
              <input
                value={newSpecName}
                onChange={(e) => setNewSpecName(e.target.value)}
                placeholder="New specialty name"
                className="flex-1 px-3 py-2 border rounded"
              />
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded">
                Add Specialty
              </button>
            </form>
            {/* Admin: Edit/Delete Specialties */}
            <div className="mb-4 border rounded p-3">
              <h3 className="font-semibold mb-2">Specialties</h3>
              <ul className="space-y-2 max-h-60 overflow-auto">
                {allSpecialties.length === 0 && (
                  <li className="text-sm text-gray-500">No specialties yet.</li>
                )}
                {allSpecialties.map((spec) => (
                  <li key={spec.id} className="flex items-center gap-2">
                    {editingSpecId === spec.id ? (
                      <>
                        <input
                          value={specEditName}
                          onChange={(e) => setSpecEditName(e.target.value)}
                          className="flex-1 px-3 py-1 border rounded"
                          placeholder="Specialty name"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveSpecialty(spec)}
                          className="px-3 py-1 bg-blue-600 text-white rounded"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditSpecialty}
                          className="px-3 py-1 border rounded"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1">{spec.name}</span>
                        <button
                          type="button"
                          onClick={() => handleStartEditSpecialty(spec)}
                          className="px-3 py-1 border rounded"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSpecialty(spec)}
                          className="px-3 py-1 border rounded text-red-600"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
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
      {phoneActionsOpen && phoneTarget && (
        <div
          className={`fixed inset-0 z-[1300] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center ${closingSheet ? 'overlay-fade-out' : 'modal-overlay-in'}`}
          onClick={closePhoneSheet}
          role="dialog"
          aria-modal="true"
          aria-label="Contact Options"
        >
          <div
            className={`bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl ${closingSheet ? 'sheet-slide-down' : 'sheet-slide-up'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-3 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold">{phoneTarget.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{phoneTarget.phone}</p>
            </div>
            <div className="flex flex-col divide-y dark:divide-gray-700">
              <a
                href={`sms:${cleanPhone(phoneTarget.phone)}`}
                className="px-6 py-4 text-center text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Send Text Message
              </a>
              <a
                href={`tel:${cleanPhone(phoneTarget.phone)}`}
                className="px-6 py-4 text-center text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Call
              </a>
              <a
                href={`https://wa.me/${toWhatsAppNumber(phoneTarget.phone)}?text=${encodeURIComponent('Hello')}`}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-4 text-center text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                WhatsApp
              </a>
            </div>
            <button
              type="button"
              onClick={closePhoneSheet}
              className="w-full px-6 py-4 text-center hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}