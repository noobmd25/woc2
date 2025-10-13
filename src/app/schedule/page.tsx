"use client";

import type { EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";

import useUserRole from "@/app/hooks/useUserRole";
import LayoutShell from "@/components/LayoutShell";
import { resolveDirectorySpecialty } from "@/lib/specialtyMapping";
import { getBrowserClient } from "@/lib/supabase/client";

const supabase = getBrowserClient();

// --- Provider search helpers: rank closest names ---
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

function levenshteinCapped(a: string, b: string, cap = 2): number {
  if (a === b) return 0;
  const la = a.length,
    lb = b.length;
  if (Math.abs(la - lb) > cap) return cap + 1;
  const max = cap + 1;
  const prev = new Array(lb + 1).fill(0).map((_, j) => (j <= cap ? j : max));
  for (let i = 1; i <= la; i++) {
    const curr = new Array(lb + 1).fill(max);
    const jStart = Math.max(1, i - cap);
    const jEnd = Math.min(lb, i + cap);
    curr[jStart - 1] = max;
    curr[jStart] = Math.min(
      prev[jStart] + (a[i - 1] !== b[jStart - 1] ? 1 : 0),
      prev[jStart] + 1,
      curr[jStart - 1] + 1,
    );
    for (let j = jStart + 1; j <= jEnd; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    if (curr.slice(jStart, jEnd + 1).every((v) => v > cap)) return cap + 1;
    for (let j = 0; j <= lb; j++) prev[j] = curr[j] ?? max;
  }
  return prev[lb];
}

function scoreName(name: string, q: string): number {
  const n = normalize(name);
  const query = normalize(q);
  if (!query) return 0;
  if (n === query) return 1_000_000; // exact
  let score = 0;
  if (n.startsWith(query)) score += 500_000; // prefix
  const idx = n.indexOf(query);
  if (idx > 0 && /\W/.test(n[idx - 1] ?? "")) score += 300_000; // word-start
  // subsequence bonus
  let i = 0;
  for (const ch of n) if (ch === query[i]) i++;
  if (i === query.length)
    score += 100_000 - Math.max(0, n.length - query.length);
  const ed = levenshteinCapped(n, query, 2);
  if (ed <= 2) score += 50_000 - 10_000 * ed; // small typos
  score += Math.max(0, 10_000 - n.length); // shorter names slight boost
  return score;
}
// --- end provider search helpers ---

// Helper function to format dates as local ISO (YYYY-MM-DD) in local time
const toLocalISODate = (date: Date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).toLocaleDateString("sv-SE");

// Local date helper to avoid UTC drift when handling YYYY-MM-DD strings
const parseLocalYMD = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m as number) - 1, d as number, 12, 0, 0, 0);
};

// Distinct color helpers and color map state
const getTextColorForBackground = (hex: string) => {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 255;
  const g = (rgb >> 8) & 255;
  const b = rgb & 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 186 ? "black" : "white";
};

const hslToHex = (h: number, s: number, l: number) => {
  // h in [0,360), s,l in [0,1]
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const generateDistinctColors = (count: number) => {
  // Golden-angle hue steps for maximum separation, fixed s/l for contrast
  const colors: string[] = [];
  const golden = 137.508; // degrees
  for (let i = 0; i < count; i++) {
    const h = (i * golden) % 360;
    const s = 0.6; // 60% saturation
    const l = 0.55; // 55% lightness
    colors.push(hslToHex(h, s, l));
  }
  return colors;
};

const plans = [
  "Triple S Advantage/Unattached",
  "Vital",
  "405/M88",
  "PAMG",
  "REMAS",
  "SMA",
  "CSE",
  "In Salud",
  "IPA B",
  "MCS",
];

export default function SchedulePage() {
  // access enforced by server layout & client role redirect
  // Specialties state and modal for admin editing
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyEditList, setSpecialtyEditList] = useState<
    { id: string; name: string; show_oncall: boolean }[]
  >([]);
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);
  const [newSpecName, setNewSpecName] = useState("");
  const [editingSpecId, setEditingSpecId] = useState<string | null>(null);
  const [specEditName, setSpecEditName] = useState("");
  // Load specialties from Supabase, both for display and editing
  const reloadSpecialties = useCallback(async () => {
    const { data, error } = await supabase
      .from("specialties")
      .select("id, name, show_oncall")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching specialties:", error);
      setSpecialties([]);
      setSpecialtyEditList([]);
    } else {
      const activeNames = data
        ?.filter((s) => s.show_oncall)
        .map((s) => s.name ?? "")
        .filter(Boolean) as string[];
      setSpecialties(activeNames);
      setSpecialtyEditList(
        (data ?? []).map((s) => ({
          id: s.id as string,
          name: (s.name ?? "") as string,
          show_oncall: !!s.show_oncall,
        })),
      );
    }
  }, []);

  // Handlers for Specialty Management Modal
  const handleAddSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSpecName.trim();
    if (!name) return;
    const dup = specialtyEditList.some(
      (s) => s.name.toLowerCase() === name.toLowerCase(),
    );
    if (dup) {
      toast.error("Specialty already exists.");
      return;
    }
    const { error } = await supabase
      .from("specialties")
      .insert({ name, show_oncall: true });
    if (error) {
      console.error("Failed to add specialty:", error);
      toast.error("Failed to add specialty.");
    } else {
      toast.success("Specialty added.");
      setNewSpecName("");
      await reloadSpecialties();
    }
  };

  const handleStartEditSpecialty = (id: string, currentName: string) => {
    setEditingSpecId(id);
    setSpecEditName(currentName);
  };

  const handleCancelEditSpecialty = () => {
    setEditingSpecId(null);
    setSpecEditName("");
  };

  const handleSaveSpecialty = async (id: string, oldName: string) => {
    const newName = specEditName.trim();
    if (!newName) {
      toast.error("Name cannot be empty.");
      return;
    }
    const dup = specialtyEditList.some(
      (s) => s.id !== id && s.name.toLowerCase() === newName.toLowerCase(),
    );
    if (dup) {
      toast.error("Another specialty with this name exists.");
      return;
    }
    const { error } = await supabase
      .from("specialties")
      .update({ name: newName })
      .eq("id", id);
    if (error) {
      console.error("Failed to save specialty:", error);
      toast.error("Failed to save.");
    } else {
      toast.success("Specialty updated.");
      setEditingSpecId(null);
      setSpecEditName("");
      if (oldName === specialty) {
        setSpecialty(newName);
      }
      await reloadSpecialties();
    }
  };

  const handleDeleteSpecialty = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Delete specialty "${name}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    const { error } = await supabase.from("specialties").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete specialty:", error);
      toast.error("Failed to delete.");
    } else {
      toast.success("Specialty deleted.");
      // If the currently selected specialty was deleted, move selection to another available one
      if (specialty === name) {
        // Try to switch to another active specialty after reload
        const { data } = await supabase
          .from("specialties")
          .select("name")
          .eq("show_oncall", true)
          .order("name", { ascending: true });
        const nextName = (data ?? [])
          .map((d) => d.name)
          .find((n) => n && n !== name) as string | undefined;
        if (nextName) setSpecialty(nextName);
      }
      await reloadSpecialties();
    }
  };

  useEffect(() => {
    reloadSpecialties();
  }, [reloadSpecialties]);
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [providerColorMap, setProviderColorMap] = useState<
    Record<string, string>
  >({});
  const [visibleRange, setVisibleRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const loadKeyRef = useRef(0);

  useEffect(() => {
    // Derive unique provider names from currently displayed events
    const names = Array.from(
      new Set(
        events
          .map((ev: { title: string; date: string }) =>
            typeof ev.title === "string"
              ? ev.title.replace(/^Dr\. /, "").trim()
              : "",
          )
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
    const colors = generateDistinctColors(names.length);
    const map: Record<string, string> = {};
    names.forEach((name, i) => {
      map[name] = colors[i];
    });
    setProviderColorMap(map);
  }, [events]);

  const [specialty, setSpecialty] = useState("Internal Medicine");
  const [plan, setPlan] = useState("");
  const role = useUserRole(); // 'admin' | 'scheduler' | 'viewer' | null
  const canEdit = role === "admin" || role === "scheduler";
  const isIMWithoutPlan = specialty === "Internal Medicine" && !plan; // NEW: gating flag
  const [isEditing, setIsEditing] = useState(false);
  // Collect pending entries to save to DB only when "Save Changes" is pressed
  const [pendingEntries, setPendingEntries] = useState<any[]>([]);
  const [pendingDeletions, setPendingDeletions] = useState<
    { date: string; provider: string }[]
  >([]);
  // Modal state for clearing the month
  const [showClearModal, setShowClearModal] = useState(false);

  // Clear all entries for the current month for this specialty (and plan, if applicable), with confirmation modal
  const handleClearConfirmed = async () => {
    const { firstDay, firstDayNext } = getVisibleMonthRange();
    const monthLabel = getVisibleMonthLabel();

    if (specialty === "Internal Medicine" && !plan) {
      toast.error(
        "Select a healthcare plan to clear Internal Medicine for this month.",
      );
      setShowClearModal(false);
      return;
    }

    const startOfMonth = toLocalISODate(firstDay); // YYYY-MM-DD
    const startOfNextMonth = toLocalISODate(firstDayNext); // YYYY-MM-DD (exclusive)

    let deleteQuery = supabase
      .from("schedules")
      .delete({ count: "exact" })
      .eq("specialty", specialty)
      .gte("on_call_date", startOfMonth)
      .lt("on_call_date", startOfNextMonth);

    if (specialty === "Internal Medicine" && plan) {
      deleteQuery = deleteQuery.eq("healthcare_plan", plan);
    }

    const { error, count } = await deleteQuery;

    if (error) {
      console.error("Error clearing month:", error);
      toast.error("Failed to clear the month.");
    } else {
      toast.success(
        `Cleared ${count ?? 0} entr${(count ?? 0) === 1 ? "y" : "ies"} for ${monthLabel} — ${specialty === "Internal Medicine" ? `IM · ${plan}` : specialty}.`,
      );
      await refreshCalendarVisibleRange();
    }

    setShowClearModal(false);
  };

  // Route guard: if user lacks Scheduler/Admin access, redirect away
  useEffect(() => {
    if (role === null) return; // still checking
    if (role !== "admin" && role !== "scheduler") {
      router.replace("/unauthorized?from=/schedule");
    }
  }, [role, router]);
  // Supabase test effect
  useEffect(() => {
    supabase
      .from("directory")
      .select("provider_name")
      .then(({ data, error }: { data: any[] | null; error: Error | null }) => {
        if (error) {
          console.error("Supabase test error:", error);
        } else {
          console.log("Supabase test success. Providers:", data);
        }
      });
  }, []);
  useEffect(() => {
    const storedSpecialty = sessionStorage.getItem("specialty");
    const storedPlan = sessionStorage.getItem("plan");
    if (storedSpecialty) setSpecialty(storedSpecialty);
    if (storedPlan) setPlan(storedPlan);
  }, []);
  const [_currentDate, setCurrentDate] = useState(new Date());
  const [selectedModalDate, setSelectedModalDate] = useState<string | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [directory, setDirectory] = useState<any[]>([]);
  const providerInputRef = useRef<HTMLInputElement>(null);
  const [providerSuggestions, setProviderSuggestions] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const [allProvidersForSpec, setAllProvidersForSpec] = useState<string[]>([]);

  const [secondPref, setSecondPref] = useState<"none" | "residency" | "pa">(
    "none",
  );
  const [secondPhone, setSecondPhone] = useState("");
  const [secondSource, setSecondSource] = useState<string | null>(null);
  // Cover physician state
  const [coverEnabled, setCoverEnabled] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [selectedAdditionalDays, setSelectedAdditionalDays] = useState<
    string[]
  >([]);
  const [editingEntry, setEditingEntry] = useState<{
    provider_name: string;
    show_second_phone: boolean;
    second_phone_pref: "auto" | "pa" | "residency";
    cover?: boolean;
    covering_provider?: string | null;
  } | null>(null);

  // Add ref for FullCalendar
  const calendarRef = useRef<FullCalendar | null>(null);

  // Helpers to derive the visible month and label from FullCalendar
  const getVisibleMonthRange = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (api) {
      const firstDay = new Date(api.view.currentStart);
      const firstDayNext = new Date(api.view.currentEnd);
      firstDay.setHours(0, 0, 0, 0);
      firstDayNext.setHours(0, 0, 0, 0);
      return { firstDay, firstDayNext };
    }
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayNext = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    firstDay.setHours(0, 0, 0, 0);
    firstDayNext.setHours(0, 0, 0, 0);
    return { firstDay, firstDayNext };
  }, []);

  const getVisibleMonthLabel = useCallback(() => {
    const { firstDay } = getVisibleMonthRange();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `${monthNames[firstDay.getMonth()]} ${firstDay.getFullYear()}`;
  }, [getVisibleMonthRange]);

  useEffect(() => {
    sessionStorage.setItem("specialty", specialty);
  }, [specialty]);

  useEffect(() => {
    sessionStorage.setItem("plan", plan);
  }, [plan]);

  // Handle clearEvent custom event to remove a schedule entry and update UI
  useEffect(() => {
    const handleClearEvent = (
      e: CustomEvent<{ date: string; provider: string }>,
    ) => {
      const { date, provider } = e.detail;
      setPendingDeletions((prev) => [...prev, { date, provider }]);
      setEvents((prev: { date: string; title: string }[]) =>
        prev.filter((evt) => !(evt.date === date && evt.title === provider)),
      );
      toast.success("Entry marked for deletion. Don’t forget to Save Changes.");
    };

    window.addEventListener(
      "clearEvent",
      handleClearEvent as unknown as EventListener,
    );
    return () =>
      window.removeEventListener(
        "clearEvent",
        handleClearEvent as unknown as EventListener,
      );
  }, []);

  // Fetch events function, reusable and memoized
  // Guarded loader: only the latest request applies
  const loadEvents = useCallback(
    async (range: { start: Date; end: Date }, spec: string, hp: string) => {
      const myKey = ++loadKeyRef.current;
      try {
        const startStr = toLocalISODate(range.start);
        const endStr = toLocalISODate(range.end);

        if (spec === "Internal Medicine" && !hp) {
          const { data: directoryData, error: directoryError } = await supabase
            .from("directory")
            .select("provider_name, specialty, phone_number");

          if (loadKeyRef.current !== myKey) return;
          if (directoryError)
            console.error("Error fetching directory:", directoryError);

          setEvents([]);
          setDirectory(directoryData || []);
          setProviderColorMap({});
          return;
        }

        let query = supabase
          .from("schedules")
          .select("on_call_date, provider_name, specialty, healthcare_plan")
          .eq("specialty", spec)
          .gte("on_call_date", startStr)
          .lt("on_call_date", endStr);

        if (spec === "Internal Medicine" && hp) {
          query = query.eq("healthcare_plan", hp);
        }

        const [
          { data: scheduleData, error: scheduleError },
          { data: directoryData, error: directoryError },
        ] = await Promise.all([
          query,
          supabase
            .from("directory")
            .select("provider_name, specialty, phone_number"),
        ]);

        if (loadKeyRef.current !== myKey) return;

        if (scheduleError)
          console.error("Error fetching events:", scheduleError);
        if (directoryError)
          console.error("Error fetching directory:", directoryError);

        const formattedEvents = (scheduleData ?? []).map((ev) => ({
          title: `Dr. ${ev.provider_name}`,
          date: ev.on_call_date,
        }));

        setEvents(formattedEvents);
        setDirectory(directoryData || []);

        const names = Array.from(
          new Set((scheduleData ?? []).map((e) => e.provider_name)),
        ).sort();
        const cols = generateDistinctColors(names.length);
        const m: Record<string, string> = {};
        names.forEach((n, i) => (m[n] = cols[i]));
        setProviderColorMap(m);
      } catch (err) {
        if (loadKeyRef.current !== myKey) return;
        console.error("Unexpected error during loadEvents:", err);
      }
    },
    [],
  );

  // Reusable helper to refresh the current visible range of the main calendar and reload events
  const refreshCalendarVisibleRange = useCallback(async () => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const start = new Date(api.view.currentStart);
    const end = new Date(api.view.currentEnd);
    await loadEvents({ start, end }, specialty, plan);
    api.refetchEvents();
  }, [loadEvents, specialty, plan]);

  // Trigger refresh whenever specialty or plan changes
  useEffect(() => {
    if (!visibleRange) return;
    loadEvents(visibleRange, specialty, plan);
  }, [visibleRange, specialty, plan, loadEvents]);

  // Save handler used by the button and Ctrl/Cmd+S
  const handleSaveChanges = useCallback(
    async (source?: "shortcut" | "button") => {
      // Debug: Log pending entries before save
      console.log("Saving Changes – Pending Entries:", pendingEntries);
      if (pendingEntries.length === 0 && pendingDeletions.length === 0) {
        toast.success("No changes to save.");
        return;
      }

      // Handle deletions
      for (const del of pendingDeletions) {
        let deleteQuery = supabase
          .from("schedules")
          .delete()
          .eq("on_call_date", del.date)
          .eq("specialty", specialty)
          .eq("provider_name", del.provider.replace(/^Dr\. /, "").trim());

        if (specialty === "Internal Medicine") {
          if (plan) {
            deleteQuery = deleteQuery.eq("healthcare_plan", plan);
          } else {
            deleteQuery = deleteQuery.is("healthcare_plan", null);
          }
        }

        const { error } = await deleteQuery;
        if (error) {
          console.error("Failed to delete entry:", error);
          toast.error("Failed to delete some entries.");
          return;
        }
      }

      // Upsert additions
      if (pendingEntries.length > 0) {
        // Fetch potentially conflicting entries from Supabase
        const datesToCheck = pendingEntries.map((e) => e.on_call_date);

        let dupQuery = supabase
          .from("schedules")
          .select("*")
          .in("on_call_date", datesToCheck)
          .eq("specialty", specialty);

        if (specialty === "Internal Medicine") {
          if (plan) {
            dupQuery = dupQuery.eq("healthcare_plan", plan);
          } else {
            dupQuery = dupQuery.is("healthcare_plan", null);
          }
        }

        const { data: existingRows, error: fetchDupError } = await dupQuery;

        if (fetchDupError) {
          console.error("Error fetching duplicates:", fetchDupError);
          toast.error("Could not check for existing entries.");
          return;
        }

        const existingKeys = new Set(
          existingRows?.map(
            (row) =>
              `${row.on_call_date}|${row.provider_name}|${row.specialty}|${row.healthcare_plan ?? ""}`,
          ),
        );

        const filteredPendingEntries = pendingEntries.filter((entry) => {
          const key = `${entry.on_call_date}|${entry.provider_name}|${entry.specialty}|${entry.healthcare_plan ?? ""}`;
          const isEntryUpdated = existingRows?.some(
            (row) =>
              row.on_call_date === entry.on_call_date &&
              row.specialty === entry.specialty &&
              (row.healthcare_plan ?? "") === (entry.healthcare_plan ?? "") &&
              (row.provider_name !== entry.provider_name ||
                row.show_second_phone !== entry.show_second_phone ||
                (row.second_phone_pref ?? "auto") !==
                  (entry.second_phone_pref ?? "auto") ||
                !!row.cover !== !!(entry as any).cover ||
                (row.covering_provider ?? null) !==
                  ((entry as any).covering_provider ?? null)),
          );
          // If provider_name changed, queue deletion of old entry
          if (isEntryUpdated) {
            const oldRow = existingRows.find(
              (row) =>
                row.on_call_date === entry.on_call_date &&
                row.specialty === entry.specialty &&
                (row.healthcare_plan ?? "") === (entry.healthcare_plan ?? "") &&
                row.provider_name !== entry.provider_name,
            );
            if (oldRow) {
              // Only push if not already in pendingDeletions
              const alreadyQueued = pendingDeletions.some(
                (del) =>
                  del.date === oldRow.on_call_date &&
                  del.provider === `Dr. ${oldRow.provider_name}`,
              );
              if (!alreadyQueued) {
                pendingDeletions.push({
                  date: oldRow.on_call_date,
                  provider: `Dr. ${oldRow.provider_name}`,
                });
              }
            }
          }
          const isPendingDeletion = pendingDeletions.some(
            (del) =>
              del.date === entry.on_call_date &&
              del.provider === `Dr. ${entry.provider_name}`,
          );
          return (
            (!existingKeys.has(key) || isEntryUpdated) && !isPendingDeletion
          );
        });

        // Deduplicate the payload to prevent repeat insertions within the same batch
        const uniqueMap = new Map();
        for (const entry of filteredPendingEntries) {
          const key = `${entry.on_call_date}|${entry.provider_name}|${entry.specialty}|${entry.healthcare_plan ?? ""}`;
          uniqueMap.set(key, entry);
        }
        const dedupedEntries = Array.from(uniqueMap.values());

        if (dedupedEntries.length > 0) {
          const { error: upsertError } = await supabase
            .from("schedules")
            .upsert(dedupedEntries, {
              // Allow upsert to overwrite provider_name for same date/specialty/plan
              onConflict: "on_call_date,specialty,healthcare_plan",
            });

          if (upsertError) {
            console.error("Failed to save entries:", upsertError);
            toast.error("Failed to save changes.");
            return;
          }
        }
      }

      if (source === "shortcut") {
        toast.success("Saved with ⌘S/Ctrl+S");
      } else {
        toast.success("All changes saved successfully!");
      }
      await refreshCalendarVisibleRange();
      console.log("Finished saving. Resetting pending entries.");
      setPendingEntries([]);
      setPendingDeletions([]);
    },
    [
      pendingEntries,
      pendingDeletions,
      specialty,
      plan,
      refreshCalendarVisibleRange,
    ],
  );

  // Global shortcut: Ctrl+S / Cmd+S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!canEdit) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        // Only enable the shortcut when the page (not the modal/dialog) has focus
        if (isModalOpen) return;
        // Optionally, avoid triggering while typing into inputs if desired:
        const ae = document.activeElement as HTMLElement | null;
        if (
          ae &&
          (ae.tagName === "INPUT" ||
            ae.tagName === "TEXTAREA" ||
            ae.tagName === "SELECT" ||
            ae.isContentEditable)
        ) {
          // Allow save even when typing into page inputs if you prefer; currently we allow it
          // by not returning here. Comment out the next line to allow saving from inputs.
          // return;
        }
        e.preventDefault();
        handleSaveChanges("shortcut");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSaveChanges, isModalOpen, canEdit]);

  // Global Escape to close any open modal dialogs on this page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      let handled = false;
      if (isModalOpen) {
        setIsModalOpen(false);
        handled = true;
      }
      if (showClearModal) {
        setShowClearModal(false);
        handled = true;
      }
      if (showSpecialtyModal) {
        setShowSpecialtyModal(false);
        handled = true;
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen, showClearModal, showSpecialtyModal]);

  // Prevent background scroll when any modal/sheet on this page is open
  useEffect(() => {
    const anyOpen = isModalOpen || showClearModal || showSpecialtyModal;
    const original = document.body.style.overflow;
    if (anyOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = original;
    };
  }, [isModalOpen, showClearModal, showSpecialtyModal]);

  useEffect(() => {
    if (isModalOpen) {
      const baseSpec = resolveDirectorySpecialty(specialty);
      const residencyName = `${baseSpec} Residency`;
      const paName = `${baseSpec} PA Phone`;

      if (secondPref === "residency") {
        const resident = directory.find(
          (d) => d.provider_name === residencyName,
        );
        if (resident?.phone_number) {
          setSecondPhone(resident.phone_number);
          setSecondSource(residencyName);
        } else {
          setSecondPhone("No residency phone registered for this service.");
          setSecondSource(null);
        }
      } else if (secondPref === "pa") {
        const pa = directory.find((d) => d.provider_name === paName);
        if (pa?.phone_number) {
          setSecondPhone(pa.phone_number);
          setSecondSource(paName);
        } else {
          setSecondPhone("No PA phone registered for this service.");
          setSecondSource(null);
        }
      } else {
        setSecondPhone("");
        setSecondSource(null);
      }

      if (providerInputRef.current) {
        providerInputRef.current.focus();
      }
    }
  }, [isModalOpen, secondPref, specialty, directory]);

  useEffect(() => {
    if (isModalOpen && isEditing && editingEntry) {
      // Prefill provider input
      if (providerInputRef.current) {
        providerInputRef.current.value = editingEntry.provider_name;
      }
      // Prefill Works-with radios from DB state
      const pref: "none" | "residency" | "pa" = editingEntry.show_second_phone
        ? editingEntry.second_phone_pref === "pa"
          ? "pa"
          : editingEntry.second_phone_pref === "residency"
            ? "residency"
            : "none"
        : "none";
      setSecondPref(pref);

      // Prefill cover state
      const cover = !!editingEntry.cover;
      setCoverEnabled(cover);
      if (cover && coverInputRef.current) {
        coverInputRef.current.value = editingEntry.covering_provider ?? "";
      }
    }
  }, [isModalOpen, isEditing, editingEntry]);

  useEffect(() => {
    const loadProvidersForSpecialty = async () => {
      if (!isModalOpen) return;
      const spec = resolveDirectorySpecialty(specialty);
      const { data, error } = await supabase
        .from("directory")
        .select("provider_name")
        .eq("specialty", spec)
        .not("provider_name", "ilike", "%Residency%")
        .not("provider_name", "ilike", "%PA Phone%")
        .order("provider_name", { ascending: true });

      if (error) {
        console.error("Error loading providers for specialty:", error);
        setAllProvidersForSpec([]);
        return;
      }
      const names = (data ?? []).map((d) => d.provider_name);
      setAllProvidersForSpec(names);

      // If the input is empty when opening, show the full list immediately
      if (providerInputRef.current && !providerInputRef.current.value.trim()) {
        setProviderSuggestions(names);
      }
    };
    loadProvidersForSpecialty();
  }, [isModalOpen, specialty]);

  if (role === null) {
    return (
      <LayoutShell>
        <div className="text-center mt-20 text-gray-500">
          Checking access...
        </div>
      </LayoutShell>
    );
  }

  if (role !== "admin" && role !== "scheduler") {
    return (
      <LayoutShell>
        <div className="text-center mt-20 text-gray-500">Redirecting…</div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="app-container px-4 py-6">
        <h1 className="text-2xl font-bold mb-4 text-center text-gray-800 dark:text-white">
          Scheduler
        </h1>

        {role === "admin" && (
          <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
            <div className="flex gap-3 items-center">
              <button
                onClick={() => setShowSpecialtyModal(true)}
                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded"
              >
                Edit Specialties
              </button>
            </div>
            {/* Medical Groups buttons only for admin */}
            <div className="flex gap-3 items-center">
              <Link
                href="/schedule/mmm-medical-groups"
                className="bg-[#0086BF] hover:bg-[#0070A3] text-white font-medium px-3 py-2 text-sm rounded-md shadow transition"
              >
                MMM Medical Groups
              </Link>
              <Link
                href="/schedule/vital-medical-groups"
                className="bg-[#0086BF] hover:bg-[#0070A3] text-white font-medium px-3 py-2 text-sm rounded-md shadow transition"
              >
                Vital Medical Groups
              </Link>
            </div>
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4 mb-6">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-1">
              Specialty
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:text-white dark:border-gray-600"
            >
              {specialties.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {specialty === "Internal Medicine" && (
            <div>
              <label
                htmlFor="healthcare-plan"
                className="block text-gray-700 dark:text-gray-300 mb-1"
              >
                Healthcare Plan
              </label>
              <select
                id="healthcare-plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:text-white dark:border-gray-600"
              >
                <option value="">-- Select a Plan --</option>
                {plans.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div
          className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md"
          style={{ overflowX: "auto" }}
        >
          {/* Control panel: Add Refresh Calendar button */}
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => refreshCalendarVisibleRange()}
              className={`bg-gray-700 hover:bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-600 shadow-sm flex items-center gap-2 ${isIMWithoutPlan ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isIMWithoutPlan}
            >
              🔄 <span>Refresh Calendar</span>
            </button>
          </div>
          <div className="relative">
            {/* wrapper to allow overlay */}
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              initialDate={new Date()}
              headerToolbar={{
                left: "prev",
                center: "title currentMonth",
                right: "next",
              }}
              customButtons={{
                currentMonth: {
                  text: "Current Month",
                  click: () => {
                    const calendarApi = calendarRef.current?.getApi();
                    if (calendarApi) {
                      calendarApi.today();
                    }
                  },
                },
              }}
              timeZone="local"
              events={events.map((e) => ({
                title: e.title,
                start: e.date,
                allDay: true,
              }))}
              selectable={canEdit}
              editable={false}
              height="auto"
              dayCellClassNames={(arg) => {
                // Always apply dark border class
                const base = ["dark:!border-gray-600"];
                const calendarApi = calendarRef.current?.getApi();
                if (!calendarApi) return base;
                const viewDate = calendarApi.getDate();
                const isCurrentMonth =
                  arg.date.getMonth() === viewDate.getMonth() &&
                  arg.date.getFullYear() === viewDate.getFullYear();
                return isCurrentMonth ? base : [...base, "fc-outside-month"];
              }}
              datesSet={(arg) => {
                const start = new Date(arg.start);
                const end = new Date(arg.end);
                setCurrentDate(start);
                setVisibleRange({ start, end });
              }}
              eventContent={(event: EventContentArg) => {
                try {
                  const currentProvider = event.event.title
                    .replace(/^Dr\. /, "")
                    .trim();
                  const bgColor =
                    providerColorMap[currentProvider] ?? "#3B82F6";
                  const textColor = getTextColorForBackground(bgColor);
                  // Determine if this event is a saved entry (not pending)
                  const isSavedEntry = !pendingEntries.some(
                    (entry) =>
                      entry.on_call_date === event.event.startStr &&
                      entry.provider_name === currentProvider,
                  );
                  const opacityClass = isSavedEntry ? "" : "opacity-50";
                  return (
                    <div
                      className={`relative w-full px-1 py-0.5 rounded border transition-colors duration-200 hover:brightness-110 hover:shadow-md ${opacityClass}`}
                      style={{
                        backgroundColor: bgColor,
                        color: textColor,
                        borderColor: bgColor,
                        backgroundImage: "none",
                      }}
                    >
                      <button
                        type="button"
                        onMouseDown={(e: React.MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const { startStr, title } = event.event;
                          const clearEvent = new CustomEvent("clearEvent", {
                            detail: { date: startStr, provider: title },
                            bubbles: true,
                            cancelable: true,
                          });
                          window.dispatchEvent(clearEvent);
                        }}
                        onTouchStart={(e: React.TouchEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const { startStr, title } = event.event;
                          const clearEvent = new CustomEvent("clearEvent", {
                            detail: { date: startStr, provider: title },
                            bubbles: true,
                            cancelable: true,
                          });
                          window.dispatchEvent(clearEvent);
                        }}
                        onClick={(e: React.MouseEvent) => {
                          // no-op: start handlers already dispatched; keep to block FullCalendar click
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        aria-label="Remove provider from this date"
                        className="absolute top-0 right-0 text-xs px-1 pointer-events-auto"
                        style={{ color: textColor }}
                      >
                        ✕
                      </button>
                      <span className="whitespace-normal break-words text-sm pr-4">
                        {event.event.title}
                      </span>
                    </div>
                  );
                } catch (error) {
                  console.error("Error rendering event content:", error);
                  return { domNodes: [] };
                }
              }}
              eventClick={(clickInfo) => {
                if (!canEdit) return;
                if (isIMWithoutPlan) {
                  toast.error("Select a healthcare plan first.");
                  return;
                } // NEW guard

                const api = calendarRef.current?.getApi();
                const view = api?.view;
                if (!view) return;

                // Parse the event date as LOCAL (avoid UTC shifting to previous day)
                const eventDate = parseLocalYMD(clickInfo.event.startStr);

                // Normalize all dates to 12:00 local to avoid boundary drift in comparisons
                const noon = (d: Date) =>
                  new Date(
                    d.getFullYear(),
                    d.getMonth(),
                    d.getDate(),
                    12,
                    0,
                    0,
                    0,
                  );
                const eventNoon = noon(eventDate);
                const startNoon = noon(new Date(view.currentStart));
                const endNoon = noon(new Date(view.currentEnd)); // exclusive

                // Only allow editing if the event is within the currently rendered view
                if (eventNoon < startNoon || eventNoon >= endNoon) return;

                setSelectedModalDate(clickInfo.event.startStr);
                setIsEditing(true);

                const dateStr = clickInfo.event.startStr;
                (async () => {
                  try {
                    let q = supabase
                      .from("schedules")
                      .select("*")
                      .eq("on_call_date", dateStr)
                      .eq("specialty", specialty)
                      .limit(1);

                    if (specialty === "Internal Medicine") {
                      if (plan) {
                        q = q.eq("healthcare_plan", plan);
                      } else {
                        q = q.is("healthcare_plan", null);
                      }
                    }

                    const { data, error } = await q;
                    if (error) {
                      console.error("Error loading entry for edit:", error);
                    }

                    if (data && data[0]) {
                      setEditingEntry({
                        provider_name: data[0].provider_name,
                        show_second_phone: !!data[0].show_second_phone,
                        second_phone_pref: (data[0].second_phone_pref ??
                          "auto") as "auto" | "pa" | "residency",
                        cover: !!data[0].cover,
                        covering_provider: (data[0].covering_provider ??
                          null) as string | null,
                      });
                    } else {
                      const currentProvider = clickInfo.event.title
                        .replace(/^Dr\. /, "")
                        .trim();
                      setEditingEntry({
                        provider_name: currentProvider,
                        show_second_phone: false,
                        second_phone_pref: "auto",
                        cover: false,
                        covering_provider: null,
                      });
                    }
                  } catch (e) {
                    console.error(
                      "Unexpected error fetching entry for edit:",
                      e,
                    );
                  } finally {
                    setIsModalOpen(true);
                  }
                })();
              }}
              dateClick={(info: any) => {
                if (!canEdit) return;
                if (isIMWithoutPlan) {
                  toast.error("Select a healthcare plan first.");
                  return;
                } // NEW guard
                if (info.dayEl.classList.contains("fc-day-other")) {
                  info.jsEvent.preventDefault();
                  info.jsEvent.stopPropagation();
                  return;
                }
                setSelectedModalDate(info.dateStr);
                setIsModalOpen(true);
                setIsEditing(false);
              }}
            />
            {isIMWithoutPlan && (
              <div
                onClick={() =>
                  toast.error(
                    "Please select healthcare plan group before adding providers on call",
                  )
                }
                className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md cursor-not-allowed text-center px-6 py-8 pointer-events-auto"
                style={{
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
                role="presentation"
              >
                <p className="text-gray-800 dark:text-gray-100 font-semibold text-sm md:text-base mb-2">
                  Select a healthcare plan group before adding providers on
                  call.
                </p>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 max-w-md">
                  The Internal Medicine calendar is inactive until a plan is
                  chosen.
                </p>
              </div>
            )}
          </div>
          {/* Global CSS to paint days outside current month black and unclickable */}
          <style jsx global>{`
            .fc-daygrid-day.fc-day-other {
              pointer-events: none;
              background-color: black;
              color: white;
            }
          `}</style>
        </div>

        {canEdit && (
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => {
                if (isIMWithoutPlan) {
                  toast.error("Select a healthcare plan first.");
                  return;
                }
                setShowClearModal(true);
              }}
              className={`px-4 py-2 rounded text-white ${isIMWithoutPlan ? "bg-red-400 cursor-not-allowed opacity-60" : "bg-red-600 hover:bg-red-700"}`}
              disabled={isIMWithoutPlan}
            >
              {`Clear ${getVisibleMonthLabel()} — ${specialty === "Internal Medicine" ? `IM · ${plan || "Select plan"}` : specialty}`}
            </button>
            <button
              onClick={() => {
                if (isIMWithoutPlan) {
                  toast.error("Select a healthcare plan first.");
                  return;
                }
                handleSaveChanges("button");
              }}
              className={`px-4 py-2 rounded text-white ${isIMWithoutPlan ? "bg-green-400 cursor-not-allowed opacity-60" : "bg-green-600 hover:bg-green-700"}`}
              disabled={isIMWithoutPlan}
            >
              Save Changes
            </button>
          </div>
        )}

        {/* Clear Month Confirmation Modal */}
        {canEdit && showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out modal-overlay-in p-4">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded shadow-md max-w-sm w-full transform transition-transform duration-300 ease-out scale-95 animate-fadeIn modal-pop-in">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                Confirm Deletion
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
                Are you sure you want to clear all on-call entries for{" "}
                <strong>{specialty}</strong>
                {specialty === "Internal Medicine" && plan
                  ? ` · ${plan}`
                  : ""}{" "}
                for <strong>{getVisibleMonthLabel()}</strong>?
              </p>
              <div className="flex justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => setShowClearModal(false)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white text-sm rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearConfirmed}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white text-sm rounded"
                >
                  Confirm
                </button>
              </div>
            </div>
            <style jsx>{`
              @keyframes fadeIn {
                from {
                  opacity: 0;
                  transform: scale(0.95);
                }
                to {
                  opacity: 1;
                  transform: scale(1);
                }
              }

              .animate-fadeIn {
                animation: fadeIn 0.3s ease-in-out forwards;
              }
            `}</style>
          </div>
        )}

        <div
          id="provider-modal"
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out modal-overlay-in p-4 ${isModalOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onClick={(e) => {
            if ((e.target as HTMLElement).id === "provider-modal") {
              setIsModalOpen(false);
              setEditingEntry(null);
              setSecondPref("none");
              setSelectedAdditionalDays([]);
              setCoverEnabled(false);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label={isEditing ? "Edit on-call entry" : "Add on-call entry"}
        >
          <div
            className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-lg shadow-xl modal-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-6 pt-5 pb-3 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEditing ? "Edit On-Call Entry" : "Add On-Call Entry"}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                {specialty}
                {specialty === "Internal Medicine" && plan ? ` · ${plan}` : ""}
                {selectedModalDate ? ` — ${selectedModalDate}` : ""}
              </p>
            </div>

            <div className="px-4 sm:px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Provider
                </label>
                <input
                  ref={providerInputRef}
                  type="text"
                  placeholder="Start typing a provider name…"
                  onChange={(e) => {
                    const q = e.target.value;
                    if (!q.trim()) {
                      setProviderSuggestions(allProvidersForSpec);
                      setHighlightIndex(-1);
                      return;
                    }
                    const scored = allProvidersForSpec
                      .map((name) => ({ name, score: scoreName(name, q) }))
                      .filter((x) => x.score > 0)
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 8)
                      .map((x) => x.name);
                    setProviderSuggestions(scored);
                    setHighlightIndex(-1);
                  }}
                  onKeyDown={(e) => {
                    if (providerSuggestions.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightIndex(
                        (i) => (i + 1) % providerSuggestions.length,
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightIndex(
                        (i) =>
                          (i - 1 + providerSuggestions.length) %
                          providerSuggestions.length,
                      );
                    } else if (e.key === "Enter") {
                      if (highlightIndex >= 0) {
                        e.preventDefault();
                        const pick = providerSuggestions[highlightIndex];
                        if (providerInputRef.current)
                          providerInputRef.current.value = pick;
                        setProviderSuggestions([]);
                        setHighlightIndex(-1);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:text-white dark:border-gray-700"
                />
                {providerSuggestions.length > 0 && (
                  <ul className="mt-2 max-h-48 overflow-auto border rounded-md bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm">
                    {providerSuggestions.map((s, idx) => (
                      <li
                        key={s}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (providerInputRef.current)
                            providerInputRef.current.value = s;
                          setProviderSuggestions([]);
                          setHighlightIndex(-1);
                        }}
                        className={`px-3 py-2 cursor-pointer ${idx === highlightIndex ? "bg-gray-100 dark:bg-gray-800" : ""}`}
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label
                  htmlFor="secondPref"
                  className="block text-sm font-medium mb-1"
                >
                  Works with
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name="secondPref"
                      checked={secondPref === "none"}
                      onChange={() => setSecondPref("none")}
                    />
                    None
                  </label>
                  <label className="inline-flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name="secondPref"
                      checked={secondPref === "residency"}
                      onChange={() => setSecondPref("residency")}
                    />
                    Residency
                  </label>
                  <label className="inline-flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name="secondPref"
                      checked={secondPref === "pa"}
                      onChange={() => setSecondPref("pa")}
                    />
                    PA Phone
                  </label>
                </div>
                {secondPref !== "none" && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
                    {secondSource ? `${secondSource}: ` : ""}
                    {secondPhone || "No secondary phone available."}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="cover-enabled"
                  type="checkbox"
                  checked={coverEnabled}
                  onChange={(e) => setCoverEnabled(e.target.checked)}
                />
                <label htmlFor="cover-enabled" className="text-sm">
                  Cover physician
                </label>
              </div>
              {coverEnabled && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Covering Provider
                  </label>
                  <input
                    ref={coverInputRef}
                    type="text"
                    placeholder="Covering provider name"
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:text-white dark:border-gray-700"
                  />
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 py-3 border-t dark:border-gray-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEntry(null);
                  setSecondPref("none");
                  setSelectedAdditionalDays([]);
                  setCoverEnabled(false);
                }}
                className="px-3 sm:px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                onClick={() => {
                  if (!selectedModalDate) {
                    toast.error("No date selected.");
                    return;
                  }
                  const name = providerInputRef.current?.value.trim() || "";
                  if (!name) {
                    toast.error("Please select a provider.");
                    return;
                  }

                  const entry = {
                    on_call_date: selectedModalDate,
                    provider_name: name,
                    specialty,
                    healthcare_plan:
                      specialty === "Internal Medicine" ? plan || null : null,
                    show_second_phone: secondPref !== "none",
                    second_phone_pref: (secondPref === "none"
                      ? "auto"
                      : secondPref) as "auto" | "pa" | "residency",
                    cover: coverEnabled,
                    covering_provider: coverEnabled
                      ? coverInputRef.current?.value.trim() || null
                      : null,
                  } as const;

                  // Update pending entries (replace any existing for the same date/spec/plan)
                  setPendingEntries((prev) => {
                    const others = prev.filter(
                      (e) =>
                        !(
                          e.on_call_date === entry.on_call_date &&
                          e.specialty === entry.specialty &&
                          (e.healthcare_plan ?? "") ===
                            (entry.healthcare_plan ?? "")
                        ),
                    );
                    const extras = selectedAdditionalDays.map((d) => ({
                      ...entry,
                      on_call_date: d,
                    }));
                    return [...others, entry, ...extras];
                  });

                  // Update UI events optimistically
                  setEvents((prev: { title: string; date: string }[]) => {
                    const dates = new Set<string>([
                      entry.on_call_date,
                      ...selectedAdditionalDays,
                    ]);
                    const filtered = prev.filter((ev) => !dates.has(ev.date));
                    const added = Array.from(dates).map((d) => ({
                      title: `Dr. ${entry.provider_name}`,
                      date: d,
                    }));
                    return [...filtered, ...added];
                  });

                  setIsModalOpen(false);
                  setEditingEntry(null);
                  setSecondPref("none");
                  setSelectedAdditionalDays([]);
                  setCoverEnabled(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Specialty Management Modal */}
        {showSpecialtyModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm modal-overlay-in p-4"
            onClick={() => setShowSpecialtyModal(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Edit Specialties"
          >
            <div
              className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-lg shadow-xl modal-pop-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 sm:px-6 pt-5 pb-3 border-b dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Edit Specialties
                </h3>
                <button
                  onClick={() => setShowSpecialtyModal(false)}
                  className="px-3 py-2 rounded border dark:border-gray-700"
                  aria-label="Close specialty editor"
                >
                  Close
                </button>
              </div>

              <div className="px-4 sm:px-6 py-4 space-y-4">
                <form
                  onSubmit={handleAddSpecialty}
                  className="flex flex-col sm:flex-row sm:items-center gap-2"
                >
                  <input
                    value={newSpecName}
                    onChange={(e) => setNewSpecName(e.target.value)}
                    placeholder="New specialty name"
                    className="flex-1 px-3 py-2 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-700"
                    aria-label="New specialty name"
                  />
                  <button
                    type="submit"
                    className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded"
                  >
                    Add Specialty
                  </button>
                </form>

                <div className="border rounded p-3 dark:border-gray-700">
                  <h4 className="font-semibold mb-2">All Specialties</h4>
                  <ul className="space-y-2 max-h-80 overflow-auto">
                    {specialtyEditList.length === 0 && (
                      <li className="text-sm text-gray-500">No specialties.</li>
                    )}
                    {specialtyEditList.map((s) => (
                      <li key={s.id} className="flex items-center gap-2">
                        <input
                          id={`show_${s.id}`}
                          type="checkbox"
                          className="mr-1"
                          checked={!!s.show_oncall}
                          onChange={async (e) => {
                            const checked = e.currentTarget.checked;
                            const { error } = await supabase
                              .from("specialties")
                              .update({ show_oncall: checked })
                              .eq("id", s.id);
                            if (error) {
                              console.error(
                                "Failed to toggle visibility",
                                error,
                              );
                              toast.error("Failed to update visibility.");
                            } else {
                              await reloadSpecialties();
                              toast.success("Updated visibility.");
                            }
                          }}
                          aria-label={`Toggle visibility for ${s.name}`}
                        />
                        <label htmlFor={`show_${s.id}`} className="text-sm">
                          Show on calendar
                        </label>
                        <div className="flex-1" />
                        {editingSpecId === s.id ? (
                          <>
                            <input
                              value={specEditName}
                              onChange={(e) => setSpecEditName(e.target.value)}
                              className="px-3 py-1 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-700"
                              aria-label="Specialty name"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveSpecialty(s.id, s.name)}
                              className="px-3 py-1 bg-blue-600 text-white rounded"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditSpecialty}
                              className="px-3 py-1 border rounded dark:border-gray-700"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm">{s.name}</span>
                            <button
                              type="button"
                              onClick={() =>
                                handleStartEditSpecialty(s.id, s.name)
                              }
                              className="px-3 py-1 border rounded dark:border-gray-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteSpecialty(s.id, s.name)
                              }
                              className="px-3 py-1 border rounded text-red-600 dark:border-gray-700"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
