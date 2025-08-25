'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Header from '@/components/Header';

type MedicalGroupEntry = {
  id: number;
  name: string;
  medical_group: string;
};

export default function MMMGroupsTab() {
  const [groups, setGroups] = useState<MedicalGroupEntry[]>([]);
  const [newProvider, setNewProvider] = useState({ name: '', medical_group: '' });
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('mmm_medical_groups').select('*');
    if (error) toast.error('Error fetching groups');
    else setGroups(data as MedicalGroupEntry[]);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newProvider.name || !newProvider.medical_group) return toast.warning('Fill all fields');
    const { error } = await supabase.from('mmm_medical_groups').insert([newProvider]);
    if (error) toast.error('Error adding provider');
    else {
      toast.success('Provider added');
      setNewProvider({ name: '', medical_group: '' });
      fetchGroups();
    }
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from('mmm_medical_groups').delete().eq('id', id);
    if (error) toast.error('Error deleting provider');
    else {
      toast.success('Provider deleted');
      fetchGroups();
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  return (
    <>
      <Header />
      <div className="p-4">
        <h1 className="text-2xl font-semibold mb-4">MMM Medical Groups</h1>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Provider Name"
            value={newProvider.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewProvider({ ...newProvider, name: e.target.value })
            }
          />
          <Input
            placeholder="Medical Group"
            value={newProvider.medical_group}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewProvider({ ...newProvider, medical_group: e.target.value })
            }
          />
          <Button onClick={handleAdd}>Add</Button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center border rounded-lg p-4 bg-white shadow-sm"
              >
                <div>
                  <p className="text-base font-medium text-gray-900">{item.name}</p>
                  <p className="text-lg font-bold text-gray-700">{item.medical_group}</p>
                </div>
                <Button
                    className="bg-[#fbe9e9] hover:bg-[#f5dede] text-[#991b1b] font-semibold border border-[#f2cfcf]"
                    onClick={() => handleDelete(item.id)}
                >
                    Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}