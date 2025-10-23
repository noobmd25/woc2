"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getBrowserClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

type VitalGroup = {
  id: number;
  vital_group_name: string;
  group_code: string;
};

export default function VitalGroupsLookupPage() {
  const [groups, setGroups] = useState<VitalGroup[]>([]);
  const [search, setSearch] = useState("");

  const supabase = useMemo(() => {
    if (typeof window === "undefined") return null as any;
    return getBrowserClient();
  }, []);

  const fetchGroups = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("vital_medical_groups")
      .select("*");
    if (!error && data) setGroups(data);
  }, [supabase]);

  useEffect(() => {
    const loadGroups = async () => {
      await fetchGroups();
    };
    loadGroups();
  }, [fetchGroups]);

  const filtered = groups.filter(
    (g) =>
      g.vital_group_name.toLowerCase().includes(search.toLowerCase()) ||
      g.group_code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6 tracking-tight">
        Vital Medical Group Lookup
      </h1>
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input
          type="text"
          placeholder="Search by name or group code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800/70 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:border-blue-500 focus:ring-blue-500 outline-none shadow-sm"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((group) => (
          <div
            key={group.id}
            className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/50 backdrop-blur supports-[backdrop-filter]:bg-gray-900/40 p-4 shadow-sm hover:shadow-md transition-shadow hover:border-blue-400/70 dark:hover:border-blue-500/60"
          >
            <div className="flex items-start justify-between mb-1">
              <span className="font-medium text-gray-900 dark:text-gray-100 tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {group.vital_group_name}
              </span>
              <span className="ml-2 inline-flex items-center rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ring-blue-200/60 dark:ring-blue-700/40">
                {group.group_code}
              </span>
            </div>
            <div className="mt-2 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Group ID: {group.id}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No groups found.
        </p>
      )}
    </section>
  );
}
