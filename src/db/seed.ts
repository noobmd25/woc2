import 'dotenv/config';
import { client, db } from "./index";
import { directory, profiles, specialties } from "./schema";

async function seed() {
    console.log("⏳ Seeding database...");

    try {
        // Seed specialties data
        await db.insert(specialties).values([
            { name: "Family Medicine", showOncall: true },
            { name: "Internal Medicine", showOncall: true },
            { name: "Pediatrics", showOncall: true },
            { name: "Cardiology", showOncall: false },
        ]).onConflictDoNothing();

        //Seed profile data
        await db.insert(profiles).values([
            {
                id: "c80cfcc8-b2b1-42bb-bb4e-5cbc82ea608f",  // Add a UUID here if necessary
                providerType: "Specialist",
                email: "cristianf.torres15@gmail.com",
                role: "admin",
                status: "approved",
                requestedRole: "admin",
                fullName: "Cristian Torres"
                // Add other required fields if necessary
            }
        ]).onConflictDoNothing();

        // Seed directory data here if needed
        await db.insert(directory).values([
            {
                providerName: "Hercules Torres",
                phoneNumber: "787-555-1234",
                specialty: "Cardiology",
            },
            {
                providerName: "Raul Torres",
                phoneNumber: "787-555-1234",
                specialty: "Internal Medicine",
            }
        ]).onConflictDoNothing();

        console.log("✅ Database seeded successfully");
    } catch (error) {
        console.error("❌ Error seeding database");
        console.error(error);
    } finally {
        await client.end();
        process.exit(0);
    }
}

seed();
