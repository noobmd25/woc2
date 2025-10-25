"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ERROR_MESSAGES, SECOND_PHONE_PREFS, SPECIALTIES, type SecondPhonePref } from "@/lib/constants";
import { effectiveOnCallDate, toYMD } from "@/lib/oncall-utils";

export interface OnCallProvider {
    // Schedule data
    providerName: string;
    specialty: string;
    healthcarePlan: string | null;
    onCallDate: string;
    showSecondPhone: boolean;
    secondPhonePref: SecondPhonePref;
    cover: boolean;
    coveringProvider: string | null;

    // Phone data
    phoneNumber: string | null;
    secondPhone: string | null;
    secondPhoneSource: string | null;
    coverPhone: string | null;
    coverProviderName: string | null;
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
                providerName: data.providerName || "",
                specialty: data.specialty || "",
                healthcarePlan: data.healthcarePlan || null,
                onCallDate: data.onCallDate || "",
                showSecondPhone: data.showSecondPhone || false,
                secondPhonePref: (data.secondPhonePref as SecondPhonePref) || SECOND_PHONE_PREFS.AUTO,
                cover: data.cover || false,
                coveringProvider: data.coveringProvider || null,
                phoneNumber: data.phoneNumber || null,
                secondPhone: data.secondPhone || null,
                secondPhoneSource: data.secondPhoneSource || null,
                coverPhone: data.coverPhone || null,
                coverProviderName: data.coverProviderName || null,
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