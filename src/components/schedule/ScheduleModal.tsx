"use client";

import { memo, useCallback } from "react";

import MiniCalendar from "@/components/schedule/MiniCalendar";
import ProviderSearch from "@/components/schedule/ProviderSearch";
import {
  type MiniCalendarEvent,
  type PendingEntry,
  type Provider,
} from "@/lib/schedule-utils";

interface ScheduleModalProps {
  isOpen: boolean;
  isEditing: boolean;
  selectedModalDate: string | null;
  specialty: string;
  plan: string | null;
  providers: Provider[];
  selectedAdditionalDays: string[];
  miniCalendarDate: Date;
  miniCalendarEvents: MiniCalendarEvent[];
  pendingEntries: PendingEntry[];
  secondPref: "none" | "residency" | "pa";
  secondPhone?: string;
  secondSource?: string | null;
  coverEnabled: boolean;
  coverInputRef?: React.RefObject<HTMLInputElement | null>;
  editingEntry: any;
  currentProviderName: string;
  loading?: boolean;
  onClose: () => void;
  onProviderSelect: (provider: Provider) => void;
  onDateSelect: (dateStr: string) => void;
  onSecondPrefChange: (pref: "none" | "residency" | "pa") => void;
  onCoverEnabledChange: (enabled: boolean) => void;
  onProviderNameChange: (name: string) => void;
  onSubmit: () => void;
}

const ScheduleModal = memo(
  ({
    isOpen,
    isEditing,
    selectedModalDate,
    specialty,
    plan,
    providers,
    selectedAdditionalDays,
    miniCalendarDate,
    miniCalendarEvents,
    pendingEntries,
    secondPref,
    secondPhone = "",
    secondSource = null,
    coverEnabled,
    coverInputRef,
    editingEntry: _editingEntry,
    currentProviderName,
    loading = false,
    onClose,
    onProviderSelect,
    onDateSelect,
    onSecondPrefChange,
    onCoverEnabledChange,
    onProviderNameChange,
    onSubmit,
  }: ScheduleModalProps) => {
    const handleProviderSearchSelect = useCallback(
      (provider: Provider) => {
        onProviderSelect(provider);
      },
      [onProviderSelect],
    );

    const handleProviderInputChange = useCallback(
      (query: string) => {
        onProviderNameChange(query);
      },
      [onProviderNameChange],
    );

    if (!isOpen) return null;

    return (
      <div className="modal-overlay">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="px-4 sm:px-6 py-4 border-b dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {isEditing ? "Edit Schedule Entry" : "Add Schedule Entry"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {selectedModalDate && (
                <>
                  {specialty} -{" "}
                  {new Date(
                    selectedModalDate + "T12:00:00",
                  ).toLocaleDateString()}
                  {specialty === "Internal Medicine" && plan && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      ({plan})
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          <div className="px-4 sm:px-6 py-4 space-y-4">
            {/* Provider Selection - Searchable Select */}
            <div>
              <label
                htmlFor="provider-search"
                className="block text-sm font-medium mb-2"
              >
                Provider Name *
              </label>
              <ProviderSearch
                providers={providers}
                searchQuery={currentProviderName}
                onSearchChange={handleProviderInputChange}
                onProviderSelect={handleProviderSearchSelect}
                selectedProvider={currentProviderName}
                loading={loading}
              />
            </div>

            {/* Second Phone Preference */}
            <div>
              <label
                htmlFor="second-phone-pref"
                className="block text-sm font-medium mb-2"
              >
                Second Phone Preference
              </label>
              <select
                value={secondPref}
                onChange={(e) =>
                  onSecondPrefChange(
                    e.target.value as "none" | "residency" | "pa",
                  )
                }
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:text-white dark:border-gray-700"
                disabled={loading}
                id="second-phone-pref"
              >
                <option value="none">None (use automatic preference)</option>
                <option value="residency">Prefer residency phone</option>
                <option value="pa">Prefer PA/office phone</option>
              </select>
            </div>

            {/* Display second phone if available */}
            {secondPref !== "none" && secondPhone && (
              <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                  {secondSource || "Secondary Contact"}
                </div>
                <div className="text-sm text-gray-900 dark:text-white font-mono">
                  {secondPhone}
                </div>
              </div>
            )}

            {/* Cover Provider */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={coverEnabled}
                  onChange={(e) => onCoverEnabledChange(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                  disabled={loading}
                />
                <span className="text-sm font-medium">
                  This is a cover arrangement
                </span>
              </label>
            </div>

            {coverEnabled && (
              <div>
                <label
                  htmlFor="coverProvider"
                  className="block text-sm font-medium mb-2"
                >
                  Covering Provider Name
                </label>
                <input
                  ref={coverInputRef}
                  type="text"
                  id="coverProvider"
                  placeholder="Covering provider name"
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:text-white dark:border-gray-700"
                  disabled={loading}
                />
              </div>
            )}

            {/* Mini Calendar for Additional Days */}
            {!isEditing && (
              <MiniCalendar
                selectedModalDate={selectedModalDate}
                selectedAdditionalDays={selectedAdditionalDays}
                miniCalendarDate={miniCalendarDate}
                miniCalendarEvents={miniCalendarEvents}
                pendingEntries={pendingEntries}
                specialty={specialty}
                plan={plan}
                providerName={currentProviderName}
                onDateSelect={onDateSelect}
              />
            )}
          </div>

          {/* Modal Actions */}
          <div className="px-4 sm:px-6 py-3 border-t dark:border-gray-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 flex items-center gap-2"
              disabled={loading}
            >
              {loading && (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              {isEditing ? "Update Entry" : "Add Entry"}
            </button>
          </div>
        </div>
      </div>
    );
  },
);

ScheduleModal.displayName = "ScheduleModal";

export default ScheduleModal;
