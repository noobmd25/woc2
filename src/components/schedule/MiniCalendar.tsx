"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";

import {
  toLocalISODate,
} from "@/lib/schedule-utils";
import {
  type MiniCalendarEvent,
} from "@/lib/types/schedule";
import { memo, useCallback, useMemo, useRef } from "react";

interface MiniCalendarProps {
  selectedModalDate: string | null;
  selectedAdditionalDays: string[];
  miniCalendarDate: Date;
  miniCalendarEvents: MiniCalendarEvent[];
  providerName: string;
  onDateSelect: (dateStr: string) => void;
  unavailableDates: string[];
}

const MiniCalendar = memo(
  ({
    selectedModalDate,
    selectedAdditionalDays,
    miniCalendarDate,
    miniCalendarEvents,
    providerName,
    onDateSelect,
    unavailableDates,
  }: MiniCalendarProps) => {
    const miniCalendarRef = useRef<FullCalendar | null>(null);

    // Memoized function to check if a date is unavailable
    const isUnavailable = useCallback(
      (dateStr: string) => {
        return unavailableDates.includes(dateStr);
      },
      [unavailableDates]
    );

    // Memoized validRange for mini calendar to prevent re-renders
    // Remove validRange to allow showing adjacent month dates
    const miniCalendarValidRange = useMemo(() => {
      return undefined; // Allow all dates to be shown
    }, []);

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
        } else if (hasOtherProvider || isUnavailable(dateStr)) {
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
        providerName,
        isUnavailable,
      ],
    );

    const handleDateClick = useCallback(
      (info: any) => {
        const dateStr = toLocalISODate(info.date);
        const isPrimaryDate = dateStr === selectedModalDate;
        const existingEvent = miniCalendarEvents.find(
          (e) => e.date === dateStr,
        );
        const hasOtherProvider =
          existingEvent && existingEvent.provider !== providerName;
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
          !isUnavailable(dateStr) &&
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
        providerName,
        onDateSelect,
        isUnavailable,
      ],
    );

    return (
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Select Additional Days (Optional)
        </label>
        <div className="border rounded-lg p-2 sm:p-4 md:p-5 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 shadow-sm transition-colors">
          <div className="flex items-center justify-center mb-3">
            <span className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white text-center">
              {miniCalendarDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="mini-calendar-container h-52 sm:h-56 md:h-64 lg:h-72">
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
              showNonCurrentDates={true}
              fixedWeekCount={true}
            />
          </div>

          <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
            {selectedAdditionalDays.length > 0 && (
              <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 p-2 sm:p-3 rounded-md border border-blue-200 dark:border-blue-800 transition-colors">
                <strong className="font-semibold">
                  Additional days selected ({selectedAdditionalDays.length}):
                </strong>{" "}
                <div className="mt-1.5 text-xs sm:text-sm flex flex-wrap gap-1">
                  {selectedAdditionalDays
                    .sort()
                    .map((date) => (
                      <span
                        key={date}
                        className="inline-block bg-blue-100 dark:bg-blue-800/50 px-2 py-0.5 rounded text-blue-800 dark:text-blue-200"
                      >
                        {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    ))}
                </div>
              </div>
            )}
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 sm:gap-x-3 gap-y-2 mb-3">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 dark:bg-emerald-600 rounded-sm flex-shrink-0 shadow-sm"></div>
                  <span className="truncate text-xs sm:text-sm font-medium">Primary</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-blue-500 dark:bg-blue-600 rounded-sm flex-shrink-0 shadow-sm"></div>
                  <span className="truncate text-xs sm:text-sm font-medium">Selected</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-gray-300 dark:bg-gray-700 rounded-sm flex-shrink-0 shadow-sm"></div>
                  <span className="truncate text-xs sm:text-sm font-medium">Unavailable</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 border-2 border-amber-500 rounded-sm flex-shrink-0 bg-amber-50 dark:bg-amber-950/50"></div>
                  <span className="truncate text-xs sm:text-sm font-medium">Today</span>
                </div>
              </div>
              {selectedModalDate && (
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 italic bg-gray-100 dark:bg-gray-800/50 p-2 rounded border border-gray-200 dark:border-gray-700 transition-colors">
                  <span className="mr-1">📅</span>
                  Only dates from{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {new Date(selectedModalDate + "T12:00:00").toLocaleDateString(
                      "en-US",
                      { month: "long", year: "numeric" },
                    )}
                  </span>{" "}
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
