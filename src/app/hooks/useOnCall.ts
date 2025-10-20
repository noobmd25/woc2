"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import { ERROR_MESSAGES, SECOND_PHONE_PREFS, SPECIALTIES, type SecondPhonePref } from "@/lib/constants";
import { effectiveOnCallDate, toYMD } from "@/lib/oncall-utils";
import { resolveDirectorySpecialty } from "@/lib/specialtyMapping";
import { getBrowserClient } from "@/lib/supabase/client";
import type { ScheduleEntry } from "@/lib/types/schedule";

const supabase = getBrowserClient();

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
            // Build schedule query
            let query = supabase
                .from("schedules")
                .select("*")
                .eq("on_call_date", dateString)
                .eq("specialty", specialty);

            if (specialty === SPECIALTIES.INTERNAL_MEDICINE) {
                query = query.eq("healthcare_plan", plan);
            } else {
                query = query.is("healthcare_plan", null);
            }

            const { data: scheduleData, error: scheduleError } = await query;

            if (scheduleError) {
                toast.error(ERROR_MESSAGES.SCHEDULE_FETCH_ERROR + ": " + scheduleError.message);
                setProviderData(null);
                setDebugInfo(null);
                return;
            }

            const rows = Array.isArray(scheduleData) ? scheduleData.length : 0;
            setDebugInfo({
                criteria: `specialty=${specialty}, plan=${specialty === SPECIALTIES.INTERNAL_MEDICINE ? plan || "—" : "n/a"}, date=${dateString}`,
                rows,
            });

            if (!scheduleData || scheduleData.length === 0) {
                // toast.error(ERROR_MESSAGES.NO_PROVIDER_FOUND);
                setProviderData(null);
                return;
            }

            const record = scheduleData[0] as ScheduleEntry;

            // Get provider phone from directory
            const { data: directoryList } = await supabase
                .from("directory")
                .select("phone_number")
                .eq("provider_name", record.provider_name);

            const directoryData = Array.isArray(directoryList) ? directoryList[0] : null;

            // Get second phone if enabled
            let secondPhone = null;
            let secondSource: string | null = null;
            if (record.show_second_phone) {
                const pref = (record.second_phone_pref as SecondPhonePref) ?? SECOND_PHONE_PREFS.AUTO;
                const baseSpec = resolveDirectorySpecialty(specialty);

                if (pref === SECOND_PHONE_PREFS.PA || pref === SECOND_PHONE_PREFS.AUTO) {
                    const { data: paData } = await supabase
                        .from("directory")
                        .select("phone_number")
                        .ilike("provider_name", "%PA Phone%")
                        .eq("specialty", baseSpec);

                    if (paData?.[0]?.phone_number) {
                        secondPhone = paData[0].phone_number;
                        secondSource = "PA Phone";
                    }
                }

                if (!secondPhone && (pref === SECOND_PHONE_PREFS.RESIDENCY || pref === SECOND_PHONE_PREFS.AUTO)) {
                    const { data: resData } = await supabase
                        .from("directory")
                        .select("phone_number")
                        .ilike("provider_name", "%Residency%")
                        .eq("specialty", baseSpec);

                    if (resData?.[0]?.phone_number) {
                        secondPhone = resData[0].phone_number;
                        secondSource = "Residency";
                    }
                }
            }

            // Get cover provider phone if cover is enabled
            let coverPhone: string | null = null;
            let coverProviderName: string | null = null;
            if (record?.cover && record?.covering_provider) {
                const { data: coverData } = await supabase
                    .from("directory")
                    .select("phone_number")
                    .eq("provider_name", record.covering_provider);

                if (coverData?.[0]?.phone_number) {
                    coverPhone = coverData[0].phone_number;
                    coverProviderName = record.covering_provider;
                }
            }

            setProviderData({
                ...record,
                phone_number: directoryData?.phone_number || null,
                second_phone: secondPhone,
                _second_phone_source: secondSource,
                cover_phone: coverPhone,
                cover_provider_name: coverProviderName,
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