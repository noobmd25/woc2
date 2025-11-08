import { z } from "zod";
import { PLANS } from "../constants";

// Login form validation schema
export const loginSchema = z.object({
	email: z
		.string()
		.min(1, "Email is required")
		.email("Please enter a valid email address"),
	password: z.string().min(1, "Password is required"),
});
export type LoginFormData = z.infer<typeof loginSchema>;

// Provider form validation schema
export const providerFormSchema = z.object({
	provider_name: z
		.string()
		.min(1, "Provider name is required")
		.min(2, "Provider name must be at least 2 characters")
		.max(100, "Provider name must be less than 100 characters")
		.trim(),

	specialty: z.string().min(1, "Specialty is required"),

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
		.refine((val) => {
			const digits = val.replace(/^\+/, "");
			return digits.length >= 10 && digits.length <= 15;
		}, "Phone number must be between 10-15 digits"),
});

export type ProviderFormData = z.infer<typeof providerFormSchema>;

// Alternative phone validation for more flexible formats
export const phoneSchema = z
	.string()
	.min(1, "Phone number is required")
	.refine((val) => {
		// Allow common phone formats: (123) 456-7890, 123-456-7890, 123.456.7890, +1 123 456 7890, etc.
		const cleaned = val.replace(/[^\d]/g, "");
		return cleaned.length >= 10 && cleaned.length <= 15;
	}, "Please enter a valid phone number");

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

export const mmmProviderSchema = z.object({
	name: z.string().min(2, "Name required"),
	medicalGroup: z.enum(
		PLANS.map((plan) => plan.name) as [string, ...string[]],
		{
			errorMap: () => ({ message: "Select a valid plan" }),
		}
	),
});

export const vitalProviderSchema = z.object({
	name: z.string().min(2, "Name required"),
	medicalGroup: z.string().min(2, "Group Code required"),
});

export const specialtySchema = z.object({
	name: z.string().min(2, "Name required"),
	showOnCall: z.boolean().optional(),
	hasResidency: z.boolean().optional(),
});

// Signup form validation schema
export const signupFormSchema = z
	.object({
		full_name: z
			.string()
			.min(1, "Full name is required")
			.min(2, "Full name must be at least 2 characters")
			.max(100, "Full name must be less than 100 characters")
			.trim(),

		email: z
			.string()
			.min(1, "Email is required")
			.email("Please enter a valid email address"),

		phone: z
			.string()
			.min(1, "Phone number is required")
			.refine((val) => {
				// Allow common phone formats: (123) 456-7890, 123-456-7890, 123.456.7890, +1 123 456 7890, etc.
				const cleaned = val.replace(/[^\d]/g, "");
				return cleaned.length >= 10 && cleaned.length <= 15;
			}, "Please enter a valid phone number"),

		position: z.enum(["Resident", "Attending", "Non-Clinical"], {
			errorMap: () => ({ message: "Please select a position" }),
		}),

		specialty_attending: z.string().optional(),
		specialty_resident: z.string().optional(),
		specialty_non_clinical: z.string().optional(),
		pgy_year: z.string().optional(),

		password: z
			.string()
			.min(1, "Password is required")
			.min(12, "Password must be at least 12 characters")
			.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
			.regex(/[a-z]/, "Password must contain at least one lowercase letter")
			.regex(/\d/, "Password must contain at least one number")
			.regex(
				/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/,
				"Password must contain at least one special character"
			),

		confirm_password: z.string().min(1, "Please confirm your password"),
	})
	.refine(
		(data) => {
			if (data.position === "Attending") {
				return (
					data.specialty_attending && data.specialty_attending.trim().length > 0
				);
			}
			return true;
		},
		{
			message: "Service / department is required for Attending",
			path: ["specialty_attending"],
		}
	)
	.refine(
		(data) => {
			if (data.position === "Resident") {
				return (
					data.specialty_resident && data.specialty_resident.trim().length > 0
				);
			}
			return true;
		},
		{
			message: "Residency specialty is required for Resident",
			path: ["specialty_resident"],
		}
	)
	.refine(
		(data) => {
			if (data.position === "Resident") {
				return data.pgy_year && /^[1-7]$/.test(data.pgy_year);
			}
			return true;
		},
		{
			message: "PGY year must be between 1-7 for Resident",
			path: ["pgy_year"],
		}
	)
	.refine(
		(data) => {
			if (data.position === "Non-Clinical") {
				return (
					data.specialty_non_clinical &&
					data.specialty_non_clinical.trim().length > 0
				);
			}
			return true;
		},
		{
			message: "Non-clinical specialty is required when selecting Non-Clinical",
			path: ["specialty_non_clinical"],
		}
	)
	.refine((data) => data.password === data.confirm_password, {
		message: "Passwords do not match",
		path: ["confirm_password"],
	});

export type SignupFormData = z.infer<typeof signupFormSchema>;

// Role change form validation schema
export const changeRoleSchema = z.object({
	role: z.enum(["viewer", "scheduler", "admin"], {
		required_error: "Please select a role",
	}),
});
export type ChangeRoleFormData = z.infer<typeof changeRoleSchema>;
