'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useState, useEffect, useRef, useCallback, JSX } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import LayoutShell from '@/components/LayoutShell';
import { toast } from 'react-hot-toast';
const supabase = getBrowserClient();
import useUserRole from '@/app/hooks/useUserRole';
import { EventContentArg } from '@fullcalendar/core';
import React from 'react';
// Removed unused dayjs import
// import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// --- Provider search helpers: rank closest names ---
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

function levenshteinCapped(a: string, b: string, cap = 2): number {
  if (a === b) return 0;
  const la = a.length, lb = b.length;
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
      curr[jStart - 1] + 1
    );
    for (let j = jStart + 1; j <= jEnd; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,          // deletion
        curr[j - 1] + 1,      // insertion
        prev[j - 1] + cost    // substitution
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
  if (idx > 0 && /\W/.test(n[idx - 1] ?? '')) score += 300_000; // word-start
  // subsequence bonus
  let i = 0;
  for (const ch of n) if (ch === query[i]) i++;
  if (i === query.length) score += 100_000 - Math.max(0, n.length - query.length);
  const ed = levenshteinCapped(n, query, 2);
  if (ed <= 2) score += 50_000 - 10_000 * ed; // small typos
  score += Math.max(0, 10_000 - n.length); // shorter names slight boost
  return score;
}
// --- end provider search helpers ---


// Helper function to format dates as local ISO (YYYY-MM-DD) in local time
const toLocalISODate = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).toLocaleDateString('sv-SE');

// Local date helper to avoid UTC drift when handling YYYY-MM-DD strings
const parseLocalYMD = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m as number) - 1, d as number, 12, 0, 0, 0);
};

// Distinct color helpers and color map state
const getTextColorForBackground = (hex: string) => {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 255;
  const g = (rgb >> 8) & 255;
  const b = rgb & 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 186 ? 'black' : 'white';
};

const hslToHex = (h: number, s: number, l: number) => {
  // h in [0,360), s,l in [0,1]
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const generateDistinctColors = (count: number) => {
  // Golden-angle hue steps for maximum separation, fixed s/l for contrast
  const colors: string[] = [];
  const golden = 137.508; // degrees
  for (let i = 0; i < count; i++) {
    const h = (i * golden) % 360;
    const s = 0.60; // 60% saturation
    const l = 0.55; // 55% lightness
    colors.push(hslToHex(h, s, l));
  }
  return colors;
};



const plans = [
  'Triple S Advantage/Unattached',
  'Vital',
  '405/M88',
  'PAMG',
  'REMAS',
  'SMA',
  'CSE',
  'In Salud',
  'IPA B',
  'MCS',
];

export default function SchedulePage() {
  // access enforced by server layout & client role redirect
  // Specialties state and modal for admin editing
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyEditList, setSpecialtyEditList] = useState<{ name: string; show_oncall: boolean }[]>([]);
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);
  // Load specialties from Supabase, both for display and editing
  useEffect(() => {
    const fetchSpecialties = async () => {
      const { data, error } = await supabase
        .from('specialties')
        .select('name, show_oncall')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching specialties:', error);
        setSpecialties([]);
        setSpecialtyEditList([]);
      } else {
        const activeNames = data?.filter(s => s.show_oncall).map(s => s.name) ?? [];
        setSpecialties(activeNames);
        setSpecialtyEditList(data ?? []);
      }
    };
    fetchSpecialties();
  }, []);
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [providerColorMap, setProviderColorMap] = useState<Record<string, string>>({});
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null);
  const loadKeyRef = useRef(0);

  useEffect(() => {
  // Derive unique provider names from currently displayed events
  const names = Array.from(
    new Set(
      events
        .map((ev: { title: string; date: string }) =>
          typeof ev.title === 'string' ? ev.title.replace(/^Dr\. /, '').trim() : ''
        )
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
  const colors = generateDistinctColors(names.length);
  const map: Record<string, string> = {};
  names.forEach((name, i) => { map[name] = colors[i]; });
  setProviderColorMap(map);
}, [events]);

  const [specialty, setSpecialty] = useState('Internal Medicine');
  const [plan, setPlan] = useState('');
  const role = useUserRole(); // 'admin' | 'scheduler' | 'viewer' | null
  const canEdit = role === 'admin' || role === 'scheduler';
  const isIMWithoutPlan = specialty === 'Internal Medicine' && !plan; // NEW: gating flag
  const [isEditing, setIsEditing] = useState(false);
  // Collect pending entries to save to DB only when "Save Changes" is pressed
  const [pendingEntries, setPendingEntries] = useState<any[]>([]);
  const [pendingDeletions, setPendingDeletions] = useState<{ date: string; provider: string }[]>([]);
  // Modal state for clearing the month
  const [showClearModal, setShowClearModal] = useState(false);

  // Clear all entries for the current month for this specialty (and plan, if applicable), with confirmation modal
  const handleClearConfirmed = async () => {
      const { firstDay, firstDayNext } = getVisibleMonthRange();
      const monthLabel = getVisibleMonthLabel();

      if (specialty === 'Internal Medicine' && !plan) {
      toast.error('Select a healthcare plan to clear Internal Medicine for this month.');
      setShowClearModal(false);
      return;
      }

      const startOfMonth = toLocalISODate(firstDay);        // YYYY-MM-DD
      const startOfNextMonth = toLocalISODate(firstDayNext); // YYYY-MM-DD (exclusive)

      let deleteQuery = supabase
      .from('schedules')
      .delete({ count: 'exact' })
      .eq('specialty', specialty)
      .gte('on_call_date', startOfMonth)
      .lt('on_call_date', startOfNextMonth);

      if (specialty === 'Internal Medicine' && plan) {
        deleteQuery = deleteQuery.eq('healthcare_plan', plan);
      }

    const { error, count } = await deleteQuery;

      if (error) {
        console.error('Error clearing month:', error);
      toast.error('Failed to clear the month.');
      } else {
        toast.success(`Cleared ${count ?? 0} entr${(count ?? 0) === 1 ? 'y' : 'ies'} for ${monthLabel} — ${specialty === 'Internal Medicine' ? `IM · ${plan}` : specialty}.`);
        await refreshCalendarVisibleRange();
      }

  setShowClearModal(false);
  };

  // Route guard: if user lacks Scheduler/Admin access, redirect away
  useEffect(() => {
    if (role === null) return; // still checking
    if (role !== 'admin' && role !== 'scheduler') {
      router.replace('/unauthorized?from=/schedule');
    }
  }, [role, router]);
  // Supabase test effect
  useEffect(() => {
    supabase
      .from('directory')
      .select('provider_name')
      .then(({ data, error }: { data: any[] | null; error: Error | null }) => {
        if (error) {
          console.error('Supabase test error:', error);
        } else {
          console.log('Supabase test success. Providers:', data);
        }
      });
  }, []);
  useEffect(() => {
    const storedSpecialty = sessionStorage.getItem('specialty');
    const storedPlan = sessionStorage.getItem('plan');
    if (storedSpecialty) setSpecialty(storedSpecialty);
    if (storedPlan) setPlan(storedPlan);
  }, []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedModalDate, setSelectedModalDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [directory, setDirectory] = useState<any[]>([]);
  const providerInputRef = useRef<HTMLInputElement>(null);
  const [providerSuggestions, setProviderSuggestions] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const [allProvidersForSpec, setAllProvidersForSpec] = useState<string[]>([]);

  const [secondPref, setSecondPref] = useState<'none' | 'residency' | 'pa'>('none');
  const [secondPhone, setSecondPhone] = useState('');
  const [secondSource, setSecondSource] = useState<string | null>(null);

  const [selectedAdditionalDays, setSelectedAdditionalDays] = useState<string[]>([]);
  const [editingEntry, setEditingEntry] = useState<{
    provider_name: string;
    show_second_phone: boolean;
    second_phone_pref: 'auto' | 'pa' | 'residency';
  } | null>(null);

  // Add ref for FullCalendar
  const calendarRef = useRef<FullCalendar | null>(null);

  // Helpers to derive the visible month and label from FullCalendar
  const getVisibleMonthRange = useCallback(() => {
  const api = calendarRef.current?.getApi();
  if (api) {
    const firstDay = new Date(api.view.currentStart);
    const firstDayNext = new Date(api.view.currentEnd);
    firstDay.setHours(0,0,0,0);
    firstDayNext.setHours(0,0,0,0);
    return { firstDay, firstDayNext };
  }
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstDayNext = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  firstDay.setHours(0,0,0,0);
  firstDayNext.setHours(0,0,0,0);
  return { firstDay, firstDayNext };
}, []);

const getVisibleMonthLabel = useCallback(() => {
  const { firstDay } = getVisibleMonthRange();
  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  return `${monthNames[firstDay.getMonth()]} ${firstDay.getFullYear()}`;
}, [getVisibleMonthRange]);

  useEffect(() => {
    sessionStorage.setItem('specialty', specialty);
  }, [specialty]);

  useEffect(() => {
    sessionStorage.setItem('plan', plan);
  }, [plan]);


  // Handle clearEvent custom event to remove a schedule entry and update UI
  useEffect(() => {
    const handleClearEvent = (e: CustomEvent<{ date: string; provider: string }>) => {
      const { date, provider } = e.detail;
      setPendingDeletions(prev => [...prev, { date, provider }]);
      setEvents((prev: { date: string; title: string }[]) =>
        prev.filter((evt) => !(evt.date === date && evt.title === provider))
      );
      toast.success('Entry marked for deletion. Don’t forget to Save Changes.');
    };

    window.addEventListener('clearEvent', handleClearEvent as unknown as EventListener);
    return () => window.removeEventListener('clearEvent', handleClearEvent as unknown as EventListener);
  }, []);


  // Fetch events function, reusable and memoized
// Guarded loader: only the latest request applies
  const loadEvents = useCallback(async (
    range: { start: Date; end: Date },
    spec: string,
    hp: string
  ) => {
    const myKey = ++loadKeyRef.current;
    try {
      const startStr = toLocalISODate(range.start);
      const endStr = toLocalISODate(range.end);

      if (spec === 'Internal Medicine' && !hp) {
        const { data: directoryData, error: directoryError } = await supabase
          .from('directory')
          .select('provider_name, specialty, phone_number');

        if (loadKeyRef.current !== myKey) return;
        if (directoryError) console.error('Error fetching directory:', directoryError);

        setEvents([]);
        setDirectory(directoryData || []);
        setProviderColorMap({});
        return;
      }

      let query = supabase
        .from('schedules')
        .select('on_call_date, provider_name, specialty, healthcare_plan')
        .eq('specialty', spec)
        .gte('on_call_date', startStr)
        .lt('on_call_date', endStr);

      if (spec === 'Internal Medicine' && hp) {
        query = query.eq('healthcare_plan', hp);
      }

      const [
        { data: scheduleData, error: scheduleError },
        { data: directoryData, error: directoryError }
      ] = await Promise.all([
        query,
        supabase.from('directory').select('provider_name, specialty, phone_number')
      ]);

      if (loadKeyRef.current !== myKey) return;

      if (scheduleError) console.error('Error fetching events:', scheduleError);
      if (directoryError) console.error('Error fetching directory:', directoryError);

      const formattedEvents = (scheduleData ?? []).map(ev => ({
        title: `Dr. ${ev.provider_name}`,
        date: ev.on_call_date,
      }));

      setEvents(formattedEvents);
      setDirectory(directoryData || []);

      const names = Array.from(new Set((scheduleData ?? []).map(e => e.provider_name))).sort();
      const cols = generateDistinctColors(names.length);
      const m: Record<string, string> = {};
      names.forEach((n, i) => (m[n] = cols[i]));
      setProviderColorMap(m);
    } catch (err) {
      if (loadKeyRef.current !== myKey) return;
      console.error('Unexpected error during loadEvents:', err);
    }
  }, []);

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
  const handleSaveChanges = useCallback(async (source?: 'shortcut' | 'button') => {
    // Debug: Log pending entries before save
    console.log('Saving Changes – Pending Entries:', pendingEntries);
    if (pendingEntries.length === 0 && pendingDeletions.length === 0) {
      toast.success('No changes to save.');
      return;
    }

    // Handle deletions
    for (const del of pendingDeletions) {
      let deleteQuery = supabase
        .from('schedules')
        .delete()
        .eq('on_call_date', del.date)
        .eq('specialty', specialty)
        .eq('provider_name', del.provider.replace(/^Dr\. /, '').trim());

      if (specialty === 'Internal Medicine') {
        if (plan) {
          deleteQuery = deleteQuery.eq('healthcare_plan', plan);
        } else {
          deleteQuery = deleteQuery.is('healthcare_plan', null);
        }
      }

      const { error } = await deleteQuery;
      if (error) {
        console.error('Failed to delete entry:', error);
        toast.error('Failed to delete some entries.');
        return;
      }
    }

    // Upsert additions
    if (pendingEntries.length > 0) {
      // Fetch potentially conflicting entries from Supabase
      const datesToCheck = pendingEntries.map(e => e.on_call_date);

      let dupQuery = supabase
        .from('schedules')
        .select('on_call_date, provider_name, specialty, healthcare_plan, show_second_phone, second_phone_pref')
        .in('on_call_date', datesToCheck)
        .eq('specialty', specialty);

      if (specialty === 'Internal Medicine') {
        if (plan) {
          dupQuery = dupQuery.eq('healthcare_plan', plan);
        } else {
          dupQuery = dupQuery.is('healthcare_plan', null);
        }
      }

      const { data: existingRows, error: fetchDupError } = await dupQuery;

      if (fetchDupError) {
        console.error('Error fetching duplicates:', fetchDupError);
        toast.error('Could not check for existing entries.');
        return;
      }

      const existingKeys = new Set(
        existingRows?.map(row =>
          `${row.on_call_date}|${row.provider_name}|${row.specialty}|${row.healthcare_plan ?? ''}`
        )
      );

      const filteredPendingEntries = pendingEntries.filter(entry => {
        const key = `${entry.on_call_date}|${entry.provider_name}|${entry.specialty}|${entry.healthcare_plan ?? ''}`;
        const isEntryUpdated = existingRows?.some(row =>
          row.on_call_date === entry.on_call_date &&
          row.specialty === entry.specialty &&
          (row.healthcare_plan ?? '') === (entry.healthcare_plan ?? '') &&
          (
            row.provider_name !== entry.provider_name ||
            row.show_second_phone !== entry.show_second_phone ||
            (row.second_phone_pref ?? 'auto') !== (entry.second_phone_pref ?? 'auto')
          )
        );
        // If provider_name changed, queue deletion of old entry
        if (isEntryUpdated) {
          const oldRow = existingRows.find(row =>
            row.on_call_date === entry.on_call_date &&
            row.specialty === entry.specialty &&
            (row.healthcare_plan ?? '') === (entry.healthcare_plan ?? '') &&
            row.provider_name !== entry.provider_name
          );
          if (oldRow) {
            // Only push if not already in pendingDeletions
            const alreadyQueued = pendingDeletions.some(
              del =>
                del.date === oldRow.on_call_date &&
                del.provider === `Dr. ${oldRow.provider_name}`
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
          del =>
            del.date === entry.on_call_date &&
            del.provider === `Dr. ${entry.provider_name}`
        );
        return (!existingKeys.has(key) || isEntryUpdated) && !isPendingDeletion;
      });

      // Deduplicate the payload to prevent repeat insertions within the same batch
      const uniqueMap = new Map();
      for (const entry of filteredPendingEntries) {
        const key = `${entry.on_call_date}|${entry.provider_name}|${entry.specialty}|${entry.healthcare_plan ?? ''}`;
        uniqueMap.set(key, entry);
      }
      const dedupedEntries = Array.from(uniqueMap.values());

      if (dedupedEntries.length > 0) {
        const { error: upsertError } = await supabase
          .from('schedules')
          .upsert(dedupedEntries, {
            // Allow upsert to overwrite provider_name for same date/specialty/plan
            onConflict: 'on_call_date,specialty,healthcare_plan',
          });

        if (upsertError) {
          console.error('Failed to save entries:', upsertError);
          toast.error('Failed to save changes.');
          return;
        }
      }
    }

    if (source === 'shortcut') {
      toast.success('Saved with ⌘S/Ctrl+S');
    } else {
      toast.success('All changes saved successfully!');
    }
    await refreshCalendarVisibleRange();
    console.log('Finished saving. Resetting pending entries.');
    setPendingEntries([]);
    setPendingDeletions([]);
  }, [pendingEntries, pendingDeletions, specialty, plan, refreshCalendarVisibleRange]);

  // Global shortcut: Ctrl+S / Cmd+S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!canEdit) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        // Only enable the shortcut when the page (not the modal/dialog) has focus
        if (isModalOpen) return;
        // Optionally, avoid triggering while typing into inputs if desired:
        const ae = document.activeElement as HTMLElement | null;
        if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT' || ae.isContentEditable)) {
          // Allow save even when typing into page inputs if you prefer; currently we allow it
          // by not returning here. Comment out the next line to allow saving from inputs.
          // return;
        }
        e.preventDefault();
        handleSaveChanges('shortcut');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSaveChanges, isModalOpen, canEdit]);

  useEffect(() => {
  if (isModalOpen) {        
    const residencyName = `${specialty} Residency`;
    const paName = `${specialty} PA Phone`;

    if (secondPref === 'residency') {
      const resident = directory.find(d => d.provider_name === residencyName);
      if (resident?.phone_number) {
        setSecondPhone(resident.phone_number);
        setSecondSource(residencyName);
      } else {
        setSecondPhone('No residency phone registered for this service.');
        setSecondSource(null);
      }
    } else if (secondPref === 'pa') {
      const pa = directory.find(d => d.provider_name === paName);
      if (pa?.phone_number) {
        setSecondPhone(pa.phone_number);
        setSecondSource(paName);
      } else {
        setSecondPhone('No PA phone registered for this service.');
        setSecondSource(null);
      }
    } else {
      setSecondPhone('');
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
      const pref: 'none' | 'residency' | 'pa' =
        editingEntry.show_second_phone
          ? editingEntry.second_phone_pref === 'pa'
            ? 'pa'
            : editingEntry.second_phone_pref === 'residency'
              ? 'residency'
              : 'none'
          : 'none';
      setSecondPref(pref);
    }
  }, [isModalOpen, isEditing, editingEntry]);

useEffect(() => {
  const loadProvidersForSpecialty = async () => {
    if (!isModalOpen) return;
    const { data, error } = await supabase
      .from('directory')
      .select('provider_name')
      .eq('specialty', specialty)
      .not('provider_name', 'ilike', '%Residency%')
      .not('provider_name', 'ilike', '%PA Phone%')
      .order('provider_name', { ascending: true });

    if (error) {
      console.error('Error loading providers for specialty:', error);
      setAllProvidersForSpec([]);
      return;
    }
    const names = (data ?? []).map(d => d.provider_name);
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
      <div className="text-center mt-20 text-gray-500">Checking access...</div>
    </LayoutShell>
  );
}

if (role !== 'admin' && role !== 'scheduler') {
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

      {role === 'admin' && (
        <div className="flex items-center justify-end mb-4">
          <div className="flex gap-3 items-center">
            <button onClick={() => setShowSpecialtyModal(true)} className="px-3 py-1 text-sm bg-indigo-600 text-white rounded">
              Edit Specialties
            </button>
          </div>
          {/* Medical Groups buttons only for admin */}
          <div className="flex gap-3 items-center mt-2">
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
            <label className="block text-gray-700 dark:text-gray-300 mb-1">Specialty</label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:text-white dark:border-gray-600"
            >
              {specialties.map(spec => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {specialty === 'Internal Medicine' && (
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-1">Healthcare Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}

                className="px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:text-white dark:border-gray-600"
              >
                <option value="">-- Select a Plan --</option>
                {plans.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>


        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md" style={{ overflowX: 'auto' }}>
          {/* Control panel: Add Refresh Calendar button */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => refreshCalendarVisibleRange()}
              className={`bg-gray-700 hover:bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-600 shadow-sm flex items-center gap-2 ${isIMWithoutPlan ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isIMWithoutPlan}
            >
              🔄 <span>Refresh Calendar</span>
            </button>
          </div>
          <div className="relative">{/* wrapper to allow overlay */}
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={new Date()}
            headerToolbar={{
              left: 'prev',
              center: 'title currentMonth',
              right: 'next',
            }}
            customButtons={{
              currentMonth: {
                text: 'Current Month',
                click: () => {
                  const calendarApi = calendarRef.current?.getApi();
                  if (calendarApi) {
                    calendarApi.today();
                  }
                },
              },
            }}
            timeZone="local"
            events={events.map(e => ({ title: e.title, start: e.date, allDay: true }))}
            selectable={canEdit}
            editable={false}
            height="auto"
            dayCellClassNames={(arg) => {
              // Always apply dark border class
              const base = ['dark:!border-gray-600'];
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
                const currentProvider = event.event.title.replace(/^Dr\. /, '').trim();
                const bgColor = providerColorMap[currentProvider] ?? '#3B82F6';
                const textColor = getTextColorForBackground(bgColor);
                // Determine if this event is a saved entry (not pending)
                const isSavedEntry = !pendingEntries.some(
                  entry =>
                    entry.on_call_date === event.event.startStr &&
                    entry.provider_name === currentProvider
                );
                const opacityClass = isSavedEntry ? '' : 'opacity-50';
                return (
                  <div
                    className={`relative w-full px-1 py-0.5 rounded border transition-colors duration-200 hover:brightness-110 hover:shadow-md ${opacityClass}`}
                    style={{
                      backgroundColor: bgColor,
                      color: textColor,
                      borderColor: bgColor,
                      backgroundImage: 'none',
                    }}
                  >
                    <button
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const { startStr, title } = event.event;
                        const clearEvent = new CustomEvent('clearEvent', {
                          detail: { date: startStr, provider: title },
                        });
                        window.dispatchEvent(clearEvent);
                      }}
                      className="absolute top-0 right-0 text-xs px-1"
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
              if (isIMWithoutPlan) { toast.error('Select a healthcare plan first.'); return; } // NEW guard

              const api = calendarRef.current?.getApi();
              const view = api?.view;
              if (!view) return;

              // Parse the event date as LOCAL (avoid UTC shifting to previous day)
              const eventDate = parseLocalYMD(clickInfo.event.startStr);

              // Normalize all dates to 12:00 local to avoid boundary drift in comparisons
              const noon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
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
                    .from('schedules')
                    .select('provider_name, show_second_phone, second_phone_pref')
                    .eq('on_call_date', dateStr)
                    .eq('specialty', specialty)
                    .limit(1);

                  if (specialty === 'Internal Medicine') {
                    if (plan) {
                      q = q.eq('healthcare_plan', plan);
                    } else {
                      q = q.is('healthcare_plan', null);
                    }
                  }

                  const { data, error } = await q;
                  if (error) {
                    console.error('Error loading entry for edit:', error);
                  }

                  if (data && data[0]) {
                    setEditingEntry({
                      provider_name: data[0].provider_name,
                      show_second_phone: !!data[0].show_second_phone,
                      second_phone_pref: (data[0].second_phone_pref ?? 'auto') as 'auto' | 'pa' | 'residency',
                    });
                  } else {
                    const currentProvider = clickInfo.event.title.replace(/^Dr\. /, '').trim();
                    setEditingEntry({
                      provider_name: currentProvider,
                      show_second_phone: false,
                      second_phone_pref: 'auto',
                    });
                  }
                } catch (e) {
                  console.error('Unexpected error fetching entry for edit:', e);
                } finally {
                  setIsModalOpen(true);
                }
              })();
            }}
            dateClick={(info: any) => {
              if (!canEdit) return;
              if (isIMWithoutPlan) { toast.error('Select a healthcare plan first.'); return; } // NEW guard
              if (info.dayEl.classList.contains('fc-day-other')) {
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
              onClick={() => toast.error('Please select healthcare plan group before adding providers on call')}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md cursor-not-allowed text-center px-6 py-8 pointer-events-auto"
              style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
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
            <button onClick={() => {
              if (isIMWithoutPlan) { toast.error('Select a healthcare plan first.'); return; }
              setShowClearModal(true);
            }} className={`px-4 py-2 rounded text-white ${isIMWithoutPlan ? 'bg-red-400 cursor-not-allowed opacity-60' : 'bg-red-600 hover:bg-red-700'}`}
              disabled={isIMWithoutPlan}>
              {`Clear ${getVisibleMonthLabel()} — ${specialty === 'Internal Medicine' ? `IM · ${plan || 'Select plan'}` : specialty}`}
            </button>
            <button onClick={() => {
              if (isIMWithoutPlan) { toast.error('Select a healthcare plan first.'); return; }
              handleSaveChanges('button');
            }} className={`px-4 py-2 rounded text-white ${isIMWithoutPlan ? 'bg-green-400 cursor-not-allowed opacity-60' : 'bg-green-600 hover:bg-green-700'}`}
              disabled={isIMWithoutPlan}>
              Save Changes
            </button>
          </div>
        )}

        {/* Clear Month Confirmation Modal */}
        {canEdit && showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300 ease-out">
            <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md max-w-sm w-full transform transition-transform duration-300 ease-out scale-95 animate-fadeIn">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Confirm Deletion</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
                  Are you sure you want to clear all on-call entries for <strong>{specialty}</strong>
                  {specialty === 'Internal Medicine' && plan ? ` · ${plan}` : ''} for <strong>{getVisibleMonthLabel()}</strong>?
                </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowClearModal(false)}
                  className="px-3 py-1.5 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white text-sm rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearConfirmed}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded"
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
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out ${isModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={(e) => {
            if ((e.target as HTMLElement).id === 'provider-modal') {
              setIsModalOpen(false);
              if (providerInputRef.current) {
                providerInputRef.current.value = '';
              }
              setProviderSuggestions([]);
              setHighlightIndex(-1);
              setSecondPref('none');
              setSecondPhone('');
              setSecondSource(null);
              setSelectedAdditionalDays([]);
              setEditingEntry(null);
              // Hide the multi-day calendar when modal is closed
              const miniCalendar = document.getElementById('multi-day-calendar');
              if (miniCalendar) miniCalendar.classList.add('hidden');
            }
          }}
        >
          <div className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md transition-transform duration-300 ease-in-out transform ${isModalOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'}`}>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              {isEditing ? 'Edit On-Call Entry' : 'Add On-Call Entry'}
            </h2>
            {/* Show editing date */}
            {selectedModalDate && (() => {
              const [y, m, d] = selectedModalDate.split('-').map(Number);
              const localDate = new Date(y, m - 1, d);
              return <p className="text-sm text-gray-600 mb-2">Selected Date: {localDate.toLocaleDateString()}</p>;
            })()}
            {isEditing && (
              <span className="inline-block px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded dark:bg-yellow-200 dark:text-yellow-900 mb-2">
                Editing Existing Entry
              </span>
            )}
            <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">Provider Name</label>
            <input
              type="text"
              id="provider-name"
              ref={providerInputRef}
              className="w-full px-3 py-2 mb-1 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600"
              placeholder="Start typing..."
              onFocus={() => {
                const val = providerInputRef.current?.value.trim().toLowerCase() ?? '';
                if (!val) {
                  setProviderSuggestions(allProvidersForSpec);
                  setHighlightIndex(allProvidersForSpec.length ? 0 : -1);
                }
              }}
              onChange={(e) => {
                const query = e.target.value;
                const qn = normalize(query);
                if (!qn) {
                  setProviderSuggestions(allProvidersForSpec);
                  setHighlightIndex(allProvidersForSpec.length ? 0 : -1);
                  return;
                }
                const ranked = allProvidersForSpec
                  .map((name) => ({ name, score: scoreName(name, qn) }))
                  .filter((x) => x.score > 0)
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 12)
                  .map((x) => x.name);
                setProviderSuggestions(ranked.length ? ranked : ['This provider is not in the directory']);
                setHighlightIndex(ranked.length ? 0 : -1);
              }}
              onKeyDown={(e) => {
                const count = providerSuggestions.length;
                if (!count) return;

                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlightIndex((prev) => (prev < count - 1 ? prev + 1 : 0));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlightIndex((prev) => (prev > 0 ? prev - 1 : count - 1));
                } else if (e.key === 'Enter') {
                  const sel =
                    highlightIndex >= 0 && highlightIndex < count
                      ? providerSuggestions[highlightIndex]
                      : providerSuggestions[0];
                  if (sel && sel !== 'This provider is not in the directory') {
                    e.preventDefault();
                    if (providerInputRef.current) providerInputRef.current.value = sel;
                    setProviderSuggestions([]);
                    setHighlightIndex(-1);
                  }
                } else if (e.key === 'Tab') {
                  const sel =
                    highlightIndex >= 0 && highlightIndex < count
                      ? providerSuggestions[highlightIndex]
                      : providerSuggestions[0];
                  if (sel && sel !== 'This provider is not in the directory') {
                    e.preventDefault();
                    if (providerInputRef.current) providerInputRef.current.value = sel;
                    setProviderSuggestions([]);
                    setHighlightIndex(-1);
                    // Move focus to the first "Works with" radio
                    const firstRadio = document.querySelector<HTMLInputElement>('input[name="second-pref"]');
                    if (firstRadio) firstRadio.focus();
                  }
                } else if (e.key === 'Escape') {
                  setProviderSuggestions([]);
                  setHighlightIndex(-1);
                }
              }}
            />
            <div
              className="bg-white border dark:bg-gray-800 dark:border-gray-600 border-gray-300 rounded shadow-md max-h-40 overflow-y-auto"
              role="listbox"
            >
              {providerSuggestions.map((name, idx) => {
                const isActive = idx === highlightIndex;
                return (
                  <div
                    key={idx}
                    role="option"
                    aria-selected={isActive}
                    className={`px-3 py-1 cursor-pointer text-sm text-gray-800 dark:text-white ${
                      isActive ? 'bg-gray-100 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onMouseLeave={() => setHighlightIndex(-1)}
                    onClick={() => {
                      if (name === 'This provider is not in the directory') return;
                      if (providerInputRef.current) {
                        providerInputRef.current.value = name;
                      }
                      setProviderSuggestions([]);
                      setHighlightIndex(-1);
                    }}
                  >
                    {name}
                  </div>
                );
              })}
            </div>  
            <div className="mb-4">
              <span className="block mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Works with:</span>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="second-pref"
                    value="none"
                    checked={secondPref === 'none'}
                    onChange={() => setSecondPref('none')}
                  />
                  None
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="second-pref"
                    value="residency"
                    checked={secondPref === 'residency'}
                    onChange={() => setSecondPref('residency')}
                  />
                  Resident
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="second-pref"
                    value="pa"
                    checked={secondPref === 'pa'}
                    onChange={() => setSecondPref('pa')}
                  />
                  PA
                </label>
              </div>
            </div>
            {secondPref !== 'none' && (
              <div className="mb-4" id="second-phone-container">
                <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">Second Phone</label>
                {secondPhone && secondPhone.startsWith('No ') ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{secondPhone}</p>
                ) : (
                  <input
                    type="text"
                    id="second-phone"
                    value={secondPhone}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    readOnly
                  />
                )}
                {secondSource && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Source: {secondSource}</p>
                )}
              </div>
            )}
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="multi-day-toggle"
                className="mr-2"
                onChange={(e) => {
                  const miniCalendar = document.getElementById('multi-day-calendar');
                  if (miniCalendar) {
                    miniCalendar.classList.toggle('hidden', !e.target.checked);
                  }
                }}
              />
              <label htmlFor="multi-day-toggle" className="text-sm text-gray-700 dark:text-gray-300">Assign to Multiple Days</label>
            </div>
              <div className="mb-4 hidden" id="multi-day-calendar">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Select additional days:</p>
                {/* MiniCalendar - synchronized to current main calendar month */}
                <MiniCalendar initialDate={currentDate} />
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-400">
                  {(() => {
                    // Use parseLocalYMD to avoid UTC drift
                    const base = selectedModalDate
                      ? parseLocalYMD(selectedModalDate)
                      : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 12, 0, 0, 0);
                    const year = base.getFullYear();
                    const month = base.getMonth();
                    const firstDayOfMonth = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const calendarCells: JSX.Element[] = [];

                    // Utility functions for day status
                    const getProviderInputValue = () =>
                      providerInputRef.current?.value?.trim() ?? '';
                    // For each day, determine assignment status
                    function getDayStatus(dateStr: string) {
                      // Use direct string comparison for assigned events
                      const assignedEvents = events.filter(e => e.date === dateStr);
                      const provider = getProviderInputValue();
                      const isAssigned = assignedEvents.length > 0;
                      const isAssignedToCurrentProvider = assignedEvents.some(
                        e => e.title === `Dr. ${provider}`
                      );
                      const isAssignedToOtherProvider = isAssigned && !isAssignedToCurrentProvider;
                      const isSelected = selectedAdditionalDays.includes(dateStr);
                      // Use direct string comparison for primary date
                      const isPrimaryDate = selectedModalDate ? (dateStr === selectedModalDate) : false;
                      return {
                        isAssigned,
                        isAssignedToCurrentProvider,
                        isAssignedToOtherProvider,
                        isSelected,
                        isPrimaryDate,
                      };
                    }

                    for (let i = 0; i < firstDayOfMonth; i++) {
                      calendarCells.push(<div key={`empty-${i}`} className="p-1" />);
                    }

                    for (let day = 1; day <= daysInMonth; day++) {
                      // --- REWORKED MINI CALENDAR ---
                      const localDate = new Date(year, month, day);
                      const dateStr = localDate.toLocaleDateString('en-CA'); // Format: YYYY-MM-DD
                      const status = getDayStatus(dateStr);
                      // Compose className per requirements, using selected-mini-day for selected days
                      let cellClasses = 'p-1 rounded text-sm text-center calendar-day mini-calendar-day ';
                      if (status.isPrimaryDate) {
                        cellClasses += 'bg-green-500 text-white font-semibold ';
                      } else if (status.isAssignedToCurrentProvider) {
                        cellClasses += 'bg-blue-500 text-white font-semibold ';
                      } else if (status.isAssignedToOtherProvider) {
                        cellClasses += 'bg-gray-400 text-white font-semibold pointer-events-none ';
                      } else if (status.isSelected) {
                        cellClasses += 'selected-mini-day font-semibold ';
                      } else {
                        cellClasses += 'hover:bg-blue-100 dark:hover:bg-blue-600 cursor-pointer ';
                      }
                      calendarCells.push(
                        <div
                          key={day}
                          data-date={dateStr}
                          className={cellClasses}
                          style={
                            status.isAssignedToOtherProvider
                              ? { pointerEvents: 'none', opacity: 0.7 }
                              : undefined
                          }
                          onClick={() => {
                            // If assigned to other provider, do nothing (should be blocked by pointer-events)
                            if (status.isAssignedToOtherProvider) return;
                            // If assigned to current provider, toggle assignment (remove on second click)
                            if (status.isAssignedToCurrentProvider) {
                              setEvents(prev =>
                                prev.filter(
                                  e =>
                                    !(
                                      e.date === dateStr &&
                                      e.title === `Dr. ${modalProvider.provider_name}`
                                    )
                                )
                              );
                              setPendingDeletions(prev => [
                                ...prev,
                                {
                                  date: dateStr,
                                  provider: `Dr. ${modalProvider.provider_name}`,
                                },
                              ]);
                              setSelectedAdditionalDays(prev =>
                                prev.filter(d => d !== dateStr)
                              );
                              return;
                            }
                            // If primary date, do nothing (cannot deselect)
                            if (status.isPrimaryDate) return;
                            // --- Begin: New logic for small calendar selection ---
                            if (!canEdit) return;
                            // We need to add a new pending entry for this date using current modal selections
                            // Find modalProvider, modalSpecialty, modalHealthcarePlan, isResident from modal state
                            // We'll try to infer these from the modal controls
                            const providerName = getProviderInputValue();
                            const modalProvider = directory.find(d => d.provider_name === providerName);
                            const modalSpecialty = specialty;
                            const modalHealthcarePlan = specialty === 'Internal Medicine' ? plan : null;
                            // Use showResident as isResident
                            const isSecond = secondPref !== 'none';
                            // (removed debug logging)
                            if (modalProvider && modalSpecialty && (modalHealthcarePlan !== undefined)) {
                              const alreadySelected = pendingEntries.some(
                                (entry) =>
                                  entry.on_call_date === dateStr &&
                                  entry.provider_name === modalProvider.provider_name
                              );
                              if (!alreadySelected) {
                                const newEntry = {
                                  on_call_date: dateStr,
                                  provider_name: modalProvider.provider_name,
                                  specialty: modalSpecialty,
                                  healthcare_plan: modalHealthcarePlan,
                                  show_second_phone: isSecond,
                                  second_phone_pref: secondPref === 'pa' ? 'pa' : (secondPref === 'residency' ? 'residency' : 'auto'),
                                } as const;
                                setPendingEntries(prev => [...prev, newEntry]);
                                setEvents(prevEvents => {
                                  const exists = prevEvents.some(e => e.title === `Dr. ${modalProvider.provider_name}` && e.date === dateStr);
                                  if (exists) return prevEvents;
                                  return [
                                    ...prevEvents,
                                    {
                                      title: `Dr. ${modalProvider.provider_name}`,
                                      date: dateStr,
                                    }
                                  ];
                                });
                              }
                            }
                            // --- End: New logic for small calendar selection ---
                            // Toggle selection for additional days
                            setSelectedAdditionalDays(prev =>
                              prev.includes(dateStr)
                                ? prev.filter(d => d !== dateStr)
                                : [...prev, dateStr]
                            );
                          }}
                        >
                          {day}
                        </div>
                      );
                    }
                    return calendarCells;
                  })()}
                </div>
                {/* Mini calendar selected day highlight style */}
                <style jsx>{`
                  .selected-mini-day {
                    background-color: #e8fcec !important;
                    border-radius: 4px;
                    color: black;
                  }
                `}</style>
              </div>
            <div className="flex justify-end space-x-2">
              <button
                className="px-3 py-1.5 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white text-sm rounded"
                id="cancel-btn"
                onClick={() => {
                  setIsModalOpen(false);
                  if (providerInputRef.current) {
                    providerInputRef.current.value = '';
                  }
                  setProviderSuggestions([]);
                  setHighlightIndex(-1);
                  setSecondPref('none');
                  setSecondPhone('');
                  setSecondSource(null);
                  setSelectedAdditionalDays([]);
                  setEditingEntry(null);
                  // Hide the multi-day calendar when modal is closed
                  const miniCalendar = document.getElementById('multi-day-calendar');
                  if (miniCalendar) miniCalendar.classList.add('hidden');
                  const multiDayToggle = document.getElementById('multi-day-toggle') as HTMLInputElement;
                  if (multiDayToggle) multiDayToggle.checked = false;
                }}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded"
                id="save-btn"
                onClick={async () => {
                  if (isIMWithoutPlan) { toast.error('Select a healthcare plan first.'); return; } // guard inside modal save just in case
                  const inputEl = providerInputRef.current;
                  const providerName = inputEl ? inputEl.value.trim() : '';
                  if (!providerName) {
                    alert('Please select a provider to store these dates.');
                    return;
                  }

                  // Confirmation step if editing and provider name changed
                  // Validate provider name exists in directory
                  const matchedProvider = directory.find(d => d.provider_name === providerName);
                  if (isEditing && providerName !== matchedProvider?.provider_name) {
                    const confirmed = window.confirm(`You are about to replace "${matchedProvider?.provider_name}" with "${providerName}" on this date. This will delete the existing entry and insert a new one. Proceed?`);
                    if (!confirmed) return;
                  }
                  if (!matchedProvider) {
                    alert('This provider is not in the directory.');
                    return;
                  }

                  const {
                    data: { user },
                  } = await supabase.auth.getUser();

                  if (!user) {
                    alert("You must be logged in to make changes.");
                    return;
                  }

                  // Use local YYYY-MM-DD strings directly for uniqueDates
                  const uniqueDates = Array.from(new Set([...(selectedModalDate ? [selectedModalDate] : []), ...selectedAdditionalDays]));
                  // Ensure at least the primary date is included
                  if (uniqueDates.length === 0 && selectedModalDate) {
                    uniqueDates.push(selectedModalDate);
                  }

                  // Add type annotation for schedule entry payload
                  type ScheduleEntry = {
                    provider_name: string;
                    specialty: string;
                    healthcare_plan: string | null;
                    on_call_date: string;
                    show_second_phone: boolean;
                    second_phone_pref: 'auto' | 'pa' | 'residency';
                    user_id: string;
                  };
                  const payload: ScheduleEntry[] = uniqueDates.map(date => ({
                    provider_name: providerName,
                    specialty,
                    healthcare_plan: specialty === 'Internal Medicine' ? plan : null,
                    on_call_date: date,
                    show_second_phone: secondPref !== 'none',
                    second_phone_pref: secondPref === 'pa' ? 'pa' : (secondPref === 'residency' ? 'residency' : 'auto'),
                    user_id: user.id, // Assumes 'user_id' column exists in your table
                  }));

                  // Instead of saving to supabase, collect in pendingEntries (deduped)
                  setPendingEntries(prev => {
                    const combined = [...prev, ...payload];
                    const seen = new Set<string>();
                    return combined.filter(pe => {
                      const key = `${pe.provider_name}-${pe.on_call_date}-${pe.specialty}`;
                      if (seen.has(key)) return false;
                      seen.add(key);
                      return true;
                    });
                  });
                  // Immediately update calendar with pending entries (deduped)
                  setEvents(prevEvents => {
                    const newEvents = payload.map(entry => ({
                      title: `Dr. ${entry.provider_name}`,
                      date: entry.on_call_date,
                    }));
                    const combined = [...prevEvents, ...newEvents];
                    const seen = new Set<string>();
                    return combined.filter(ev => {
                      const key = `${ev.title}-${ev.date}`;
                      if (seen.has(key)) return false;
                      seen.add(key);
                      return true;
                    });
                  });

                  setIsModalOpen(false);
                  if (providerInputRef.current) {
                    providerInputRef.current.value = '';
                  }
                  setProviderSuggestions([]);
                  setHighlightIndex(-1);
                  setSecondPref('none');
                  setSecondPhone('');
                  setSecondSource(null);
                  setSelectedAdditionalDays([]);
                  setEditingEntry(null);
                  const miniCalendar = document.getElementById('multi-day-calendar');
                  if (miniCalendar) miniCalendar.classList.add('hidden');
                  const multiDayToggle = document.getElementById('multi-day-toggle') as HTMLInputElement;
                  if (multiDayToggle) multiDayToggle.checked = false;
                }}
              >
                {isEditing ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Specialty Edit Modal for admins */}
      {showSpecialtyModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => {
            if ((e.target as HTMLElement).id === 'specialty-modal') {
              setShowSpecialtyModal(false);
            }
          }}
          id="specialty-modal"
        >
          <div
            className="relative bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSpecialtyModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Edit Visible Specialties</h2>
            <ul className="space-y-2">
              {specialtyEditList.map((s, i) => (
                <li key={s.name} className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-white">{s.name}</span>
                  <button
                    className={`px-2 py-1 text-sm rounded ${s.show_oncall ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}
                    onClick={async () => {
                      const updated = [...specialtyEditList];
                      updated[i] = { ...updated[i], show_oncall: !updated[i].show_oncall };
                      setSpecialtyEditList(updated);
                      const { error } = await supabase
                        .from('specialties')
                        .update({ show_oncall: updated[i].show_oncall })
                        .eq('name', updated[i].name);
                      if (error) {
                        console.error('Failed to update show_oncall:', error);
                      } else {
                        const active = updated.filter(s => s.show_oncall).map(s => s.name);
                        setSpecialties(active);
                      }
                    }}
                  >
                    {s.show_oncall ? 'Yes' : 'No'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </LayoutShell>
  );
}

// Dummy MiniCalendar component for demonstration. Replace with your actual MiniCalendar import.
function MiniCalendar({ initialDate: _initialDate }: { initialDate: Date }) {
  // Removed unused currentMonth variable
  return null;
}