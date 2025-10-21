# Drizzle ORM Implementation - Complete Setup

## ✅ What Has Been Implemented

### 1. **Package Dependencies**
- ✅ `drizzle-orm` - Type-safe ORM
- ✅ `drizzle-kit` - CLI for migrations and introspection
- ✅ `postgres` - PostgreSQL client
- ✅ `pg` - Node-postgres driver
- ✅ `@types/pg` - TypeScript types for pg
- ✅ `tsx` - TypeScript execution for scripts

### 2. **Database Schema** (`src/db/schema.ts`)
Complete type-safe schema definitions for all your tables:
- `profiles` - User profiles with roles and status
- `role_requests` - Role change requests
- `specialties` - Medical specialties
- `schedules` - On-call schedules
- `directory` - Provider directory
- `mmm_medical_groups` - MMM medical groups
- `vital_medical_groups` - Vital medical groups
- `signup_errors` - Error logging

### 3. **Database Connection** (`src/db/index.ts`)
- Environment-aware connection (production/local)
- Connection pooling configured
- Type-safe database client

### 4. **Helper Functions**
- **`src/db/queries.ts`** - Pre-built queries for common operations
- **`src/db/functions.ts`** - Business logic functions (e.g., `approveRoleRequest`)
- **`src/db/migrate.ts`** - Migration runner script
- **`src/db/seed.ts`** - Database seeding script

### 5. **Configuration Files**
- **`drizzle.config.ts`** - Drizzle Kit configuration
- **`.env.example`** - Environment variables template

### 6. **NPM Scripts** (added to `package.json`)
```json
{
  "db:generate": "drizzle-kit generate:pg",       // Generate migrations
  "db:push": "drizzle-kit push:pg",               // Push schema to DB
  "db:pull": "drizzle-kit introspect:pg",         // Pull schema from DB
  "db:studio": "drizzle-kit studio",              // Visual DB browser
  "db:migrate": "tsx src/db/migrate.ts",          // Run migrations
  "db:seed": "tsx src/db/seed.ts",                // Seed database
  "db:local:start": "podman run ...",             // Start local DB
  "db:local:stop": "podman stop oncall-postgres", // Stop local DB
  "db:local:remove": "podman rm oncall-postgres"  // Remove local DB
}
```

### 7. **Documentation**
- **`docs/database-setup.md`** - Complete database setup guide
- **`docs/drizzle-migration-guide.md`** - Migration guide from Supabase to Drizzle

### 8. **Example Implementation**
- **`src/app/api/schedules-example/route.ts`** - Full CRUD example using Drizzle

## 🚀 Quick Start

### Step 1: Set Up Environment Variables

Create `.env.local`:

```bash
# Supabase (for auth, storage, real-time)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database connection string (use Supabase for production, local Postgres for development)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oncall_dev # for local
# or
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:6543/postgres?pgbouncer=true # for production
```

Only `DATABASE_URL` is required. Switch the value in `.env.local` as needed for local or production.

### Step 2: Start Local Database

```bash
pnpm db:local:start
```

This creates a PostgreSQL container with:
- Database: `oncall_dev`
- User: `postgres`
- Password: `postgres`
- Port: `5432`
- Set `DATABASE_URL` in `.env.local` to your local connection string for development.

### Step 3: Choose Your Approach

**Option A: Pull Schema from Production Supabase** (Recommended)
```bash
DATABASE_URL="your-production-url" pnpm db:pull
```

**Option B: Push Schema to Local Database**
```bash
DATABASE_URL="your-local-url" pnpm db:push
```

**Option C: Generate and Run Migrations**
```bash
pnpm db:generate  # Generate migration files
pnpm db:migrate   # Apply migrations
```

### Step 4: Test the Setup

Create a test file `test-db.ts`:

```typescript
import { db } from "./src/db";
import { specialties } from "./src/db/schema";

async function test() {
  const result = await db.select().from(specialties).limit(5);
  console.log("Connected! Specialties:", result);
}

test();
```

Run it:
```bash
NODE_ENV=development tsx test-db.ts
```

## 📖 Usage Examples

### 1. Basic Query

```typescript
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

// Get all profiles
const allProfiles = await db.select().from(profiles);

// Get profile by ID
const [profile] = await db
  .select()
  .from(profiles)
  .where(eq(profiles.id, userId))
  .limit(1);
```

### 2. Using Pre-built Queries

```typescript
import { profileQueries, scheduleQueries } from "@/db/queries";

// Find profile by email
const profile = await profileQueries.findByEmail("user@example.com");

// Get schedules for date range
const schedules = await scheduleQueries.findByDateRange(
  new Date("2024-01-01"),
  new Date("2024-12-31")
);
```

### 3. Insert Data

```typescript
import { db } from "@/db";
import { directory } from "@/db/schema";

const [newProvider] = await db
  .insert(directory)
  .values({
    providerName: "Dr. Smith",
    specialty: "Cardiology",
    phoneNumber: "555-0100",
  })
  .returning();
```

### 4. Update Data

```typescript
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

await db
  .update(profiles)
  .set({ role: "admin", updatedAt: new Date() })
  .where(eq(profiles.id, userId));
```

### 5. Transactions

```typescript
import { db } from "@/db";
import { approveRoleRequest } from "@/db/functions";

// Use the pre-built function
await approveRoleRequest(requestId, deciderId, "admin", "Approved by admin");

// Or create your own transaction
await db.transaction(async (tx) => {
  // Multiple operations that succeed or fail together
  await tx.update(roleRequests).set({ status: "approved" }).where(...);
  await tx.update(profiles).set({ role: "admin" }).where(...);
});
```

### 6. Combined with Supabase Auth

```typescript
import { getServerSupabase } from "@/lib/supabaseServer";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getUserProfile() {
  // Use Supabase for auth
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  // Use Drizzle for type-safe queries
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  
  return profile;
}
```

## 🛠️ Development Workflow

### 1. Make Schema Changes

Edit `src/db/schema.ts`:
```typescript
export const newTable = pgTable("new_table", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
});
```

### 2. Generate Migration

```bash
pnpm db:generate
```

This creates a migration file in `src/db/migrations/`

### 3. Review Migration

Check the generated SQL in `src/db/migrations/[timestamp]_migration.sql`

### 4. Apply Migration

Local:
```bash
DATABASE_URL="your-local-url" pnpm db:migrate
```

Production:
```bash
DATABASE_URL="your-production-url" pnpm db:migrate
```

## 📊 Database Management

### View Database with Drizzle Studio

```bash
pnpm db:studio
```

Opens a visual interface at `https://local.drizzle.studio`

### Manage Local Database

```bash
# Start
pnpm db:local:start

# Stop
pnpm db:local:stop

# Remove (keeps data)
pnpm db:local:remove

# Remove data volume completely
podman volume rm oncall-db-data
```

### Direct Database Access

```bash
# Connect to local DB
podman exec -it oncall-postgres psql -U postgres -d oncall_dev

# Connect to production
psql $DATABASE_URL
```

## 🔄 Migration Strategy

### For Existing Production Database

1. **Pull current schema**
   ```bash
   DATABASE_URL="production-url" pnpm db:pull
   ```

2. **Review generated schema** in `src/db/schema.ts`

3. **Test locally**
   ```bash
   NODE_ENV=development pnpm db:push
   # Test your queries
   ```

4. **Gradually migrate code**
   - Start with read-only queries
   - Then move to writes
   - Test thoroughly

5. **Deploy**
   - No migrations needed if schema matches
   - Just deploy the new code

## 🎯 What to Do Next

1. **Set up your environment variables** in `.env.local`
2. **Start the local database**: `pnpm db:local:start`
3. **Pull your production schema**: `DATABASE_URL="your-url" pnpm db:pull`
4. **Review the generated schema** in `src/db/schema.ts`
5. **Test queries locally** using the example API route
6. **Read the migration guide** in `docs/drizzle-migration-guide.md`
7. **Start migrating your API routes** one by one

## 📚 Documentation

- **Setup Guide**: `docs/database-setup.md`
- **Migration Guide**: `docs/drizzle-migration-guide.md`
- **Example API**: `src/app/api/schedules-example/route.ts`

## 💡 Tips

1. **Keep Supabase for**:
   - Authentication
   - Storage
   - Real-time subscriptions

2. **Use Drizzle for**:
   - Type-safe database queries
   - Migrations
   - Complex transactions
   - Better TypeScript integration

3. **Development**:
   - Use local Podman database for faster iteration
   - Use `db:push` for quick schema changes in dev
   - Use `db:generate` + `db:migrate` for production

4. **Production**:
   - Always use migrations (`db:migrate`)
   - Never use `db:push` in production
   - Test migrations in staging first

## 🆘 Troubleshooting

### Can't connect to local database

```bash
podman ps  # Check if container is running
podman logs oncall-postgres  # Check logs
```

### TypeScript errors

```bash
pnpm db:pull  # Regenerate types from database
```

### Migration conflicts

```bash
# Reset local database
pnpm db:local:stop
pnpm db:local:remove
podman volume rm oncall-db-data
pnpm db:local:start
pnpm db:migrate
```

## 🎉 You're All Set!

Everything is configured and ready to use. Check the documentation files for detailed guides and examples.

**Happy coding! 🚀**
