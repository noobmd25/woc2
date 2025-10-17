// src/lib/constants.ts
// Centralized constants for schedule and provider logic

export const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export const PLANS = [
    "Triple S Advantage/Unattached",
    "Vital",
    "405/M88",
    "PAMG",
    "REMAS",
    "SMA",
    "CSE",
    "In Salud",
    "IPA B",
    "MCS",
];

export const SECOND_PHONE_PREFS = {
    NONE: "none",
    RESIDENCY: "residency",
    PA: "pa"
} as const;

export type SecondPhonePref = typeof SECOND_PHONE_PREFS[keyof typeof SECOND_PHONE_PREFS];

// Add more constants as needed for specialties, roles, etc.

export const SPECIALTIES = {
    INTERNAL_MEDICINE: "Internal Medicine",
}

export const ROLES = {
    ADMIN: "admin",
    SCHEDULER: "scheduler",
    VIEWER: "viewer",
} as const;

// Directory constants
export const DIRECTORY_SORT_FIELDS = {
    NAME: "provider_name",
    SPECIALTY: "specialty",
    PHONE: "phone_number",
} as const;

export const SORT_DIRECTIONS = {
    ASC: "asc",
    DESC: "desc",
} as const;

export type SortField = typeof DIRECTORY_SORT_FIELDS[keyof typeof DIRECTORY_SORT_FIELDS];
export type SortDirection = typeof SORT_DIRECTIONS[keyof typeof SORT_DIRECTIONS];