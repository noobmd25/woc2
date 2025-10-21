# Database Setup with Drizzle ORM

This project uses Drizzle ORM to manage the database schema, migrations, and queries.

## Prerequisites

- Node.js (v18 or later)
- Podman installed (for local development)
- pnpm (or npm/yarn)
- Access to Supabase production database

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string (Supabase or local, depending on your setup)
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

## Local Development Database

### Start Local Database

Start a PostgreSQL database using Podman:

```bash
pnpm db:local:start
```

This will:
- Create a PostgreSQL 15 container named `oncall-postgres`
- Create a database named `oncall_dev`
- Expose port 5432
- Use username `postgres` and password `postgres`
- Persist data in a volume named `oncall-db-data`
- You can use the same `DATABASE_URL` for both local and production by switching the value in `.env.local` as needed.

### Stop Local Database

```bash
pnpm db:local:stop
```

### Remove Local Database Container

```bash
pnpm db:local:remove
```

To completely remove the database and its data:

```bash
pnpm db:local:remove
podman volume rm oncall-db-data
```

## Drizzle ORM Commands

### Generate Migration from Schema Changes

After modifying `src/db/schema.ts`:

```bash
pnpm db:generate
```

This will create a new migration file in `src/db/migrations/`

### Push Schema to Database (Development)

To push schema changes directly to the database without creating migrations:

```bash
pnpm db:push
```

**Warning**: This is destructive and should only be used in development!

### Pull Schema from Database

To introspect the database and generate schema:

```bash
pnpm db:pull
```

### Run Migrations

To apply pending migrations:

```bash
pnpm db:migrate
```

### Seed Database

To seed the database with initial data:

```bash
pnpm db:seed
```

Edit `src/db/seed.ts` to customize the seed data.

### Drizzle Studio

Open Drizzle Studio to visually explore and edit your database:

```bash
pnpm db:studio
```

This will open a web interface at `https://local.drizzle.studio`

## Database Schema

The schema is defined in `src/db/schema.ts` and includes:

- **profiles**: User profiles with roles and status
- **role_requests**: Role change requests with approval workflow
- **specialties**: Medical specialties with on-call visibility
- **schedules**: On-call schedules for providers (now uses `timestamp` columns for start/end times)
- **directory**: Provider directory with contact information
- **mmm_medical_groups**: MMM medical group associations
- **vital_medical_groups**: Vital medical group associations
- **signup_errors**: Error logging for signup issues

## Database Functions

### Queries

Pre-built queries are available in `src/db/queries.ts`:

```typescript
import { profileQueries, scheduleQueries, specialtyQueries } from "@/db/queries";

// Find profile by email
const profile = await profileQueries.findByEmail("user@example.com");

// Get schedules for date range
const schedules = await scheduleQueries.findByDateRange(startDate, endDate);

// Get all on-call specialties
const specialties = await specialtyQueries.findOncallSpecialties();
```

### Direct Database Access

```typescript
import { db } from "@/db";
import { profiles, schedules } from "@/db/schema";
import { eq } from "drizzle-orm";

// Insert a new profile
await db.insert(profiles).values({
  email: "user@example.com",
  fullName: "John Doe",
  role: "viewer",
});

// Query with custom conditions
const userSchedules = await db
  .select()
  .from(schedules)
  .where(eq(schedules.providerName, "Dr. Smith"));
```

## Migration Workflow

### Development

1. Modify `src/db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Review migration in `src/db/migrations/`
4. Run `pnpm db:migrate` to apply migration

### Production

1. Ensure migrations are tested in development
2. Commit migrations to version control
3. Deploy with migrations included
4. Run `pnpm db:migrate` in production environment

## Supabase Integration

Drizzle ORM works alongside Supabase:

- **Auth**: Continue using Supabase Auth (`@supabase/supabase-js`)
- **Real-time**: Continue using Supabase Real-time subscriptions
- **Storage**: Continue using Supabase Storage
- **Database**: Use Drizzle ORM for all type-safe queries and migrations (Supabase client is no longer used for database queries)

### Example: Combined Usage

```typescript
import { getServerSupabase } from "@/lib/supabaseServer";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

// Get authenticated user from Supabase
const supabase = await getServerSupabase();
const { data: { user } } = await supabase.auth.getUser();

// Query user profile with Drizzle
if (user) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id));
}
```

## Troubleshooting

### Connection Issues

If you can't connect to the local database:

```bash
# Check if container is running
podman ps

# Check container logs
podman logs oncall-postgres

# Restart container
pnpm db:local:stop
pnpm db:local:start
```

### Migration Issues

If migrations fail:

```bash
# Check current database state
pnpm db:studio

# Reset local database (WARNING: destroys data)
pnpm db:local:stop
pnpm db:local:remove
podman volume rm oncall-db-data
pnpm db:local:start
pnpm db:migrate
```

### Type Issues

If TypeScript types don't match your database:

```bash
# Regenerate migrations
pnpm db:generate

# Or pull schema from database
pnpm db:pull
```

## Best Practices

1. **Always use migrations in production** - Never use `db:push` in production
2. **Test migrations locally first** - Run migrations in local/dev environment before production
3. **Use transactions for complex operations** - Wrap related operations in transactions
4. **Keep schema and types in sync** - Run `db:generate` after schema changes
5. **Use prepared statements** - Drizzle automatically uses prepared statements for security
6. **Index frequently queried columns** - Add indexes in schema for performance

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle Kit CLI](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
