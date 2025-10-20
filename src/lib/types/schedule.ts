// Type definitions
export interface ScheduleEntry {
    on_call_date: string;
    provider_name: string;
    specialty: string;
    healthcare_plan: string | null;
    show_second_phone: boolean;
    second_phone_pref: "auto" | "pa" | "residency";
    cover: boolean;
    covering_provider: string | null;
}

export interface PendingEntry extends ScheduleEntry {
    id?: string;
}

export interface MiniCalendarEvent {
    date: string;
    provider: string;
}
