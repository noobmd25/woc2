"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { memo, useMemo, useRef } from "react";

import {
  type MiniCalendarEvent,
  type PendingEntry,
  toLocalISODate,
} from "@/lib/schedule-utils";

interface MiniCalendarProps {
  selectedModalDate: string | null;
  selectedAdditionalDays: string[];
  miniCalendarDate: Date;
  miniCalendarEvents: MiniCalendarEvent[];
  pendingEntries: PendingEntry[];
  specialty: string;
  plan: string | null;
  providerName: string;
  onDateSelect: (dateStr: string) => void;
}

const MiniCalendar = memo(
  ({
    selectedModalDate,
    selectedAdditionalDays,
    miniCalendarDate,
    miniCalendarEvents,
    pendingEntries,
    specialty,
    plan,
    providerName,
    onDateSelect,
  }: MiniCalendarProps) => {
    const miniCalendarRef = useRef<FullCalendar | null>(null);

    // Memoized validRange for mini calendar to prevent re-renders
    const miniCalendarValidRange = useMemo(() => {
      if (!selectedModalDate) return undefined;
      const primaryDate = new Date(selectedModalDate + "T12:00:00");
      return {
        start: new Date(primaryDate.getFullYear(), primaryDate.getMonth(), 1),
        end: new Date(primaryDate.getFullYear(), primaryDate.getMonth() + 1, 0),
      };
    }, [selectedModalDate]);

    const dayCellClassNames = useMemo(
      () => (arg: any) => {
        const dateStr = toLocalISODate(arg.date);
        const isPrimaryDate = dateStr === selectedModalDate;
        const isAdditionalSelected = selectedAdditionalDays.includes(dateStr);
        const existingEvent = miniCalendarEvents.find(
          (e) => e.date === dateStr,
        );
        const hasOtherProvider =
          existingEvent && existingEvent.provider !== providerName;
        const hasPendingEntry = pendingEntries.some(
          (entry) =>
            entry.on_call_date === dateStr &&
            entry.provider_name !== providerName &&
            entry.specialty === specialty &&
            (entry.healthcare_plan ?? "") ===
            (specialty === "Internal Medicine" ? plan || "" : ""),
        );

        // Check if the date is in the same month as the primary date
        const primaryDate = selectedModalDate
          ? new Date(selectedModalDate + "T12:00:00")
          : null;
        const currentDate = arg.date;
        const isSameMonth =
          primaryDate &&
          currentDate.getMonth() === primaryDate.getMonth() &&
          currentDate.getFullYear() === primaryDate.getFullYear();

        const classes: string[] = [];

        if (isPrimaryDate) {
          classes.push("fc-primary-date");
        } else if (isAdditionalSelected) {
          classes.push("fc-selected-date");
        } else if (hasOtherProvider || hasPendingEntry) {
          classes.push("fc-unavailable-date");
        } else if (!isSameMonth && selectedModalDate) {
          classes.push("fc-other-month-disabled");
        }

        return classes;
      },
      [
        selectedModalDate,
        selectedAdditionalDays,
        miniCalendarEvents,
        pendingEntries,
        specialty,
        plan,
        providerName,
      ],
    );

    const handleDateClick = useMemo(
      () => (info: any) => {
        const dateStr = toLocalISODate(info.date);
        const isPrimaryDate = dateStr === selectedModalDate;
        const existingEvent = miniCalendarEvents.find(
          (e) => e.date === dateStr,
        );
        const hasOtherProvider =
          existingEvent && existingEvent.provider !== providerName;
        const hasPendingEntry = pendingEntries.some(
          (entry) =>
            entry.on_call_date === dateStr &&
            entry.provider_name !== providerName &&
            entry.specialty === specialty &&
            (entry.healthcare_plan ?? "") ===
            (specialty === "Internal Medicine" ? plan || "" : ""),
        );

        // Check if the date is in the same month as the primary date
        const primaryDate = selectedModalDate
          ? new Date(selectedModalDate + "T12:00:00")
          : null;
        const currentDate = info.date;
        const isSameMonth =
          primaryDate &&
          currentDate.getMonth() === primaryDate.getMonth() &&
          currentDate.getFullYear() === primaryDate.getFullYear();

        const isClickable =
          !isPrimaryDate &&
          !hasOtherProvider &&
          !hasPendingEntry &&
          isSameMonth;

        if (!isClickable) {
          // Provide subtle feedback (optional: could integrate toast)
          info.jsEvent?.preventDefault?.();
          return;
        }
        onDateSelect(dateStr);
      },
      [
        selectedModalDate,
        miniCalendarEvents,
        pendingEntries,
        specialty,
        plan,
        providerName,
        onDateSelect,
      ],
    );

    return (
      <div>
        <label className="block text-sm font-medium mb-2">
          Select Additional Days (Optional)
        </label>
        <div className="border rounded-lg p-2 sm:p-3 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-center mb-2 px-1">
            <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white text-center">
              {miniCalendarDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="mini-calendar-container h-48 sm:h-52">
            <FullCalendar
              ref={miniCalendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={false}
              height="100%"
              aspectRatio={1.0}
              initialDate={miniCalendarDate}
              dayMaxEvents={false}
              dayHeaderContent={(arg) => {
                return arg.text.charAt(0); // Show only first letter of weekday
              }}
              validRange={miniCalendarValidRange}
              dayCellClassNames={dayCellClassNames}
              dateClick={handleDateClick}
              showNonCurrentDates={false}
              fixedWeekCount={false}
            />
          </div>

          <div className="mt-3 space-y-2">
            {selectedAdditionalDays.length > 0 && (
              <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md">
                <strong>
                  Additional days selected ({selectedAdditionalDays.length}):
                </strong>{" "}
                <div className="mt-1 text-xs">
                  {selectedAdditionalDays
                    .sort()
                    .map((date) =>
                      new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      }),
                    )
                    .join(", ")}
                </div>
              </div>
            )}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-sm flex-shrink-0"></div>
                  <span className="truncate">Primary</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm flex-shrink-0"></div>
                  <span className="truncate">Selected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-gray-400 rounded-sm flex-shrink-0"></div>
                  <span className="truncate">Unavailable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 border border-orange-400 rounded-sm flex-shrink-0"></div>
                  <span className="truncate">Today</span>
                </div>
              </div>
              {selectedModalDate && (
                <div className="text-xs text-gray-400 dark:text-gray-500 italic">
                  📅 Only dates from{" "}
                  {new Date(selectedModalDate + "T12:00:00").toLocaleDateString(
                    "en-US",
                    { month: "long", year: "numeric" },
                  )}{" "}
                  can be selected
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

MiniCalendar.displayName = "MiniCalendar";

export default MiniCalendar;
