"use client";

import { memo, useCallback, useEffect, useState } from "react";

import MiniCalendar from "@/components/schedule/MiniCalendar";
import ProviderSearch from "@/components/schedule/ProviderSearch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  // (removed coverInputRef prop)
  editingEntry: any;
  currentProviderId: string;
  loading?: boolean;
  onClose: () => void;
  onProviderSelect: (provider: Provider) => void;
  onDateSelect: (dateStr: string) => void;
  onSecondPrefChange: (pref: "none" | "residency" | "pa") => void;
  onCoverEnabledChange: (enabled: boolean) => void;
  onProviderIdChange: (id: string) => void;
  coveringProviderId: string;
  onCoveringProviderIdChange: (id: string) => void;
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
    coveringProviderId,
    onCoveringProviderIdChange,
    editingEntry: _editingEntry,
    currentProviderId,
    loading = false,
    onClose,
    onProviderSelect,
    onDateSelect,
    onSecondPrefChange,
    onCoverEnabledChange,
    onProviderIdChange,
    onSubmit,
  }: ScheduleModalProps) => {
    // Local state for multi-day selection toggle
    const [showMultiDaySelector, setShowMultiDaySelector] = useState(false);


    // Provider search input state (controlled)
    const [providerSearchQuery, setProviderSearchQuery] = useState("");
    const currentProvider = providers.find(p => p.id === currentProviderId);
    const providerInputValue = currentProvider ? currentProvider.name : providerSearchQuery;
    useEffect(() => {
      if (isOpen && currentProvider) {
        setProviderSearchQuery(currentProvider.name);
      } else if (isOpen && !currentProvider) {
        setProviderSearchQuery("");
      }
      // Only run when modal opens or provider changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, currentProviderId]);
    // Covering provider search input state (controlled)
    const [coveringProviderSearchQuery, setCoveringProviderSearchQuery] = useState("");
    const coveringProvider = providers.find(p => p.id === coveringProviderId);
    const coveringProviderInputValue = coveringProvider ? coveringProvider.name : coveringProviderSearchQuery;

    // Sync covering provider input with selection or modal open
    useEffect(() => {
      if (isOpen && coveringProvider) {
        setCoveringProviderSearchQuery(coveringProvider.name);
      } else if (isOpen && !coveringProvider) {
        setCoveringProviderSearchQuery("");
      }
      // Only run when modal opens or covering provider changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, coveringProviderId]);
    const handleClose = useCallback(() => {
      setShowMultiDaySelector(false);
      onCoveringProviderIdChange("");
      onClose();
    }, [onClose, onCoveringProviderIdChange]);

    const handleProviderInputChange = useCallback(
      (query: string) => {
        setProviderSearchQuery(query);
        onProviderIdChange(""); // Clear selection while typing
      },
      [onProviderIdChange],
    );

    const handleProviderSearchSelect = useCallback(
      (provider: Provider) => {
        setProviderSearchQuery(provider.name);
        onProviderSelect(provider);
      },
      [onProviderSelect],
    );


    // Exclude current provider from covering provider list
    const availableCoverProviders = providers.filter(p => p.id !== currentProviderId);

    if (!isOpen) return null;

    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Schedule Entry" : "Add Schedule Entry"}
            </DialogTitle>
            <DialogDescription>
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
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 sm:px-6 py-4 space-y-4">
            {/* Provider Selection - Searchable Select */}
            <div>
              <Label htmlFor="provider-search">Provider Name *</Label>
              <ProviderSearch
                providers={providers}
                searchQuery={providerInputValue}
                onSearchChange={handleProviderInputChange}
                onProviderSelect={handleProviderSearchSelect}
                selectedProvider={currentProvider ? currentProvider.name : ""}
                loading={loading}
              />
            </div>

            {/* Second Phone Preference */}
            <div>
              <Label >Works with</Label>
              <RadioGroup
                className="flex flex-row flex-wrap mt-2"
                value={secondPref}
                onValueChange={onSecondPrefChange}
                disabled={loading}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="none" id="pref-none" />
                  <Label htmlFor="pref-none" className="font-normal cursor-pointer">
                    None
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="residency" id="pref-residency" />
                  <Label htmlFor="pref-residency" className="font-normal cursor-pointer">
                    Residency
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="pa" id="pref-pa" />
                  <Label htmlFor="pref-pa" className="font-normal cursor-pointer">
                    PA Phone
                  </Label>
                </div>
              </RadioGroup>
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
            <div className="flex items-center gap-2">
              <Checkbox
                id="cover-enabled"
                checked={coverEnabled}
                onCheckedChange={(checked) => onCoverEnabledChange(checked as boolean)}
                disabled={loading || !currentProvider}
              />
              <Label
                htmlFor="cover-enabled"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                This is a cover arrangement
              </Label>
            </div>

            {coverEnabled && (
              <div>
                <Label htmlFor="coverProvider">Covering Provider</Label>
                <ProviderSearch
                  providers={availableCoverProviders}
                  searchQuery={coveringProviderInputValue}
                  onSearchChange={query => {
                    setCoveringProviderSearchQuery(query);
                    onCoveringProviderIdChange("");
                  }}
                  onProviderSelect={provider => {
                    setCoveringProviderSearchQuery(provider.name);
                    onCoveringProviderIdChange(provider.id);
                  }}
                  selectedProvider={coveringProvider ? coveringProvider.name : ""}
                  loading={loading}
                />
              </div>
            )}

            {/* Multi-Day Selection Toggle */}
            {!isEditing && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="multi-day-selector"
                  checked={showMultiDaySelector}
                  onCheckedChange={(checked) => setShowMultiDaySelector(checked as boolean)}
                  disabled={loading}
                />
                <Label
                  htmlFor="multi-day-selector"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Select multiple days
                </Label>
              </div>
            )}

            {/* Mini Calendar for Additional Days */}
            {!isEditing && showMultiDaySelector && (
              <MiniCalendar
                selectedModalDate={selectedModalDate}
                selectedAdditionalDays={selectedAdditionalDays}
                miniCalendarDate={miniCalendarDate}
                miniCalendarEvents={miniCalendarEvents}
                pendingEntries={pendingEntries}
                specialty={specialty}
                plan={plan}
                providerName={currentProvider ? currentProvider.name : ""}
                onDateSelect={onDateSelect}
              />
            )}
          </div>

          {/* Modal Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={loading}
            >
              {loading && (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              )}
              {isEditing ? "Update Entry" : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);

ScheduleModal.displayName = "ScheduleModal";

export default ScheduleModal;
