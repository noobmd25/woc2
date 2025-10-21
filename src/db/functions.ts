import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { profiles, roleRequests } from "./schema";

/**
 * Approve a role request
 * This replicates the Supabase function: approve_role_request
 * 
 * @param requestId - The role request ID to approve
 * @param deciderId - The user ID of the person approving
 * @param role - The role to grant
 * @param reason - Optional reason for the decision
 */
export async function approveRoleRequest(
    requestId: string,
    deciderId: string,
    role: "viewer" | "scheduler" | "admin",
    reason?: string
) {
    return await db.transaction(async (tx) => {
        // Get the role request
        const [request] = await tx
            .select()
            .from(roleRequests)
            .where(eq(roleRequests.id, requestId))
            .limit(1);

        if (!request) {
            throw new Error("Role request not found");
        }

        if (request.status !== "pending") {
            throw new Error("Role request is not pending");
        }

        if (!request.userId) {
            throw new Error("Role request has no associated user");
        }

        // Update the role request
        await tx
            .update(roleRequests)
            .set({
                status: "approved",
                decidedBy: deciderId,
                decidedAt: new Date().toISOString(),
                decisionReason: reason,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(roleRequests.id, requestId));

        // Update the user's profile
        await tx
            .update(profiles)
            .set({
                role: role,
                status: "approved",
                updatedAt: new Date().toISOString(),
            })
            .where(eq(profiles.id, request.userId));

        return { success: true, requestId, userId: request.userId };
    });
}

/**
 * Deny a role request
 * 
 * @param requestId - The role request ID to deny
 * @param deciderId - The user ID of the person denying
 * @param reason - Optional reason for the decision
 */
export async function denyRoleRequest(
    requestId: string,
    deciderId: string,
    reason?: string
) {
    return await db.transaction(async (tx) => {
        // Get the role request
        const [request] = await tx
            .select()
            .from(roleRequests)
            .where(eq(roleRequests.id, requestId))
            .limit(1);

        if (!request) {
            throw new Error("Role request not found");
        }

        if (request.status !== "pending") {
            throw new Error("Role request is not pending");
        }

        // Update the role request
        await tx
            .update(roleRequests)
            .set({
                status: "denied",
                decidedBy: deciderId,
                decidedAt: new Date().toISOString(),
                decisionReason: reason,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(roleRequests.id, requestId));

        // If user exists, update their status
        if (request.userId) {
            await tx
                .update(profiles)
                .set({
                    status: "denied",
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(profiles.id, request.userId));
        }

        return { success: true, requestId };
    });
}

/**
 * Execute raw SQL (for complex queries or functions)
 * Use this sparingly and prefer type-safe Drizzle queries when possible
 */
export async function executeRawSQL<T = unknown>(
    query: string
): Promise<T> {
    const result = await db.execute(sql.raw(query));
    return result as T;
}
