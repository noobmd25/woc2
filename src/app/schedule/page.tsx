'use client';

// Helper function to format dates as local ISO (YYYY-MM-DD) in local time
const toLocalISODate = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).toLocaleDateString('sv-SE');

// Local date helper to avoid UTC drift when handling YYYY-MM-DD strings
const parseLocalYMD = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m as number) - 1, d as number, 12, 0, 0, 0);
};

// Color palette and color helper functions
const colorPalette = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1', '#F97316',
  '#14B8A6', '#0EA5E9', '#D946EF', '#22C55E'
];

const getTextColorForBackground = (hex: string) => {
  // Calculate luminance to determine appropriate text color
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 255;
  const g = (rgb >> 8) & 255;
  const b = rgb & 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 186 ? 'black' : 'white';
};

const getColorForProvider = (providerName: string) => {
  let hash = 0;
  for (let i = 0; i < providerName.length; i++) {
    hash = providerName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
};

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useState, useEffect, useRef, useCallback, JSX } from 'react';
import { supabase } from '@/lib/supabaseClient';
import LayoutShell from '@/components/LayoutShell';
import { toast } from 'react-hot-toast';
import useSchedulerAccess from '@/app/hooks/useSchedulerAccess';
import { EventClickArg, EventContentArg } from '@fullcalendar/core';
import React from 'react';
import dayjs from 'dayjs';

const specialties = [
  'Cardiology',
  'Gastroenterology',
  'General Surgery',
  'Internal Medicine',
  'Obstetrics & Gynecology',
  'Orthopedics',
  'Pediatric Surgery',
  'Vascular Surgery',
];

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
  const [events, setEvents] = useState<any[]>([]);
  const [specialty, setSpecialty] = useState('Internal Medicine');
  const [plan, setPlan] = useState('');
  const hasAccess = useSchedulerAccess();
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

  const [residentPhone, setResidentPhone] = useState('');
  const [showResident, setShowResident] = useState(false);
  const [showPA, setShowPA] = useState(false);

  const [selectedAdditionalDays, setSelectedAdditionalDays] = useState<string[]>([]);

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
  const fetchEvents = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      const startStr = toLocalISODate(startDate); // 'YYYY-MM-DD'
      const endStr = toLocalISODate(endDate);     // exclusive upper bound

      // Guard: For Internal Medicine, require a selected healthcare plan to render events
      if (specialty === 'Internal Medicine' && !plan) {
        // Still refresh the directory for autocomplete even if we're not showing events
        const { data: directoryData, error: directoryError } = await supabase
          .from('directory')
          .select('provider_name, specialty, phone_number');

        if (directoryError) {
          console.error('Error fetching directory:', directoryError);
        }

        setEvents([]); // do not render any Internal Medicine events without a plan selected
        setDirectory(directoryData || []);
        return; // skip querying schedules entirely
      }

      let query = supabase
        .from('schedules')
        .select('on_call_date, provider_name, specialty, healthcare_plan')
        .eq('specialty', specialty)
        .gte('on_call_date', startStr)
        .lt('on_call_date', endStr);

      if (specialty === 'Internal Medicine' && plan) {
        query = query.eq('healthcare_plan', plan);
      }

      const [{ data: scheduleData, error: scheduleError }, { data: directoryData, error: directoryError }] = await Promise.all([
        query,
        supabase.from('directory').select('provider_name, specialty, phone_number')
      ]);

      if (scheduleError) {
        console.error('Error fetching events:', scheduleError);
        return;
      }

      if (directoryError) {
        console.error('Error fetching directory:', directoryError);
      }

      const formattedEvents = scheduleData?.map(event => ({
        title: `Dr. ${event.provider_name}`,
        date: event.on_call_date, // keep as YYYY-MM-DD string
      })) || [];

      setEvents(formattedEvents);
      setDirectory(directoryData || []);
    } catch (err) {
      console.error("Unexpected error during fetchEvents:", err);
    }
  }, [specialty, plan]);

  // Reusable helper to refresh the current visible range of the main calendar and reload events
  const refreshCalendarVisibleRange = useCallback(async () => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const start = new Date(api.view.currentStart);
    const end = new Date(api.view.currentEnd);
    await fetchEvents(start, end);
    api.refetchEvents();
  }, [fetchEvents]);

  // Trigger refresh whenever specialty or plan changes
  useEffect(() => {
    refreshCalendarVisibleRange();
  }, [specialty, plan, refreshCalendarVisibleRange]);

  useEffect(() => {
    if (isModalOpen) {
      const residencyName = `${specialty} Residency`;
      const resident = directory.find(d => d.provider_name === residencyName);
      const pa = directory.find(d => d.provider_name.toLowerCase().includes('pa'));
      if (showResident && resident?.phone_number) {
        setResidentPhone(resident.phone_number);
      } else if (showPA && pa?.phone_number) {
        setResidentPhone(pa.phone_number);
      } else {
        setResidentPhone('No residency or PA phone registered for this service.');
      }

      // Auto-focus provider input
      if (providerInputRef.current) {
        providerInputRef.current.focus();
      }
    }
  }, [isModalOpen, showResident, showPA, specialty, directory]);

  if (hasAccess === false) {
    return (
      <LayoutShell>
        <div className="text-center mt-20 text-red-500">
          You do not have permission to view or modify the scheduler.
        </div>
      </LayoutShell>
    );
  }

  if (hasAccess === null) {
    return (
      <LayoutShell>
        <div className="text-center mt-20 text-gray-500">
          Checking access...
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="app-container px-4 py-6">
        <h1 className="text-2xl font-bold mb-4 text-center text-gray-800 dark:text-white">
          Scheduler
        </h1>

        <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4 mb-6">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-1">Specialty</label>
            <select
              value={specialty}
              onChange={async e => {
                setSpecialty(e.target.value);
                // refresh after state update microtask
                setTimeout(() => { refreshCalendarVisibleRange(); }, 0);
              }}
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
                onChange={async e => {
                  setPlan(e.target.value);
                  setTimeout(() => { refreshCalendarVisibleRange(); }, 0);
                }}
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
            selectable={true}
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
              fetchEvents(start, end);
            }}
            eventContent={(event: EventContentArg) => {
              try {
                const currentProvider = event.event.title.replace(/^Dr\. /, '').trim();
                const bgColor = getColorForProvider(currentProvider);
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
              const calendarApi = calendarRef.current?.getApi();
              const viewDate = calendarApi?.getDate();
              if (!viewDate) return;
              const eventDate = new Date(clickInfo.event.startStr);
              const isInCurrentMonth =
                eventDate.getMonth() === viewDate.getMonth() &&
                eventDate.getFullYear() === viewDate.getFullYear();
              if (!isInCurrentMonth) return;
              setSelectedModalDate(clickInfo.event.startStr);
              setIsEditing(true);
              setIsModalOpen(true);
            }}
            dateClick={(info: any) => {
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
          {/* Global CSS to paint days outside current month black and unclickable */}
          <style jsx global>{`
            .fc-daygrid-day.fc-day-other {
              pointer-events: none;
              background-color: black;
              color: white;
            }
          `}</style>
        </div>

        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setShowClearModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
              {`Clear ${getVisibleMonthLabel()} — ${specialty === 'Internal Medicine' ? `IM · ${plan || 'Select plan'}` : specialty}`}
          </button>
          <button
            onClick={async () => {
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
                  .select('on_call_date, provider_name, specialty, healthcare_plan, show_second_phone')
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
                      row.show_second_phone !== entry.show_second_phone
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

              toast.success('All changes saved successfully!');
              // Use the helper to refresh the current visible range and reload events
              await refreshCalendarVisibleRange();
              // Debug: Log before resetting pending entries
              console.log('Finished saving. Resetting pending entries.');
              setPendingEntries([]);
              setPendingDeletions([]);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Save Changes
          </button>
        </div>

        {/* Clear Month Confirmation Modal */}
        {showClearModal && (
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
              setShowResident(false);
              setResidentPhone('');
              setSelectedAdditionalDays([]);
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
              onChange={async (e) => {
                const query = e.target.value.toLowerCase().trim();
                if (!query) {
                  setProviderSuggestions([]);
                  return;
                }

                const { data, error } = await supabase
                  .from('directory')
                  .select('provider_name')
                  .ilike('provider_name', `%${query}%`)
                  .eq('specialty', specialty);

                if (error) {
                  console.error('Error fetching suggestions:', error);
                  setProviderSuggestions([]);
                  return;
                }

                if (data.length === 0) {
                  setProviderSuggestions(['This provider is not in the directory']);
                } else {
                  setProviderSuggestions(data.map(d => d.provider_name));
                }
              }}
            />
            <div className="bg-white border dark:bg-gray-800 dark:border-gray-600 border-gray-300 rounded shadow-md max-h-40 overflow-y-auto">
              {providerSuggestions.map((name, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-800 dark:text-white"
                  onClick={() => {
                    if (providerInputRef.current) {
                      providerInputRef.current.value = name;
                    }
                    setProviderSuggestions([]);
                  }}
                >
                  {name}
                </div>
              ))}
            </div>
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="show-resident"
                className="mr-2"
                checked={showResident}
                onChange={() => {
                  setShowResident(prev => !prev);
                  if (!showResident) setShowPA(false); // prevent both being selected
                }}
              />
              <label htmlFor="show-resident" className="text-sm text-gray-700 dark:text-gray-300">Show Resident Phone</label>
            </div>
            {specialty === 'Internal Medicine' && (
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="show-pa"
                  className="mr-2"
                  checked={showPA}
                  onChange={() => {
                    setShowPA(prev => !prev);
                    if (!showPA) setShowResident(false); // prevent both being selected
                  }}
                />
                <label htmlFor="show-pa" className="text-sm text-gray-700 dark:text-gray-300">Show PA Phone</label>
              </div>
            )}
            {(showResident || showPA) && (
              <div className="mb-4" id="resident-phone-container">
                <label className="block mb-2 text-sm text-gray-600 dark:text-gray-300">Resident Phone</label>
                {residentPhone.startsWith('No ') ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{residentPhone}</p>
                ) : (
                  <input
                    type="text"
                    id="resident-phone"
                    value={residentPhone}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    readOnly
                  />
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

                    // Type-safe function for day cell className (for possible future use)
                    const dayStyles = (date: Date): string => {
                      // Example: highlight today, weekends, etc.
                      // For now, return empty string (customize as needed)
                      return '';
                    };

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
                                      e.title === `Dr. ${getProviderInputValue()}`
                                    )
                                )
                              );
                              setPendingDeletions(prev => [
                                ...prev,
                                {
                                  date: dateStr,
                                  provider: `Dr. ${getProviderInputValue()}`,
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
                            // We need to add a new pending entry for this date using current modal selections
                            // Find modalProvider, modalSpecialty, modalHealthcarePlan, isResident from modal state
                            // We'll try to infer these from the modal controls
                            const providerName = getProviderInputValue();
                            const modalProvider = directory.find(d => d.provider_name === providerName);
                            const modalSpecialty = specialty;
                            const modalHealthcarePlan = specialty === 'Internal Medicine' ? plan : null;
                            // Use showResident as isResident
                            const isResident = showResident || showPA;
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
                                  show_second_phone: isResident,
                                };
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
                  setShowResident(false);
                  setShowPA(false);
                  setResidentPhone('');
                  setSelectedAdditionalDays([]);
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
                    error: userError
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
                    user_id: string;
                  };
                  const payload: ScheduleEntry[] = uniqueDates.map(date => ({
                    provider_name: providerName,
                    specialty,
                    healthcare_plan: specialty === 'Internal Medicine' ? plan : null,
                    on_call_date: date,
                    show_second_phone: showResident || showPA,
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
                  setShowResident(false);
                  setShowPA(false);
                  setResidentPhone('');
                  setSelectedAdditionalDays([]);
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
    </LayoutShell>
  );
}

// Dummy MiniCalendar component for demonstration. Replace with your actual MiniCalendar import.
function MiniCalendar({ initialDate }: { initialDate: Date }) {
  // Use the current month based on initialDate, not next month
  const currentMonth = dayjs(initialDate);
  // Use currentMonth as the reference for generating the mini calendar grid
  // This is a placeholder. Replace with your actual MiniCalendar implementation or import.
  return null;
}