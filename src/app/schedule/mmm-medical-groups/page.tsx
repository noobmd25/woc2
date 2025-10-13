"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import Header from "@/components/Header";
import { usePageRefresh } from "@/components/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBrowserClient } from "@/lib/supabase/client";

const supabase = getBrowserClient();

type MedicalGroupEntry = {
  id: number;
  name: string;
  medical_group: string;
};

export default function MMMGroupsTab() {
  const [groups, setGroups] = useState<MedicalGroupEntry[]>([]);
  const [newProvider, setNewProvider] = useState({
    name: "",
    medical_group: "",
  });
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mmm_medical_groups")
      .select("*");
    if (error) toast.error("Error fetching groups");
    else setGroups(data as MedicalGroupEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const loadGroups = async () => {
      await fetchGroups();
    };
    loadGroups();
  }, [fetchGroups]);

  usePageRefresh(null); // full reload on pull-to-refresh

  const handleAdd = async () => {
    if (!newProvider.name || !newProvider.medical_group)
      return toast.warning("Fill all fields");
    const { error } = await supabase
      .from("mmm_medical_groups")
      .insert([newProvider]);
    if (error) toast.error("Error adding provider");
    else {
      toast.success("Provider added");
      setNewProvider({ name: "", medical_group: "" });
      fetchGroups();
    }
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase
      .from("mmm_medical_groups")
      .delete()
      .eq("id", id);
    if (error) toast.error("Error deleting provider");
    else {
      toast.success("Provider deleted");
      fetchGroups();
    }
  };

  return (
    <>
      <Header />
      <section className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-semibold mb-6 tracking-tight">
          MMM Medical Groups
        </h1>
        <div className="mb-6 flex flex-col md:flex-row gap-3 items-start md:items-end bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-4 backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:supports-[backdrop-filter]:bg-gray-900/30 shadow-sm">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-300 tracking-wide uppercase">
              Provider Name
            </label>
            <Input
              placeholder="Provider Name"
              value={newProvider.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewProvider({ ...newProvider, name: e.target.value })
              }
              className="bg-white dark:bg-gray-800/70 border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <div className="md:w-60 w-full">
            <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-300 tracking-wide uppercase">
              Medical Group
            </label>
            <Input
              placeholder="Medical Group"
              value={newProvider.medical_group}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewProvider({
                  ...newProvider,
                  medical_group: e.target.value,
                })
              }
              className="bg-white dark:bg-gray-800/70 border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <Button
            onClick={handleAdd}
            className="h-10 mt-1 md:mt-0 bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
          >
            Add
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
            Loading...
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((item) => (
              <div
                key={item.id}
                className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/50 backdrop-blur supports-[backdrop-filter]:bg-gray-900/40 p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-400/70 dark:hover:border-blue-500/60 flex flex-col"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100 tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">
                    {item.name}
                  </p>
                  <span className="inline-flex items-center rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ring-blue-200/60 dark:ring-blue-700/40 mb-1">
                    {item.medical_group}
                  </span>
                  <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Entry ID: {item.id}
                  </div>
                </div>
                <Button
                  className="mt-4 self-start text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                  onClick={() => handleDelete(item.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}

        {!loading && groups.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            No providers yet.
          </p>
        )}
      </section>
    </>
  );
}
