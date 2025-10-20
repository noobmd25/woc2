/**
 * OnCall-specific utility functions
 */

// Phone number utilities
export const cleanPhone = (s: string): string =>
    String(s ?? "").replace(/[^\d+]/g, "");

export const toWhatsAppNumber = (raw: string): string => {
    const c = cleanPhone(raw);
    const digits = c.startsWith("+")
        ? c.slice(1).replace(/\D/g, "")
        : c.replace(/\D/g, "");
    return digits.length === 10 ? `1${digits}` : digits; // assume +1 if 10 digits (US/PR)
};

// Date utilities for on-call scheduling
export const effectiveOnCallDate = (dt: Date): Date => {
    const d = new Date(dt);
    // Treat an on-call "day" as 7:00am local → 6:59am next day
    if (d.getHours() < 7) {
        d.setDate(d.getDate() - 1);
    }
    // Normalize to noon to avoid DST/compare issues when we only need Y-M-D
    d.setHours(12, 0, 0, 0);
    return d;
};

export const toYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

// Navigation helpers
export const getPreviousDay = (date: Date): Date => {
    const nd = new Date(date);
    nd.setDate(nd.getDate() - 1);
    return nd;
};

export const getNextDay = (date: Date): Date => {
    const nd = new Date(date);
    nd.setDate(nd.getDate() + 1);
    return nd;
};

export const getToday = (): Date => new Date();

// Phone action helpers
export const copyToClipboard = async (text: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    // Note: This function should be used with toast from the component
};

// Second phone source labeling
export const getSecondPhoneLabel = (source: string | null): string => {
    if (!source) return "Resident/PA";
    if (/PA/i.test(source)) return "PA";
    if (/Residency/i.test(source)) return "Resident";
    return "Resident/PA";
};

// Provider directory link helper
export const getProviderDirectoryLink = (providerName?: string): string => {
    return providerName
        ? `/directory?provider=${encodeURIComponent(providerName)}`
        : "/directory";
};