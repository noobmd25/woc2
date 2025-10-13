"use client";
import Header from "@/components/Header";
import { useCallback, useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { usePageRefresh } from "@/components/PullToRefresh";
import toast from "react-hot-toast";
const supabase = getBrowserClient();

type VitalGroup = {
  id: number;
  vital_group_name: string;
  group_code: string;
};

export default function VitalMedicalGroupsEditor() {
  const [groups, setGroups] = useState<VitalGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCode, setNewGroupCode] = useState("");

  const fetchGroups = useCallback(async () => {
    const { data, error } = await supabase
      .from("vital_medical_groups")
      .select("*")
      .order("vital_group_name", { ascending: true });

    if (error) {
      toast.error("Error fetching groups");
      console.error(error);
    } else {
      setGroups(data);
    }
  }, []);

  useEffect(() => {
    const loadGroups = async () => {
      await fetchGroups();
    };
    loadGroups();
  }, [fetchGroups]);

  usePageRefresh(null); // full reload on pull-to-refresh

  const addGroup = async () => {
    if (!newGroupName.trim() || !newGroupCode.trim()) return;

    const { error } = await supabase.from("vital_medical_groups").insert({
      group_code: newGroupCode.trim(),
      vital_group_name: newGroupName.trim(),
    });

    if (error) {
      toast.error("Failed to add group");
      console.error(error);
    } else {
      toast.success("Group added");
      setNewGroupName("");
      setNewGroupCode("");
      fetchGroups();
    }
  };

  const deleteGroup = async (id: number) => {
    const { error } = await supabase
      .from("vital_medical_groups")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Deleted");
      fetchGroups();
    }
  };

  return (
    <>
      <Header />
      <section className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-semibold mb-6 tracking-tight">
          Vital Medical Group Editor
        </h1>
        <div className="mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-end bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-4 backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:supports-[backdrop-filter]:bg-gray-900/30 shadow-sm">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-300 tracking-wide uppercase">
              Group Name
            </label>
            <input
              type="text"
              placeholder="Group Name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/70 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 outline-none shadow-sm"
            />
          </div>
          <div className="sm:w-48 w-full">
            <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-300 tracking-wide uppercase">
              Code
            </label>
            <input
              type="text"
              placeholder="Group Code"
              value={newGroupCode}
              onChange={(e) => setNewGroupCode(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/70 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 outline-none shadow-sm"
            />
          </div>
          <button
            onClick={addGroup}
            className="h-10 px-5 mt-1 sm:mt-0 inline-flex items-center justify-center rounded-md bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-900 disabled:opacity-60"
          >
            Add
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div
              key={g.id}
              className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/50 backdrop-blur supports-[backdrop-filter]:bg-gray-900/40 p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-400/70 dark:hover:border-blue-500/60 flex flex-col"
            >
              <div className="flex-1">
                <h2 className="font-medium text-gray-900 dark:text-gray-100 tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">
                  {g.vital_group_name}
                </h2>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  Code:
                  <span className="inline-flex items-center rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ring-blue-200/60 dark:ring-blue-700/40">
                    {g.group_code}
                  </span>
                </div>
              </div>
              <button
                onClick={() => deleteGroup(g.id)}
                className="mt-4 self-start text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {groups.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            No groups yet.
          </p>
        )}
      </section>
    </>
  );
}
