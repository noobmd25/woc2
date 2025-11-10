import {
	bigint,
	bigserial,
	boolean,
	date,
	index,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const factorType = pgEnum("factor_type", ["totp", "webauthn", "phone"]);
export const factorStatus = pgEnum("factor_status", ["unverified", "verified"]);
export const aalLevel = pgEnum("aal_level", ["aal1", "aal2", "aal3"]);
export const codeChallengeMethod = pgEnum("code_challenge_method", [
	"s256",
	"plain",
]);
export const oneTimeTokenType = pgEnum("one_time_token_type", [
	"confirmation_token",
	"reauthentication_token",
	"recovery_token",
	"email_change_token_new",
	"email_change_token_current",
	"phone_change_token",
]);
export const equalityOp = pgEnum("equality_op", [
	"eq",
	"neq",
	"lt",
	"lte",
	"gt",
	"gte",
	"in",
]);
export const action = pgEnum("action", [
	"INSERT",
	"UPDATE",
	"DELETE",
	"TRUNCATE",
	"ERROR",
]);
export const accessStatus = pgEnum("access_status", [
	"pending",
	"approved",
	"denied",
	"revoked",
]);
export const userRole = pgEnum("user_role", ["viewer", "scheduler", "admin"]);
export const oauthRegistrationType = pgEnum("oauth_registration_type", [
	"dynamic",
	"manual",
]);
export const oauthAuthorizationStatus = pgEnum("oauth_authorization_status", [
	"pending",
	"approved",
	"denied",
	"expired",
]);
export const oauthResponseType = pgEnum("oauth_response_type", ["code"]);
export const oauthClientType = pgEnum("oauth_client_type", [
	"public",
	"confidential",
]);
export const buckettype = pgEnum("buckettype", ["STANDARD", "ANALYTICS"]);

export const schedules = pgTable(
	"schedules",
	{
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		id: bigint("id", { mode: "number" }).primaryKey().notNull(),
		onCallDate: date("on_call_date").notNull(),
		specialty: text("specialty"),
		providerName: text("provider_name"),
		showSecondPhone: boolean("show_second_phone"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		healthcarePlan: text("healthcare_plan"),
		userId: uuid("user_id"),
		secondPhonePref: text("second_phone_pref").default("auto"),
		cover: boolean("cover").default(false),
		coveringProvider: text("covering_provider"),
	},
	(table) => {
		return {
			uniqueScheduleGeneral: uniqueIndex("unique_schedule_general").on(
				table.onCallDate,
				table.specialty
			),
			uniqueScheduleInternalMedicine: uniqueIndex(
				"unique_schedule_internal_medicine"
			).on(table.healthcarePlan, table.onCallDate, table.specialty),
			schedulesOnCallDateSpecialtyHealthcarePlanKey: unique(
				"schedules_on_call_date_specialty_healthcare_plan_key"
			).on(table.onCallDate, table.specialty, table.healthcarePlan),
			uniqueSchedule: unique("unique_schedule").on(
				table.onCallDate,
				table.specialty,
				table.providerName,
				table.healthcarePlan
			),
		};
	}
);

export const directory = pgTable("directory", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint("id", { mode: "number" }).primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
	providerName: text("provider_name"),
	phoneNumber: text("phone_number"),
	specialty: text("specialty"),
});

export const signupErrors = pgTable("signup_errors", {
	id: bigserial("id", { mode: "bigint" }).primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
	userId: uuid("user_id"),
	email: text("email"),
	errorText: text("error_text"),
	context: jsonb("context"),
});

export const profiles = pgTable("profiles", {
	id: uuid("id").primaryKey().notNull(),
	providerType: text("provider_type"),
	email: text("email"),
	role: userRole("role").default("viewer").notNull(),
	updatedAt: timestamp("updated_at", {
		withTimezone: true,
		mode: "string",
	}).defaultNow(),
	fullName: text("full_name"),
	department: text("department"),
	requestedRole: userRole("requested_role").default("viewer"),
	status: accessStatus("status").default("pending").notNull(),
	denialReason: text("denial_reason"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
	phone: text("phone"),
	yearOfTraining: text("year_of_training"),
});

export const specialties = pgTable(
	"specialties",
	{
		id: uuid("id").defaultRandom().primaryKey().notNull(),
		name: text("name").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		showOncall: boolean("show_oncall").default(false).notNull(),
	},
	(table) => {
		return {
			specialtiesNameKey: unique("specialties_name_key").on(table.name),
		};
	}
);

export const mmmMedicalGroups = pgTable("mmm_medical_groups", {
	id: bigserial("id", { mode: "number" }).primaryKey().notNull(),
	name: text("name").notNull(),
	medicalGroup: text("medical_group").notNull(),
	createdAt: timestamp("created_at", {
		withTimezone: true,
		mode: "string",
	}).defaultNow(),
	updatedAt: timestamp("updated_at", {
		withTimezone: true,
		mode: "string",
	}).defaultNow(),
});

export const wrappersFdwStats = pgTable("wrappers_fdw_stats", {
	fdwName: text("fdw_name").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createTimes: bigint("create_times", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	rowsIn: bigint("rows_in", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	rowsOut: bigint("rows_out", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	bytesIn: bigint("bytes_in", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	bytesOut: bigint("bytes_out", { mode: "number" }),
	metadata: jsonb("metadata"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
});

// TODO: this table is not used currently, decide later if we want to keep it or remove.
export const attendingRequests = pgTable(
	"attending_requests",
	{
		id: uuid("id").defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		date: date("date").notNull(),
		kind: text("kind").notNull(),
		shift: text("shift"),
		note: text("note"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => {
		return {
			userDateKey: uniqueIndex("attending_requests_user_date_key").on(
				table.date,
				table.userId
			),
			dateIdx: index("attending_requests_date_idx").on(table.date),
		};
	}
);

export const vitalMedicalGroups = pgTable("vital_medical_groups", {
	vitalGroupName: text("vital_group_name"),
	groupCode: text("group_code").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint("id", { mode: "number" }).primaryKey().notNull(),
	createdAt: timestamp("created_at", {
		withTimezone: true,
		mode: "string",
	}).defaultNow(),
	updatedAt: timestamp("updated_at", {
		withTimezone: true,
		mode: "string",
	}).defaultNow(),
});
