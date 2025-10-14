"use client";

import type { EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";

import { useColorMapping } from "@/app/hooks/useColorMapping";
import { useProviders } from "@/app/hooks/useProviders";
import { useScheduleEntries } from "@/app/hooks/useScheduleEntries";
import { useSpecialties } from "@/app/hooks/useSpecialties";
import useUserRole from "@/app/hooks/useUserRole";
import LayoutShell from "@/components/LayoutShell";
import ScheduleModal from "@/components/schedule/ScheduleModal";
import SpecialtyManagementModal from "@/components/schedule/SpecialtyManagementModal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  type MiniCalendarEvent,
  type PendingEntry,
  type Provider,
  plans,
  toLocalISODate,
} from "@/lib/schedule-utils";
import { resolveDirectorySpecialty } from "@/lib/specialtyMapping";
import { getBrowserClient } from "@/lib/supabase/client";

const supabase = getBrowserClient();

export default function SchedulePage() {
  const router = useRouter();
  const role = useUserRole();

  // Core state
  const [specialty, setSpecialty] = useState<string>("");
  const [plan, setPlan] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModalDate, setSelectedModalDate] = useState<string | null>(null);
  const [selectedAdditionalDays, setSelectedAdditionalDays] = useState<string[]>([]);
  const [currentProviderName, setCurrentProviderName] = useState("");
  const [secondPref, setSecondPref] = useState<"none" | "residency" | "pa">("none");
  const [coverEnabled, setCoverEnabled] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [miniCalendarDate, setMiniCalendarDate] = useState(new Date());
  const [miniCalendarEvents, setMiniCalendarEvents] = useState<MiniCalendarEvent[]>([]);

  // Pending changes tracking (for batch save)
  const [pendingDeletions, setPendingDeletions] = useState<{ date: string; provider: string }[]>([]);

  // Modal states
  const [showClearModal, setShowClearModal] = useState(false);
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);

  // "Works with" phone display state
  const [secondPhone, setSecondPhone] = useState("");
  const [secondSource, setSecondSource] = useState<string | null>(null);

  // Cover physician input ref
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Loading states
  const [modalLoading, setModalLoading] = useState(false);

  // Refs
  const calendarRef = useRef<FullCalendar | null>(null);
  const loadKeyRef = useRef(0); // Race condition prevention

  // Visible range state for calendar
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null);

  // Custom hooks
  const { specialties, specialtyEditList, loading: specialtiesLoading, reloadSpecialties } = useSpecialties();
  const { providers, allProviders } = useProviders(specialty);
  const {
    entries,
    pendingEntries,
    loading: entriesLoading,
    loadEntries,
    addEntry,
    addMultipleEntries,
    updateEntry,
  } = useScheduleEntries(specialty, plan);

  // Get all unique provider names for color mapping
  const allProviderNames = useMemo(() => {
    const names = new Set<string>();
    entries.forEach(entry => names.add(entry.provider_name));
    pendingEntries.forEach(entry => names.add(entry.provider_name));
    return Array.from(names);
  }, [entries, pendingEntries]);

  const { getProviderColors } = useColorMapping(allProviderNames);

  // Stable calendar option objects & callbacks to avoid remount/reset issues
  const headerToolbar = useMemo(
    () => ({ left: "prev", center: "title currentMonth", right: "next" }),
    [],
  );

  const customButtons = useMemo(
    () => ({
      currentMonth: {
        text: "Current Month",
        click: () => calendarRef.current?.getApi().today(),
      },
    }),
    [],
  );

  const dayCellClassNames = useCallback((arg: any) => {
    const base = ["dark:!border-gray-600"];
    const api = calendarRef.current?.getApi();
    if (!api) return base;
    const viewDate = api.getDate();
    const isCurrentMonth =
      arg.date.getMonth() === viewDate.getMonth() &&
      arg.date.getFullYear() === viewDate.getFullYear();
    return isCurrentMonth ? base : [...base, "fc-outside-month"];
  }, []);

  const onDatesSet = useCallback((dateInfo: any) => {
    const nextStart = new Date(dateInfo.start).getTime();
    const nextEnd = new Date(dateInfo.end).getTime();
    setVisibleRange(prev => {
      if (prev && prev.start.getTime() === nextStart && prev.end.getTime() === nextEnd) {
        return prev;
      }
      return { start: new Date(nextStart), end: new Date(nextEnd) };
    });
  }, []);

  // Stable plugins array
  const calendarPlugins = useMemo(() => [dayGridPlugin, interactionPlugin], []);

  // Computed flags
  const canEdit = useMemo(() => role === "admin" || role === "scheduler", [role]);
  const isIMWithoutPlan = useMemo(() => specialty === "Internal Medicine" && !plan, [specialty, plan]);

  // Session storage: restore on mount
  useEffect(() => {
    const storedSpecialty = sessionStorage.getItem("specialty");
    const storedPlan = sessionStorage.getItem("plan");
    if (storedSpecialty) setSpecialty(storedSpecialty);
    if (storedPlan) setPlan(storedPlan);
  }, []);

  // Session storage: save specialty changes
  useEffect(() => {
    if (specialty) {
      sessionStorage.setItem("specialty", specialty);
    }
  }, [specialty]);

  // Session storage: save plan changes
  useEffect(() => {
    if (plan) {
      sessionStorage.setItem("plan", plan);
    }
  }, [plan]);

  // Load specialties on mount
  useEffect(() => {
    reloadSpecialties();
  }, [reloadSpecialties]);

  // Load entries when visible range, specialty, or plan changes
  useEffect(() => {
    if (!visibleRange) return;
    if (!specialty) return;
    if (specialty === "Internal Medicine" && !plan) return;

    const myKey = ++loadKeyRef.current;
    const timeoutId = setTimeout(() => {
      loadEntries(visibleRange.start, visibleRange.end, specialty, plan).then(() => {
        // Only update if this is still the latest request
        if (loadKeyRef.current !== myKey) return;
      });
    }, 50);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRange, specialty, plan]);

  // Load mini calendar events
  const loadMiniCalendarEvents = useCallback(async () => {
    if (!specialty || !selectedModalDate) return;

    const modalDate = new Date(selectedModalDate + "T12:00:00");
    setMiniCalendarDate(new Date(modalDate.getFullYear(), modalDate.getMonth(), 1));

    const startOfMonth = new Date(modalDate.getFullYear(), modalDate.getMonth(), 1);
    const endOfMonth = new Date(modalDate.getFullYear(), modalDate.getMonth() + 1, 0);

    try {
      let query = supabase
        .from("schedules")
        .select("on_call_date, provider_name")
        .eq("specialty", specialty)
        .gte("on_call_date", toLocalISODate(startOfMonth))
        .lte("on_call_date", toLocalISODate(endOfMonth));

      if (specialty === "Internal Medicine" && plan) {
        query = query.eq("healthcare_plan", plan);
      }

      const { data } = await query;

      setMiniCalendarEvents(
        (data || []).map(item => ({
          date: item.on_call_date,
          provider: item.provider_name,
        }))
      );
    } catch (error) {
      console.error("Error loading mini calendar events:", error);
    }
  }, [specialty, plan, selectedModalDate]);

  useEffect(() => {
    if (isModalOpen && !editingEntry) {
      loadMiniCalendarEvents();
    }
  }, [isModalOpen, editingEntry, loadMiniCalendarEvents]);

  // Update "Works with" phone display when modal opens or preference changes
  useEffect(() => {
    if (!isModalOpen) {
      setSecondPhone("");
      setSecondSource(null);
      return;
    }

    if (secondPref === "none") {
      setSecondPhone("");
      setSecondSource(null);
      return;
    }

    const baseSpec = resolveDirectorySpecialty(specialty);
    const targetName = secondPref === "residency"
      ? `${baseSpec} Residency`
      : `${baseSpec} PA Phone`;

    // Find the provider in allProviders (which includes Residency and PA Phone)
    const provider = allProviders.find((p) => p.name === targetName);

    if (provider?.phone_1) {
      setSecondPhone(provider.phone_1);
      setSecondSource(targetName);
    } else {
      setSecondPhone(`No ${secondPref === "residency" ? "residency" : "PA"} phone registered for this service.`);
      setSecondSource(null);
    }
  }, [isModalOpen, secondPref, specialty, allProviders]);

  // Prefill modal when editing
  useEffect(() => {
    if (isModalOpen && editingEntry) {
      // Prefill second phone preference
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
      if (cover && coverInputRef.current && editingEntry.covering_provider) {
        coverInputRef.current.value = editingEntry.covering_provider;
      }
    }
  }, [isModalOpen, editingEntry]);

  // Helper functions for calendar operations
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
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${monthNames[firstDay.getMonth()]} ${firstDay.getFullYear()}`;
  }, [getVisibleMonthRange]);

  // Refresh calendar visible range - simplified since state changes auto-update the calendar
  const refreshCalendarVisibleRange = useCallback(async () => {
    // Force a re-render of the calendar by updating visible range from current API state
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const start = new Date(api.view.currentStart);
    const end = new Date(api.view.currentEnd);
    await loadEntries(start, end, specialty, plan);
  }, [specialty, plan, loadEntries]);

  // Event handlers
  const handleDateClick = useCallback((info: any) => {
    if (!canEdit) {
      toast.error("Can't edit the event.");
      return;
    }
    if (isIMWithoutPlan) {
      toast.error("Select a healthcare plan first.");
      return;
    }

    const dateStr = toLocalISODate(info.date);
    // Only allow one entry per day: block if an entry exists for this date
    const alreadyExists = entries.some(e => e.on_call_date === dateStr);
    if (alreadyExists) {
      toast.error("Only one entry per day is allowed. Click the event to edit.");
      return;
    }
    setSelectedModalDate(dateStr);
    setIsModalOpen(true);
    setEditingEntry(null);
    setCurrentProviderName("");
    setSelectedAdditionalDays([]);
    setSecondPref("none");
    setCoverEnabled(false);
  }, [canEdit, isIMWithoutPlan, entries]);

  const handleEventClick = useCallback((clickInfo: any) => {
    if (!canEdit) {
      toast.error("Only admins/schedulers can edit schedule entries.");
      return;
    }
    if (isIMWithoutPlan) {
      toast.error("Select a healthcare plan first.");
      return;
    }

    const event = clickInfo.event;
    // Normalize event title to match stored provider_name
    const normalizedProvider = event.title
      .replace(/^Dr\. /, "")
      .replace(" (Cover)", "")
      .trim();

    const entry = entries.find(e =>
      e.on_call_date === toLocalISODate(event.start) &&
      e.provider_name === normalizedProvider
    );

    if (entry) {
      setSelectedModalDate(entry.on_call_date);
      setCurrentProviderName(entry.provider_name);
      setSecondPref(entry.second_phone_pref === "auto" ? "none" : (entry.second_phone_pref as "residency" | "pa") || "none");
      setCoverEnabled(entry.cover || false);
      setEditingEntry(entry);
      // Editing applies to a single day; clear any previously selected additional days
      setSelectedAdditionalDays([]);
      setIsModalOpen(true);
    }
  }, [canEdit, isIMWithoutPlan, entries]);

  const handleProviderSelect = useCallback((provider: Provider) => {
    setCurrentProviderName(provider.name);
  }, []);

  const handleDateSelect = useCallback((dateStr: string) => {
    const isSelected = selectedAdditionalDays.includes(dateStr);
    setSelectedAdditionalDays(prev =>
      isSelected
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr]
    );
  }, [selectedAdditionalDays]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingEntry(null);
    setCurrentProviderName("");
    setSelectedAdditionalDays([]);
    setSecondPref("none");
    setCoverEnabled(false);
  }, []);

  const handleModalSubmit = useCallback(async () => {
    if (!selectedModalDate) {
      toast.error("No date selected.");
      return;
    }

    const providerName = currentProviderName.trim();
    if (!providerName) {
      toast.error("Please enter a provider name.");
      return;
    }

    setModalLoading(true);

    try {
      const coveringProviderName = coverEnabled && coverInputRef.current
        ? coverInputRef.current.value.trim() || null
        : null;

      const baseEntry = {
        on_call_date: selectedModalDate,
        provider_name: providerName,
        specialty,
        healthcare_plan: specialty === "Internal Medicine" ? plan : null,
        show_second_phone: secondPref !== "none",
        second_phone_pref: secondPref === "none" ? "auto" as const : secondPref,
        cover: coverEnabled,
        covering_provider: coveringProviderName,
      };

      if (editingEntry) {
        // Update existing entry
        await updateEntry(editingEntry.id, baseEntry);
      } else {
        // Create entries for primary date and additional days
        const allDates = [selectedModalDate, ...selectedAdditionalDays];
        const entries = allDates.map(date => ({ ...baseEntry, on_call_date: date }));

        if (entries.length === 1) {
          await addEntry(entries[0]);
        } else {
          await addMultipleEntries(entries);
        }
      }

      handleModalClose();
    } catch (error) {
      console.error("Error submitting entry:", error);
      toast.error("Failed to save entry");
    } finally {
      setModalLoading(false);
    }
  }, [
    selectedModalDate,
    currentProviderName,
    specialty,
    plan,
    secondPref,
    coverEnabled,
    selectedAdditionalDays,
    editingEntry,
    updateEntry,
    addEntry,
    addMultipleEntries,
    handleModalClose,
  ]);

  // Handle clear event (delete from calendar)
  useEffect(() => {
    const handleClearEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ date: string; provider: string }>;
      const { date, provider } = customEvent.detail;
      setPendingDeletions(prev => [...prev, { date, provider }]);
      toast.success("Entry marked for deletion. Save Changes to commit.");
    };

    window.addEventListener("clearEvent", handleClearEvent);
    return () => window.removeEventListener("clearEvent", handleClearEvent);
  }, []);

  // Handle save changes (commit pending additions and deletions)
  const handleSaveChanges = useCallback(async (source?: "shortcut" | "button") => {
    if (pendingEntries.length === 0 && pendingDeletions.length === 0) {
      toast.success("No changes to save.");
      return;
    }

    try {
      // Handle deletions first
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

      // Handle pending entries (already saved via modal, but handle any remaining)
      if (pendingEntries.length > 0) {
        // These are typically already saved, but we can add logic here if needed
        // For now, just clear them
      }

      if (source === "shortcut") {
        toast.success("Saved with ⌘S/Ctrl+S");
      } else {
        toast.success("All changes saved successfully!");
      }

      setPendingDeletions([]);
      await refreshCalendarVisibleRange();
    } catch (error) {
      console.error("Error in handleSaveChanges:", error);
      toast.error("Failed to save changes.");
    }
  }, [pendingEntries, pendingDeletions, specialty, plan, refreshCalendarVisibleRange]);

  // Global keyboard shortcut: Ctrl/Cmd+S to save
  useEffect(() => {
    const canEdit = role === "admin" || role === "scheduler";
    const onKey = (e: KeyboardEvent) => {
      if (!canEdit) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        if (isModalOpen) return;
        e.preventDefault();
        handleSaveChanges("shortcut");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSaveChanges, isModalOpen, role]);

  // Handle clear month confirmation
  const handleClearConfirmed = useCallback(async () => {
    const { firstDay, firstDayNext } = getVisibleMonthRange();
    const monthLabel = getVisibleMonthLabel();

    if (specialty === "Internal Medicine" && !plan) {
      toast.error("Select a healthcare plan to clear Internal Medicine for this month.");
      setShowClearModal(false);
      return;
    }

    const startOfMonth = toLocalISODate(firstDay);
    const startOfNextMonth = toLocalISODate(firstDayNext);

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
        `Cleared ${count ?? 0} entr${(count ?? 0) === 1 ? "y" : "ies"} for ${monthLabel} — ${specialty === "Internal Medicine" ? `IM · ${plan}` : specialty}.`
      );
      await refreshCalendarVisibleRange();
    }

    setShowClearModal(false);
  }, [getVisibleMonthRange, getVisibleMonthLabel, specialty, plan, refreshCalendarVisibleRange]);

  // Global Escape key handler for modals
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

  // Prevent background scroll when modal is open
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

  // Calendar events - format matches original but uses optimized hooks
  const calendarEvents = useMemo(() => {
    const allEntries = [...entries, ...pendingEntries];

    return allEntries.map(entry => {
      const colors = getProviderColors(entry.provider_name);
      const title = entry.cover ? `${entry.provider_name} (Cover)` : entry.provider_name;

      return {
        id: `${entry.on_call_date}-${entry.provider_name}`,
        title: `Dr. ${title}`,
        start: entry.on_call_date,
        allDay: true,
        backgroundColor: colors.backgroundColor,
        textColor: colors.textColor,
        borderColor: colors.backgroundColor,
        extendedProps: {
          entry,
          isPending: pendingEntries.includes(entry as PendingEntry),
        },
      };
    });
  }, [entries, pendingEntries, getProviderColors]);

  // Event content renderer with delete button
  const renderEventContent = useCallback((eventInfo: EventContentArg) => {
    const isPending = eventInfo.event.extendedProps.isPending;
    const canEdit = role === "admin" || role === "scheduler";
    const currentProvider = eventInfo.event.title.replace(/^Dr\. /, "").replace(/ \(Cover\)$/, "").trim();

    return (
      <div
        className={`relative w-full px-1 py-0.5 rounded ${isPending ? 'opacity-70 border-dashed' : ''}`}
        style={{
          backgroundColor: eventInfo.backgroundColor,
          color: eventInfo.textColor,
        }}
      >
        <div className="flex justify-between items-start gap-1">
          <span className="text-xs flex-1 truncate">{eventInfo.event.title}</span>
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(
                  new CustomEvent("clearEvent", {
                    detail: {
                      date: eventInfo.event.startStr,
                      provider: currentProvider,
                    },
                  })
                );
              }}
              className="text-white hover:bg-black/20 rounded px-1 text-sm font-bold leading-none"
              style={{ minWidth: '16px', height: '16px' }}
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  }, [role]);

  if (role === null) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3">Loading...</span>
        </div>
      </LayoutShell>
    );
  }

  if (role === "viewer") {
    router.push("/unauthorized");
    return null;
  }

  return (
    <LayoutShell>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Schedule Management
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage on-call schedules by specialty
            </p>
          </div>

          {role === "admin" && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowSpecialtyModal(true)}
                className="px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
              >
                Edit Specialties
              </button>
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
              <Link
                href="/admin"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Admin Panel
              </Link>
            </div>
          )}

          {role === "scheduler" && (
            <Link
              href="/admin"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Admin Panel
            </Link>
          )}
        </div>

        {/* Specialty and Plan Selection - Original Dropdown UI */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4 mb-6">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-1">
              Specialty
            </label>
            {specialtiesLoading ? (
              <div className="flex items-center px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600">
                <LoadingSpinner size="sm" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading specialties...</span>
              </div>
            ) : (
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
            )}
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
                value={plan || ""}
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

        {/* Calendar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden relative">
          <div className="p-4 border-b dark:border-gray-700">
            <h2 className="text-xl font-semibold">
              {resolveDirectorySpecialty(specialty)}
              {specialty === "Internal Medicine" && plan && (
                <span className="text-blue-600 dark:text-blue-400 ml-2">({plan})</span>
              )}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Click on a date to add a new schedule entry
            </p>
          </div>

          <div className="p-4 relative">
            <FullCalendar
              ref={calendarRef}
              plugins={calendarPlugins}
              initialView="dayGridMonth"
              timeZone="local"
              headerToolbar={headerToolbar}
              customButtons={customButtons}
              dayCellClassNames={dayCellClassNames}
              events={calendarEvents}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              height="auto"
              dayMaxEvents={3}
              moreLinkClick="popover"
              datesSet={onDatesSet}
            />
            {entriesLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm z-10">
                <LoadingSpinner size="lg" />
                <span className="mt-3 text-gray-700 dark:text-gray-300 text-sm">Loading schedule...</span>
              </div>
            )}
          </div>

          {/* IM Plan Gating Overlay */}
          {isIMWithoutPlan && (
            <div
              onClick={() =>
                toast.error(
                  "Please select healthcare plan group before adding providers on call"
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
                Select a healthcare plan group before adding providers on call.
              </p>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 max-w-md">
                The Internal Medicine calendar is inactive until a plan is chosen.
              </p>
            </div>
          )}

          {/* Global CSS for outside month days */}
          <style jsx global>{`
            .fc-daygrid-day.fc-day-other {
              pointer-events: none;
              background-color: black;
              color: white;
            }
          `}</style>
        </div>

        {/* Action Buttons - Save Changes and Clear Month */}
        {(role === "admin" || role === "scheduler") && (
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setShowClearModal(true)}
              className="px-4 py-2 rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              disabled={!specialty || (specialty === "Internal Medicine" && !plan)}
            >
              Clear {getVisibleMonthLabel()} — {specialty === "Internal Medicine" ? `IM · ${plan || "Select plan"}` : specialty || "Select specialty"}
            </button>
            <button
              onClick={() => handleSaveChanges("button")}
              className="px-4 py-2 rounded text-white bg-green-600 hover:bg-green-700"
            >
              Save Changes
            </button>
          </div>
        )}

        {/* Clear Month Confirmation Modal */}
        {showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md max-w-sm w-full">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                Confirm Deletion
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
                Are you sure you want to clear all on-call entries for{" "}
                <strong>{specialty}</strong>
                {specialty === "Internal Medicine" && plan ? ` · ${plan}` : ""} for{" "}
                <strong>{getVisibleMonthLabel()}</strong>?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowClearModal(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white text-sm rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearConfirmed}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Schedule Modal */}
        <ScheduleModal
          isOpen={isModalOpen}
          isEditing={!!editingEntry}
          selectedModalDate={selectedModalDate}
          specialty={specialty}
          plan={plan}
          providers={providers}
          selectedAdditionalDays={selectedAdditionalDays}
          miniCalendarDate={miniCalendarDate}
          miniCalendarEvents={miniCalendarEvents}
          pendingEntries={pendingEntries}
          secondPref={secondPref}
          secondPhone={secondPhone}
          secondSource={secondSource}
          coverEnabled={coverEnabled}
          coverInputRef={coverInputRef}
          editingEntry={editingEntry}
          currentProviderName={currentProviderName}
          loading={modalLoading}
          onClose={handleModalClose}
          onProviderSelect={handleProviderSelect}
          onDateSelect={handleDateSelect}
          onSecondPrefChange={setSecondPref}
          onCoverEnabledChange={setCoverEnabled}
          onProviderNameChange={setCurrentProviderName}
          onSubmit={handleModalSubmit}
        />

        {/* Specialty Management Modal */}
        <SpecialtyManagementModal
          isOpen={showSpecialtyModal}
          specialtyEditList={specialtyEditList}
          currentSpecialty={specialty}
          onClose={() => setShowSpecialtyModal(false)}
          onSpecialtyChange={setSpecialty}
          onReloadSpecialties={reloadSpecialties}
        />
      </div>
    </LayoutShell>
  );
}