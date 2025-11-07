import { sql } from "drizzle-orm";
import { db } from "./index";

/**
 * Execute raw SQL (for complex queries or functions)
 * Use this sparingly and prefer type-safe Drizzle queries when possible
 */
export async function executeRawSQL<T = unknown>(query: string): Promise<T> {
	const result = await db.execute(sql.raw(query));
	return result as T;
}
