import { z } from "zod";

// Provider form validation schema
export const providerFormSchema = z.object({
    provider_name: z
        .string()
        .min(1, "Provider name is required")
        .min(2, "Provider name must be at least 2 characters")
        .max(100, "Provider name must be less than 100 characters")
        .trim(),

    specialty: z
        .string()
        .min(1, "Specialty is required"),

    phone_number: z
        .string()
        .min(1, "Phone number is required")
        .regex(
            /^[\+]?[1-9][\d]{0,15}$/,
            "Please enter a valid phone number (10-16 digits)"
        )
        .transform((val) => {
            // Remove any non-digit characters except + at the start
            const cleaned = val.replace(/[^\d+]/g, "");
            // If it starts with +, keep it, otherwise remove any + symbols
            return cleaned.startsWith("+") ? cleaned : cleaned.replace(/\+/g, "");
        })
        .refine(
            (val) => {
                const digits = val.replace(/^\+/, "");
                return digits.length >= 10 && digits.length <= 15;
            },
            "Phone number must be between 10-15 digits"
        ),
});

export type ProviderFormData = z.infer<typeof providerFormSchema>;

// Alternative phone validation for more flexible formats
export const phoneSchema = z
    .string()
    .min(1, "Phone number is required")
    .refine(
        (val) => {
            // Allow common phone formats: (123) 456-7890, 123-456-7890, 123.456.7890, +1 123 456 7890, etc.
            const cleaned = val.replace(/[^\d]/g, "");
            return cleaned.length >= 10 && cleaned.length <= 15;
        },
        "Please enter a valid phone number"
    );

// More permissive provider schema for editing existing providers
export const editProviderFormSchema = providerFormSchema.extend({
    phone_number: phoneSchema.transform((val) => {
        // Keep original formatting but ensure it's clean for storage
        return val.trim();
    }),
});

export type EditProviderFormData = z.infer<typeof editProviderFormSchema>;

// Email validation schema for forgot password form
export const forgotPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
