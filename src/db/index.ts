import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";


/**
 * Get the database URL based on the environment
 */
function getDatabaseUrl(): string {
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }

    throw new Error("No database URL configured. Please set DATABASE_URL in your .env file");
}

const connectionString = getDatabaseUrl();

// Disable prefetch as it's not supported for "Transaction" pool mode
export const client = postgres(connectionString, {
    prepare: false,
    max: 10, // Max connections in pool
});

export const db = drizzle(client, { schema });

export type DB = typeof db;
