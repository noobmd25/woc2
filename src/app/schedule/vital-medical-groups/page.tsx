

 "use client";
import Header from '@/components/Header';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

type VitalGroup = {
  id: number;
  vital_group_name: string;
  group_code: string;
};

export default function VitalMedicalGroupsEditor() {
  const [groups, setGroups] = useState<VitalGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCode, setNewGroupCode] = useState('');

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from('vital_medical_groups')
      .select('*')
      .order('vital_group_name', { ascending: true });

    if (error) {
      toast.error('Error fetching groups');
      console.error(error);
    } else {
      setGroups(data);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const addGroup = async () => {
    if (!newGroupName.trim() || !newGroupCode.trim()) return;

    const { error } = await supabase.from('vital_medical_groups').insert({
      group_code: newGroupCode.trim(),
      vital_group_name: newGroupName.trim(),
    });

    if (error) {
      toast.error('Failed to add group');
      console.error(error);
    } else {
      toast.success('Group added');
      setNewGroupName('');
      setNewGroupCode('');
      fetchGroups();
    }
  };

  const deleteGroup = async (id: number) => {
    const { error } = await supabase
      .from('vital_medical_groups')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Deleted');
      fetchGroups();
    }
  };

  return (
    <>
      <Header />
      <div className="max-w-xl mx-auto p-4">
        <h1 className="text-xl font-bold mb-4">Vital Medical Group Editor</h1>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Group Name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="flex-1 border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Group Code"
            value={newGroupCode}
            onChange={(e) => setNewGroupCode(e.target.value)}
            className="w-40 border p-2 rounded"
          />
          <button
            onClick={addGroup}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add
          </button>
        </div>

        <ul className="space-y-2">
          {groups.map((g) => (
            <li
              key={g.id}
              className="flex justify-between items-center bg-white border p-3 rounded shadow-sm"
            >
              <div>
                <p className="font-semibold">{g.vital_group_name}</p>
                <p className="text-xs text-gray-700">Code: <span className="font-extrabold text-black">{g.group_code}</span></p>
              </div>
              <button
                onClick={() => deleteGroup(g.id)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}