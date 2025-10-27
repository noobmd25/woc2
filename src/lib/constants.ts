// src/lib/constants.ts
// Centralized constants for schedule and provider logic


export const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export const PLANS = [
    { name: "Triple S Advantage/Unattached", color: "bg-blue-100 text-blue-800", isIpa: false },
    { name: "Vital", color: "bg-green-100 text-green-800", isIpa: false },
    { name: "405/M88", color: "bg-yellow-100 text-yellow-800", isIpa: false },
    { name: "PAMG", color: "bg-purple-100 text-purple-800", isIpa: true },
    { name: "REMAS", color: "bg-pink-100 text-pink-800", isIpa: true },
    { name: "SMA", color: "bg-red-100 text-red-800", isIpa: true },
    { name: "CSE", color: "bg-teal-100 text-teal-800", isIpa: true },
    { name: "In Salud", color: "bg-orange-100 text-orange-800", isIpa: true },
    { name: "IPA B", color: "bg-indigo-100 text-indigo-800", isIpa: true },
    { name: "MCS", color: "bg-gray-100 text-gray-800", isIpa: true },
];

export const MEDICAL_GROUP = {
    VITAL: "Vital",
    MMM: "MMM",
}

export type MedicalGroup = typeof MEDICAL_GROUP[keyof typeof MEDICAL_GROUP];

export const SECOND_PHONE_PREFS = {
    NONE: "none",
    RESIDENCY: "residency",
    PA: "pa",
    AUTO: "auto",
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

// OnCall constants
export const ONCALL_CONSTANTS = {
    SHIFT_START_HOUR: 7, // On-call day starts at 7:00 AM
    DEFAULT_SPECIALTY: "Internal Medicine",
} as const;

// Error messages
export const ERROR_MESSAGES = {
    NO_PROVIDER_FOUND: "No provider found for this selection.",
    SPECIALTY_FETCH_FAILED: "Specialties fetch failed",
    NO_SPECIALTIES_RETURNED: "No specialties returned (possible RLS / role issue).",
    SPECIALTY_LIST_EMPTY: "Specialty list empty. Check RLS / viewer role mapping.",
    SCHEDULE_FETCH_ERROR: "Error fetching schedule",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
    PRIMARY_PHONE_COPIED: "Primary phone copied",
    SECONDARY_PHONE_COPIED: "Resident phone copied",
} as const;