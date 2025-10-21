"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useOnCall } from "@/app/hooks/useOnCall";
import { useSpecialties } from "@/app/hooks/useSpecialties";
import useUserRole from "@/app/hooks/useUserRole";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { PLANS, SPECIALTIES } from "@/lib/constants";
import { getNextDay, getPreviousDay, getToday } from "@/lib/oncall-utils";

import LayoutShell from "@/components/LayoutShell";
import DateNavigation from "@/components/oncall/DateNavigation";
import DebugInfo from "@/components/oncall/DebugInfo";
import ProviderCard from "@/components/oncall/ProviderCard";
import SpecialtyPlanSelector from "@/components/oncall/SpecialtyPlanSelector";

export default function OnCallViewer() {
  const [specialty, setSpecialty] = useState(SPECIALTIES.INTERNAL_MEDICINE);
  const [plan, setPlan] = useState(PLANS[0]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const role = useUserRole();

  // Fetch specialties
  const {
    specialties,
    reloadSpecialties,
    loading: specialtyLoading
  } = useSpecialties();

  // Fetch on-call data
  const {
    providerData,
    debugInfo,
    loading: onCallLoading
  } = useOnCall(specialty, plan, currentDate);

  // Date navigation handlers
  const handlePrevDay = useCallback(() => {
    setCurrentDate(getPreviousDay);
  }, []);

  const handleNextDay = useCallback(() => {
    setCurrentDate(getNextDay);
  }, []);

  const handleToday = useCallback(() => {
    setCurrentDate(getToday());
  }, []);

  // Form handlers
  const handleSpecialtyChange = useCallback((value: string) => {
    setSpecialty(value);
    // Reset plan when specialty changes
    if (value !== SPECIALTIES.INTERNAL_MEDICINE) {
      setPlan("");
    }
  }, []);

  const handlePlanChange = useCallback((value: string) => {
    setPlan(value);
  }, []);

  const showNoProviderMessage = useMemo(() => !onCallLoading && !providerData && debugInfo?.rows === 0, [onCallLoading, providerData, debugInfo]);
  const showPlanGuidance = useMemo(() => specialty === SPECIALTIES.INTERNAL_MEDICINE && !plan, [specialty, plan]);

  useEffect(() => {
    // Reload specialties on mount
    reloadSpecialties();
  }, [reloadSpecialties]);

  if (specialtyLoading) {
    return (
      <LayoutShell>
        <div className="app-container px-4 py-6 max-w-[400px] mx-auto bg-gray-100 dark:bg-black">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              On-Call Viewer
            </h1>
          </div>
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="app-container px-4 py-6 max-w-[400px] mx-auto bg-gray-100 dark:bg-black">
        <div className="space-y-6">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              On-Call Viewer
            </h1>
          </div>

          {/* Specialty and Plan Selector */}
          <SpecialtyPlanSelector
            specialty={specialty}
            plan={plan}
            specialties={specialties}
            specialtyLoading={specialtyLoading}
            onSpecialtyChange={handleSpecialtyChange}
            onPlanChange={handlePlanChange}
          />
          <div className="flex justify-center gap-4">
            <Link
              href="/lookup/mmm-pcp"
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-[#009c94] hover:bg-[#007F77] rounded shadow-sm"
            >
              MMM Group Lookup
            </Link>
            <Link
              href="/lookup/vital-groups"
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-[#5c5ca2] hover:bg-[#4a4a88] rounded shadow-sm"
            >
              Vital Group Lookup
            </Link>
          </div>
          {onCallLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <>

              {providerData && (
                <DateNavigation
                  currentDate={currentDate}
                  onPreviousDay={handlePrevDay}
                  onNextDay={handleNextDay}
                  onToday={handleToday}
                />
              )}

              {/* Provider Card */}
              {providerData && (
                <ProviderCard provider={providerData} />
              )}

              {/* No Provider Message */}
              {showNoProviderMessage && !showPlanGuidance && (
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    No provider found for this selection.
                  </p>
                </div>
              )}
              {providerData && (
                <>
                  {/* Debug Info */}
                  <DebugInfo debugInfo={debugInfo} role={role} />
                </>
              )}
            </>
          )}

        </div>
      </div>
    </LayoutShell>
  );
}