"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import { ERROR_MESSAGES, SECOND_PHONE_PREFS, SPECIALTIES, type SecondPhonePref } from "@/lib/constants";
import { effectiveOnCallDate, toYMD } from "@/lib/oncall-utils";

export interface OnCallProvider {
    // Schedule data
    provider_name: string;
    specialty: string;
    healthcare_plan: string | null;
    on_call_date: string;
    show_second_phone: boolean;
    second_phone_pref: SecondPhonePref;
    cover: boolean;
    covering_provider: string | null;

    // Phone data
    phone_number: string | null;
    second_phone: string | null;
    _second_phone_source: string | null;
    cover_phone: string | null;
    cover_provider_name: string | null;
}

export interface OnCallDebugInfo {
    criteria: string;
    rows: number;
}

export const useOnCall = (specialty: string, plan: string, currentDate: Date) => {
    const [providerData, setProviderData] = useState<OnCallProvider | null>(null);
    const [debugInfo, setDebugInfo] = useState<OnCallDebugInfo | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchOnCallData = useCallback(async () => {
        if (!specialty) {
            setProviderData(null);
            setDebugInfo(null);
            return;
        }

        const baseDate = effectiveOnCallDate(currentDate);
        const dateString = toYMD(baseDate);

        // If Internal Medicine requires a plan and none is selected, show guidance and skip querying
        if (specialty === SPECIALTIES.INTERNAL_MEDICINE && !plan) {
            setProviderData(null);
            setDebugInfo({
                criteria: `specialty=${specialty}, plan=<none>, date=${dateString}`,
                rows: 0,
            });
            return;
        }

        setLoading(true);

        try {
            // Build API query parameters
            const params = new URLSearchParams({
                date: dateString,
                specialty: specialty,
                includeSecondPhone: "true",
                includeCover: "true",
            });

            if (specialty === SPECIALTIES.INTERNAL_MEDICINE && plan) {
                params.append("plan", plan);
            }

            // Fetch from Drizzle API
            const response = await fetch(`/api/oncall?${params.toString()}`);

            if (!response.ok) {
                if (response.status === 404) {
                    // No provider found
                    setProviderData(null);
                    setDebugInfo({
                        criteria: `specialty=${specialty}, plan=${specialty === SPECIALTIES.INTERNAL_MEDICINE ? plan || "—" : "n/a"}, date=${dateString}`,
                        rows: 0,
                    });
                    return;
                }

                const errorData = await response.json();
                toast.error(ERROR_MESSAGES.SCHEDULE_FETCH_ERROR + ": " + (errorData.error || "Unknown error"));
                setProviderData(null);
                setDebugInfo(null);
                return;
            }

            const { data } = await response.json();

            setDebugInfo({
                criteria: `specialty=${specialty}, plan=${specialty === SPECIALTIES.INTERNAL_MEDICINE ? plan || "—" : "n/a"}, date=${dateString}`,
                rows: data ? 1 : 0,
            });

            if (!data) {
                setProviderData(null);
                return;
            }

            // Map the camelCase API response to snake_case interface
            setProviderData({
                provider_name: data.providerName || "",
                specialty: data.specialty || "",
                healthcare_plan: data.healthcarePlan || null,
                on_call_date: data.onCallDate || "",
                show_second_phone: data.showSecondPhone || false,
                second_phone_pref: (data.secondPhonePref as SecondPhonePref) || SECOND_PHONE_PREFS.AUTO,
                cover: data.cover || false,
                covering_provider: data.coveringProvider || null,
                phone_number: data.phone_number || null,
                second_phone: data.second_phone || null,
                _second_phone_source: data._second_phone_source || null,
                cover_phone: data.cover_phone || null,
                cover_provider_name: data.cover_provider_name || null,
            });

        } catch (error) {
            console.error("Error in fetchOnCallData:", error);
            toast.error("Failed to fetch on-call data");
            setProviderData(null);
            setDebugInfo(null);
        } finally {
            setLoading(false);
        }
    }, [specialty, plan, currentDate]);

    useEffect(() => {
        fetchOnCallData();
    }, [fetchOnCallData]);

    return {
        providerData,
        debugInfo,
        loading,
        refetch: fetchOnCallData,
    };
};