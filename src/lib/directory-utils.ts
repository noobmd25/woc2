/**
 * Directory-related utility functions
 */

// Phone number utilities
export const cleanPhone = (phone: string): string =>
    phone?.replace(/[^\d+]/g, "");

/**
 * Build a WhatsApp-friendly number (digits only, with country code).
 * If the number has 10 digits, assume US/PR (+1). If it already has a leading +, keep its digits.
 */
export const toWhatsAppNumber = (rawPhone: string): string => {
    const cleaned = cleanPhone(rawPhone);
    const digits = cleaned.startsWith("+")
        ? cleaned.slice(1).replace(/\D/g, "")
        : cleaned.replace(/\D/g, "");

    if (digits.length === 10) {
        return `1${digits}`; // assume +1 for US/PR
    }

    return digits; // already includes country code or is longer
};

/**
 * Format phone number for display
 */
export const formatPhoneDisplay = (phone: string): string => {
    const cleaned = cleanPhone(phone);
    if (cleaned?.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone; // Return as-is if not 10 digits
};

/**
 * Generate phone action links
 */
export const generatePhoneLinks = (phone: string) => {
    const cleaned = cleanPhone(phone);
    const whatsappNumber = toWhatsAppNumber(phone);

    return {
        sms: `sms:${cleaned}`,
        tel: `tel:${cleaned}`,
        whatsapp: `https://wa.me/${whatsappNumber}`,
    };
};

/**
 * Search providers by name
 */
export const searchProviders = <T extends { provider_name: string }>(
    providers: T[],
    searchTerm: string
): T[] => {
    if (!searchTerm.trim()) return providers;

    const term = searchTerm.toLowerCase().trim();
    return providers.filter(provider =>
        provider.provider_name.toLowerCase().includes(term)
    );
};

/**
 * Filter providers by specialty
 */
export const filterProvidersBySpecialty = <T extends { specialty: string }>(
    providers: T[],
    specialty: string
): T[] => {
    if (!specialty || specialty === "all") return providers;
    return providers.filter(provider => provider.specialty === specialty);
};

/**
 * Sort providers by field
 */
export const sortProviders = <T extends Record<string, any>>(
    providers: T[],
    field: keyof T,
    direction: "asc" | "desc"
): T[] => {
    return [...providers].sort((a, b) => {
        const aVal = String(a[field] || "").toLowerCase();
        const bVal = String(b[field] || "").toLowerCase();

        if (direction === "asc") {
            return aVal.localeCompare(bVal);
        } else {
            return bVal.localeCompare(aVal);
        }
    });
};

/**
 * Paginate array
 */
export const paginateArray = <T>(
    array: T[],
    page: number,
    pageSize: number
): { data: T[]; totalPages: number; totalItems: number } => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
        data: array.slice(startIndex, endIndex),
        totalPages: Math.ceil(array.length / pageSize),
        totalItems: array.length,
    };
};

/**
 * Validate phone number format
 */
export const isValidPhone = (phone: string): boolean => {
    const cleaned = cleanPhone(phone);
    return cleaned.length >= 10 && cleaned.length <= 15;
};

/**
 * Validate provider data
 */
export const validateProvider = (data: {
    provider_name: string;
    specialty: string;
    phone_number: string;
}): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!data.provider_name?.trim()) {
        errors.push("Provider name is required");
    }

    if (!data.specialty?.trim()) {
        errors.push("Specialty is required");
    }

    if (!data.phone_number?.trim()) {
        errors.push("Phone number is required");
    } else if (!isValidPhone(data.phone_number)) {
        errors.push("Invalid phone number format");
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};