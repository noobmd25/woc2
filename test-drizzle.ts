/**
 * Test Drizzle Database Connection
 * 
 * Run this file to verify your database connection is working:
 * 
 * Development (local):
 *   NODE_ENV=development tsx test-drizzle.ts
 * 
 * Production:
 *   DATABASE_URL="your-url" tsx test-drizzle.ts
 */

import { client, db } from "./src/db";
import { profiles, schedules, specialties } from "./src/db/schema";

async function testConnection() {
    console.log("\n🔍 Testing Drizzle ORM Connection...\n");

    try {
        // Test 1: Simple query
        console.log("Test 1: Fetching specialties...");
        const specialtiesResult = await db.select().from(specialties).limit(5);
        console.log(`✅ Found ${specialtiesResult.length} specialties`);
        if (specialtiesResult.length > 0) {
            console.log("   Sample:", specialtiesResult[0]);
        }

        // Test 2: Count query
        console.log("\nTest 2: Counting profiles...");
        const profilesResult = await db.select().from(profiles).limit(5);
        console.log(`✅ Found ${profilesResult.length} profiles`);

        // Test 3: Schedules query
        console.log("\nTest 3: Fetching recent schedules...");
        const schedulesResult = await db.select().from(schedules).limit(3);
        console.log(`✅ Found ${schedulesResult.length} schedules`);

        console.log("\n✅ All tests passed! Database connection is working.\n");
    } catch (error) {
        console.error("\n❌ Database connection test failed:");
        console.error(error);
        console.error("\nTroubleshooting:");
        console.error("1. Check your DATABASE_URL in .env.local");
        console.error("2. Ensure local database is running: pnpm db:local:start");
        console.error("3. Verify schema is synced: pnpm db:push or pnpm db:pull\n");
    } finally {
        await client.end();
        process.exit(0);
    }
}

testConnection();
