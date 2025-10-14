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