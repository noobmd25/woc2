import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "./index";
import {
    directory,
    mmmMedicalGroups,
    profiles,
    roleRequests,
    schedules,
    signupErrors,
    specialties,
    vitalMedicalGroups
} from "./schema";

/**
 * Profile operations
 */
export const profileQueries = {
    findById: async (id: string) => {
        return db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
    },

    findByEmail: async (email: string) => {
        return db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
    },

    updateRole: async (id: string, role: "viewer" | "scheduler" | "admin") => {
        return db.update(profiles).set({ role, updatedAt: new Date().toISOString() }).where(eq(profiles.id, id));
    },

    updateStatus: async (id: string, status: "pending" | "approved" | "denied" | "revoked") => {
        return db.update(profiles).set({ status, updatedAt: new Date().toISOString() }).where(eq(profiles.id, id));
    },
};

/**
 * Role request operations
 */
export const roleRequestQueries = {
    findPending: async () => {
        return db.select().from(roleRequests).where(eq(roleRequests.status, "pending")).orderBy(desc(roleRequests.createdAt));
    },

    findById: async (id: string) => {
        return db.select().from(roleRequests).where(eq(roleRequests.id, id)).limit(1);
    },

    approve: async (id: string, deciderId: string, reason?: string) => {
        return db.update(roleRequests).set({
            status: "approved",
            decidedBy: deciderId,
            decidedAt: new Date().toISOString(),
            decisionReason: reason,
            updatedAt: new Date().toISOString(),
        }).where(eq(roleRequests.id, id));
    },

    deny: async (id: string, deciderId: string, reason?: string) => {
        return db.update(roleRequests).set({
            status: "denied",
            decidedBy: deciderId,
            decidedAt: new Date().toISOString(),
            decisionReason: reason,
            updatedAt: new Date().toISOString(),
        }).where(eq(roleRequests.id, id));
    },
};

/**
 * Schedule operations
 */
export const scheduleQueries = {
    findByDate: async (date: Date) => {
        return db.select().from(schedules).where(eq(schedules.onCallDate, date.toISOString().split('T')[0]));
    },

    findByDateRange: async (startDate: Date, endDate: Date) => {
        return db.select().from(schedules).where(
            and(
                gte(schedules.onCallDate, startDate.toISOString().split('T')[0]),
                lte(schedules.onCallDate, endDate.toISOString().split('T')[0])
            )
        ).orderBy(asc(schedules.onCallDate));
    },

    findBySpecialty: async (specialty: string) => {
        return db.select().from(schedules).where(eq(schedules.specialty, specialty)).orderBy(asc(schedules.onCallDate));
    },

    findByProvider: async (providerName: string) => {
        return db.select().from(schedules).where(eq(schedules.providerName, providerName)).orderBy(asc(schedules.onCallDate));
    },
};

/**
 * Specialty operations
 */
export const specialtyQueries = {
    findAll: async () => {
        return db.select().from(specialties).orderBy(asc(specialties.name));
    },

    findOncallSpecialties: async () => {
        return db.select().from(specialties).where(eq(specialties.showOncall, true)).orderBy(asc(specialties.name));
    },

    findById: async (id: string) => {
        return db.select().from(specialties).where(eq(specialties.id, id)).limit(1);
    },
};

/**
 * Directory operations
 */
export const directoryQueries = {
    findAll: async () => {
        return db.select().from(directory).orderBy(asc(directory.providerName));
    },

    findByName: async (name: string) => {
        return db.select().from(directory).where(eq(directory.providerName, name)).limit(1);
    },

    findBySpecialty: async (specialty: string) => {
        return db.select().from(directory).where(eq(directory.specialty, specialty)).orderBy(asc(directory.providerName));
    },
};

/**
 * Medical groups operations
 */
export const medicalGroupQueries = {
    findAllMmm: async () => {
        return db.select().from(mmmMedicalGroups).orderBy(asc(mmmMedicalGroups.name));
    },

    findAllVital: async () => {
        return db.select().from(vitalMedicalGroups).orderBy(asc(vitalMedicalGroups.vitalGroupName));
    },
};

/**
 * Error logging
 */
export const errorLogging = {
    logSignupError: async (email: string, errorText: string, context?: any) => {
        return db.insert(signupErrors).values({
            email,
            errorText,
            context,
        });
    },
};
