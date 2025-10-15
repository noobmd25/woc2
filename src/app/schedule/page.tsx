"use client";

import { useColorMapping } from "@/app/hooks/useColorMapping";
import { useProviders } from "@/app/hooks/useProviders";
import { useScheduleEntries } from "@/app/hooks/useScheduleEntries";
import { useSpecialties } from "@/app/hooks/useSpecialties";
import { MONTH_NAMES, PLANS, SECOND_PHONE_PREFS, SPECIALTIES, type SecondPhonePref } from "@/lib/constants";
import {
  type MiniCalendarEvent,
  type Provider,
  toLocalISODate
} from "@/lib/schedule-utils";
import { resolveDirectorySpecialty } from "@/lib/specialtyMapping";
import type { EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { RefreshCcw, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";

import useUserRole from "@/app/hooks/useUserRole";
import LayoutShell from "@/components/LayoutShell";
import ScheduleModal from "@/components/schedule/ScheduleModal";
import SpecialtyManagementModal from "@/components/schedule/SpecialtyManagementModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";


export default function SchedulePage() {
  // Track reload state for disabling the reload button
  const [reloading, setReloading] = useState(false);
  const router = useRouter();
  const role = useUserRole();

  // Core state
  const [specialty, setSpecialty] = useState<string>("");
  const [plan, setPlan] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModalDate, setSelectedModalDate] = useState<string | null>(null);
  const [selectedAdditionalDays, setSelectedAdditionalDays] = useState<string[]>([]);
  const [currentProviderId, setCurrentProviderId] = useState("");
  const [secondPref, setSecondPref] = useState<SecondPhonePref>(SECOND_PHONE_PREFS.NONE);
  const [coverEnabled, setCoverEnabled] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [miniCalendarDate, setMiniCalendarDate] = useState(new Date());

  // Track events being deleted for immediate visual feedback
  const [deletingEvents, setDeletingEvents] = useState<Set<string>>(new Set());

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<{ date: string; provider: string } | null>(null);

  // Modal states
  const [showClearModal, setShowClearModal] = useState(false);
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);

  // "Works with" phone display state
  const [secondPhone, setSecondPhone] = useState("");
  const [secondSource, setSecondSource] = useState<string | null>(null);


  // Covering provider state (for cover arrangement)
  const [coveringProviderId, setCoveringProviderId] = useState("");

  // Loading states
  const [modalLoading, setModalLoading] = useState(false);

  // Refs
  const calendarRef = useRef<FullCalendar | null>(null);
  const loadKeyRef = useRef(0); // Race condition prevention

  // Visible range state for calendar
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null);

  // Track window size for responsive weekday format
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  );

  // Custom hooks
  const { specialties, specialtyEditList, loading: specialtiesLoading, reloadSpecialties } = useSpecialties();
  const { providers, allProviders } = useProviders(specialty);
  const {
    entries,
    loading: entriesLoading,
    loadEntries,
    addEntry,
    addMultipleEntries,
    updateEntry,
    deleteEntryByDateAndProvider,
    clearMonth,
  } = useScheduleEntries(specialty, plan);

  // Get all unique provider names for color mapping
  const allProviderNames = useMemo(() => {
    const names = new Set<string>();
    entries.forEach(entry => names.add(entry.provider_name));
    return Array.from(names);
  }, [entries]);

  const { getProviderColors } = useColorMapping(allProviderNames);

  // Stable calendar option objects & callbacks to avoid remount/reset issues
  const headerToolbar = useMemo(
    () => ({ left: "prev", center: "title currentMonth", right: "next" }),
    [],
  );

  const customButtons = useMemo(
    () => ({
      currentMonth: {
        text: isMobileView ? "Today" : "Current Month",
        click: () => calendarRef.current?.getApi().today(),
      },
    }),
    [isMobileView],
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
  const isIMWithoutPlan = useMemo(() => specialty === SPECIALTIES.INTERNAL_MEDICINE && !plan, [specialty, plan]);

  // Helper to get provider by ID
  const getProviderById = useCallback((id: string) => {
    return allProviders.find(p => p.id === id);
  }, [allProviders]);

  // Helper to get provider by name (for backward compatibility)
  const getProviderByName = useCallback((name: string) => {
    return allProviders.find(p => p.name === name);
  }, [allProviders]);

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
    if (specialty === SPECIALTIES.INTERNAL_MEDICINE && !plan) return;

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

  // Handle window resize for responsive weekday format
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 640;
      setIsMobileView(mobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute mini calendar events from entries for the modal month
  const miniCalendarEvents: MiniCalendarEvent[] = useMemo(() => {
    if (!selectedModalDate) return [];

    const modalDate = new Date(selectedModalDate + "T12:00:00");
    const startOfMonth = new Date(modalDate.getFullYear(), modalDate.getMonth(), 1);
    const endOfMonth = new Date(modalDate.getFullYear(), modalDate.getMonth() + 1, 0);

    const startDateStr = toLocalISODate(startOfMonth);
    const endDateStr = toLocalISODate(endOfMonth);

    return entries
      .filter(entry => entry.on_call_date >= startDateStr && entry.on_call_date <= endDateStr)
      .map(entry => ({
        date: entry.on_call_date,
        provider: entry.provider_name,
      }));
  }, [entries, selectedModalDate]);

  // Update mini calendar date when modal opens
  useEffect(() => {
    if (isModalOpen && selectedModalDate) {
      const modalDate = new Date(selectedModalDate + "T12:00:00");
      setMiniCalendarDate(new Date(modalDate.getFullYear(), modalDate.getMonth(), 1));
    }
  }, [isModalOpen, selectedModalDate]);

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

      // Prefill covering provider if editing and cover is enabled
      if (cover && editingEntry.covering_provider) {
        // Find provider by name
        const provider = allProviders.find(p => p.name === editingEntry.covering_provider);
        if (provider) setCoveringProviderId(provider.id);
        else setCoveringProviderId("");
      } else {
        setCoveringProviderId("");
      }
    } else if (isModalOpen && !editingEntry) {
      setCoveringProviderId("");
    }
  }, [isModalOpen, editingEntry, allProviders]);

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
    return `${MONTH_NAMES[firstDay.getMonth()]} ${firstDay.getFullYear()}`;
  }, [getVisibleMonthRange]);

  // Refresh calendar visible range - simplified since state changes auto-update the calendar
  const refreshCalendarVisibleRange = useCallback(async () => {
    if (!visibleRange) return;
    await loadEntries(visibleRange.start, visibleRange.end, specialty, plan);
  }, [specialty, plan, loadEntries, visibleRange]);

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
    // Only allow adding in the main visible month
    const api = calendarRef.current?.getApi();
    if (api) {
      const visibleMonth = api.view.currentStart;
      if (
        info.date.getMonth() !== visibleMonth.getMonth() ||
        info.date.getFullYear() !== visibleMonth.getFullYear()
      ) {
        toast.error("You can only add events for the current visible month. Move to that month to add events.");
        info.jsEvent?.preventDefault?.();
        return;
      }
    }
    // Only allow one entry per day: block if an entry exists for this date
    const alreadyExists = entries.some(e => e.on_call_date === dateStr);
    if (alreadyExists) {
      info.jsEvent?.preventDefault?.();
      return;
    }
    setSelectedModalDate(dateStr);
    setIsModalOpen(true);
    setEditingEntry(null);
    setCurrentProviderId("");
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
      // Find provider by name and store ID
      const provider = getProviderByName(entry.provider_name);
      setCurrentProviderId(provider?.id || "");
      setSecondPref(entry.second_phone_pref === "auto" ? "none" : (entry.second_phone_pref as "residency" | "pa") || "none");
      setCoverEnabled(entry.cover || false);
      setEditingEntry(entry);
      // Editing applies to a single day; clear any previously selected additional days
      setSelectedAdditionalDays([]);
      setIsModalOpen(true);
    }
  }, [canEdit, isIMWithoutPlan, entries, getProviderByName]);

  const handleProviderSelect = useCallback((provider: Provider) => {
    setCurrentProviderId(provider.id);
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
    setCurrentProviderId("");
    setSelectedAdditionalDays([]);
    setSecondPref("none");
    setCoverEnabled(false);
  }, []);

  const handleModalSubmit = useCallback(async () => {
    if (!selectedModalDate) {
      toast.error("No date selected.");
      return;
    }

    if (!currentProviderId) {
      toast.error("Please select a provider.");
      return;
    }

    // Get provider name from ID
    const provider = getProviderById(currentProviderId);
    if (!provider) {
      toast.error("Invalid provider selected.");
      return;
    }

    // Get covering provider name if coverEnabled
    let coveringProviderName: string | null = null;
    if (coverEnabled && coveringProviderId) {
      const coveringProvider = getProviderById(coveringProviderId);
      coveringProviderName = coveringProvider ? coveringProvider.name : null;
    }

    setModalLoading(true);

    try {
      const baseEntry = {
        on_call_date: selectedModalDate,
        provider_name: provider.name, // Use the provider name for database
        specialty,
        healthcare_plan: specialty === SPECIALTIES.INTERNAL_MEDICINE ? plan : null,
        show_second_phone: secondPref !== SECOND_PHONE_PREFS.NONE,
        second_phone_pref: secondPref === SECOND_PHONE_PREFS.NONE ? "auto" as const : secondPref,
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
    currentProviderId,
    specialty,
    plan,
    secondPref,
    coverEnabled,
    coveringProviderId,
    selectedAdditionalDays,
    editingEntry,
    updateEntry,
    addEntry,
    addMultipleEntries,
    handleModalClose,
    getProviderById,
  ]);

  // Handle clear event (delete from calendar) with confirmation
  useEffect(() => {
    const handleClearEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ date: string; provider: string }>;
      const { date, provider } = customEvent.detail;

      // Store the event to delete and open confirmation dialog
      setEventToDelete({ date, provider });
      setDeleteConfirmOpen(true);
    };

    window.addEventListener("clearEvent", handleClearEvent);
    return () => window.removeEventListener("clearEvent", handleClearEvent);
  }, []);

  // Handle confirmed deletion
  const handleConfirmedDelete = useCallback(async () => {
    if (!eventToDelete) return;

    const { date, provider } = eventToDelete;
    const eventId = `${date}-${provider}`;

    // Close dialog
    setDeleteConfirmOpen(false);

    // Mark as deleting for immediate visual feedback
    setDeletingEvents(prev => new Set(prev).add(eventId));

    try {
      // Delete using the hook function
      const success = await deleteEntryByDateAndProvider(date, provider, specialty, plan);

      if (success) {
        // Reload entries to reflect the change
        if (visibleRange) {
          await loadEntries(visibleRange.start, visibleRange.end, specialty, plan);
        }
      }

      // Remove from deleting state
      setDeletingEvents(prev => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    } catch (error) {
      console.error("Failed to delete entry:", error);
      toast.error("Failed to delete entry");
      // Remove from deleting state on error
      setDeletingEvents(prev => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    } finally {
      setEventToDelete(null);
    }
  }, [eventToDelete, specialty, plan, deleteEntryByDateAndProvider, loadEntries, visibleRange]);

  // Handle save changes (commit pending additions only - deletions are immediate)
  const handleReloadCalendar = useCallback(async () => {

    setReloading(true);
    try {
      await refreshCalendarVisibleRange();
      toast.success("Reload success.");
    } catch (error) {
      console.error("Error in handleReloadCalendar:", error);
      toast.error("Failed to save changes.");
    } finally {
      setReloading(false);
    }
  }, [refreshCalendarVisibleRange]);

  // Global keyboard shortcut: Ctrl/Cmd+R to save
  useEffect(() => {
    const canEdit = role === "admin" || role === "scheduler";
    const onKey = (e: KeyboardEvent) => {
      if (!canEdit) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "r") {
        if (isModalOpen) return;
        e.preventDefault();
        handleReloadCalendar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleReloadCalendar, isModalOpen, role]);

  // Handle clear month confirmation
  const handleClearConfirmed = useCallback(async () => {
    const { firstDay, firstDayNext } = getVisibleMonthRange();
    const monthLabel = getVisibleMonthLabel();

    if (specialty === SPECIALTIES.INTERNAL_MEDICINE && !plan) {
      toast.error("Select a healthcare plan to clear Internal Medicine for this month.");
      setShowClearModal(false);
      return;
    }

    const startOfMonth = toLocalISODate(firstDay);
    const startOfNextMonth = toLocalISODate(firstDayNext);

    // Use the hook function to clear the month
    const { success, count } = await clearMonth(startOfMonth, startOfNextMonth, specialty, plan);

    if (success) {
      toast.success(
        `Cleared ${count} entr${count === 1 ? "y" : "ies"} for ${monthLabel} — ${specialty === SPECIALTIES.INTERNAL_MEDICINE ? `IM · ${plan}` : specialty}.`
      );
      await refreshCalendarVisibleRange();
    }

    setShowClearModal(false);
  }, [getVisibleMonthRange, getVisibleMonthLabel, specialty, plan, clearMonth, refreshCalendarVisibleRange]);

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
    const allEntries = [...entries];

    return allEntries
      .filter(entry => {
        // Filter out events that are being deleted
        const eventId = `${entry.on_call_date}-${entry.provider_name}`;
        return !deletingEvents.has(eventId);
      })
      .map(entry => {
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
          },
        };
      });
  }, [entries, getProviderColors, deletingEvents]);

  // Event content renderer with delete button
  const renderEventContent = useCallback((eventInfo: EventContentArg) => {
    const entry = eventInfo.event.extendedProps.entry;
    // Only allow editing if user is admin/scheduler AND event is visible in the current calendar grid
    const api = calendarRef.current?.getApi();
    let isEventVisible = false;
    if (api) {
      const start = api.view.currentStart;
      const end = api.view.currentEnd;
      const eventDate = new Date(entry.on_call_date + 'T00:00:00');
      isEventVisible = eventDate >= start && eventDate < end;
    }
    const canEditEvent = canEdit && isEventVisible;
    const currentProvider = eventInfo.event.title.replace(/^Dr\. /, "").replace(/ \(Cover\)$/, "").trim();
    const hasSecondPhone = entry?.show_second_phone && entry?.second_phone_pref !== "auto";


    return (
      <div
        className={`
          relative flex flex-col w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg shadow-sm
          transition-all duration-150 hover:shadow-md border border-transparent`}
        style={{
          backgroundColor: eventInfo.backgroundColor,
          color: eventInfo.textColor,
        }}
      >
        {/* Absolute delete button for sm+ screens */}
        {canEditEvent && (
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
            aria-label="Remove provider from this date"
            className="hidden sm:flex absolute -top-1.5 -right-1.5 w-5 h-5 items-center justify-center text-xs font-bold rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-red-500 hover:text-white shadow-md hover:shadow-lg transition-all duration-150 pointer-events-auto cursor-pointer z-10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="flex flex-col md:flex-col lg:flex-row items-center gap-1 sm:gap-1.5">
          <span className="whitespace-normal break-words text-[11px] sm:text-sm font-medium cursor-pointer pr-1 sm:pr-2 leading-tight">
            {eventInfo.event.title}
          </span>
          {hasSecondPhone && (
            <span
              className="flex-shrink-0 text-[10px] sm:text-xs"
              title={`Works with ${entry.second_phone_pref === "residency" ? "Residency" : "PA Phone"}`}
            >
              📞
            </span>
          )}
          {/* Inline delete button for mobile */}
          {canEditEvent && (
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
              aria-label="Remove provider from this date"
              className="sm:hidden ml-1 w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-red-500 hover:text-white shadow-md hover:shadow-lg transition-all duration-150 pointer-events-auto cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }, [canEdit]); if (role === null) {
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
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Schedule Management
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              Manage on-call schedules by specialty
            </p>
          </div>

          {role === "admin" && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowSpecialtyModal(true)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-150"
              >
                Edit Specialties
              </button>
              <Link
                href="/schedule/mmm-medical-groups"
                className="bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-medium px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-150"
              >
                MMM Medical Groups
              </Link>
              <Link
                href="/schedule/vital-medical-groups"
                className="bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-medium px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-150"
              >
                Vital Medical Groups
              </Link>
              <Link
                href="/admin"
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-150"
              >
                Admin Panel
              </Link>
            </div>
          )}

          {role === "scheduler" && (
            <Link
              href="/admin"
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-150 w-fit"
            >
              Admin Panel
            </Link>
          )}
        </div>

        {/* Specialty and Plan Selection - Original Dropdown UI */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="w-full">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
              Specialty
            </label>
            {specialtiesLoading ? (
              <div className="flex items-center px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                <LoadingSpinner size="sm" />
                <span className="ml-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">Loading specialties...</span>
              </div>
            ) : (
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 transition-all"
              >
                {specialties.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            )}
          </div>

          {specialty === SPECIALTIES.INTERNAL_MEDICINE && (
            <div className="w-full">
              <label
                htmlFor="healthcare-plan"
                className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2"
              >
                Healthcare Plan
              </label>
              <select
                id="healthcare-plan"
                value={plan || ""}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 transition-all"
              >
                <option value="">-- Select a Plan --</option>
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Calendar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-lg overflow-hidden relative border border-gray-200 dark:border-gray-700">
          <div className="flex flex-row justify-between items-center p-3 sm:p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white break-words">
                {resolveDirectorySpecialty(specialty)}
                {specialty === SPECIALTIES.INTERNAL_MEDICINE && plan && (
                  <span className="text-blue-600 dark:text-blue-400 ml-2 text-base sm:text-lg">({plan})</span>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
                Click on a date to add a new schedule entry
              </p>
            </div>
            <button
              onClick={() => handleReloadCalendar()}
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105  text-xs sm:text-sm rounded text-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={reloading}
            >
              <RefreshCcw className={`w-4 h-4 ${reloading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="p-2 sm:p-4 md:p-6 relative">
            <FullCalendar
              ref={calendarRef}
              plugins={calendarPlugins}
              initialView="dayGridMonth"
              timeZone="local"
              headerToolbar={headerToolbar}
              titleFormat={{ year: 'numeric', month: isMobileView ? 'short' : 'long' }}
              customButtons={customButtons}
              dayCellClassNames={dayCellClassNames}
              events={calendarEvents}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              height="auto"
              dayMaxEvents={1}
              moreLinkClick="popover"
              datesSet={onDatesSet}
              dayHeaderFormat={{ weekday: isMobileView ? 'narrow' : 'short' }}
              dayHeaderClassNames="fc-day-header-responsive"
            />
            {entriesLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg z-10">
                <LoadingSpinner size="lg" />
                <span className="mt-3 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium">Loading schedule...</span>
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
              className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md cursor-not-allowed text-center px-4 sm:px-6 py-6 sm:py-8 pointer-events-auto"
              role="presentation"
            >
              <p className="text-gray-800 dark:text-gray-100 font-semibold text-xs sm:text-sm md:text-base mb-2">
                Select a healthcare plan group before adding providers on call.
              </p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-md">
                The Internal Medicine calendar is inactive until a plan is chosen.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons - Save Changes and Clear Month */}
        {(role === "admin" || role === "scheduler") && (
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-4 mt-3 sm:mt-4">
            <button
              onClick={() => setShowClearModal(true)}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
              disabled={!specialty || (specialty === SPECIALTIES.INTERNAL_MEDICINE && !plan)}
            >
              <span className="hidden sm:inline">
                Clear {getVisibleMonthLabel()} — {specialty === SPECIALTIES.INTERNAL_MEDICINE ? `IM · ${plan || "Select plan"}` : specialty || "Select specialty"}
              </span>
              <span className="sm:hidden">
                Clear Month
              </span>
            </button>

          </div>
        )}

        {/* Clear Month Confirmation Modal */}
        {showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md max-w-sm w-full mx-2">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-white">
                Confirm Deletion
              </h2>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-4 sm:mb-6">
                Are you sure you want to clear all on-call entries for{" "}
                <strong>{specialty}</strong>
                {specialty === SPECIALTIES.INTERNAL_MEDICINE && plan ? ` · ${plan}` : ""} for{" "}
                <strong>{getVisibleMonthLabel()}</strong>?
              </p>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => setShowClearModal(false)}
                  className="px-3 sm:px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white text-xs sm:text-sm rounded order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearConfirmed}
                  className="px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm rounded order-1 sm:order-2"
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
          secondPref={secondPref}
          secondPhone={secondPhone}
          secondSource={secondSource}
          coverEnabled={coverEnabled}
          editingEntry={editingEntry}
          currentProviderId={currentProviderId}
          loading={modalLoading}
          onClose={handleModalClose}
          onProviderSelect={handleProviderSelect}
          onDateSelect={handleDateSelect}
          onSecondPrefChange={setSecondPref}
          onCoverEnabledChange={setCoverEnabled}
          onProviderIdChange={setCurrentProviderId}
          coveringProviderId={coveringProviderId}
          onCoveringProviderIdChange={setCoveringProviderId}
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Schedule Entry</AlertDialogTitle>
              <AlertDialogDescription>
                {eventToDelete && (
                  <>
                    Are you sure you want to remove <strong>{eventToDelete.provider}</strong> from{" "}
                    <strong>
                      {new Date(eventToDelete.date + 'T12:00:00').toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </strong>?
                    <br />
                    <br />
                    This action cannot be undone.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEventToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmedDelete}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white"
              >
                Delete Entry
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </LayoutShell>
  );
}