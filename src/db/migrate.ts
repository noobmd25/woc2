import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { client, db } from "./index";

async function runMigrations() {
    console.log("⏳ Running migrations...");

    const start = Date.now();

    await migrate(db, { migrationsFolder: "./src/db/migrations" });

    const end = Date.now();

    console.log(`✅ Migrations completed in ${end - start}ms`);

    await client.end();
    process.exit(0);
}

runMigrations().catch((err) => {
    console.error("❌ Migration failed");
    console.error(err);
    process.exit(1);
});
