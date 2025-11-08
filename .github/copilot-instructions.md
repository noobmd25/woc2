# Who's On Call - AI Coding Guidelines

## Architecture Overview

**Who's On Call** is a healthcare on-call scheduling platform built with:

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Drizzle ORM with PostgreSQL (Supabase)
- **Auth**: Supabase Auth with role-based access control (`viewer`, `scheduler`, `admin`)
- **UI**: Radix UI primitives, shadcn/ui components, FullCalendar, React Hook Form with Zod validation

## Core Data Model

### Key Tables (`src/db/schema.ts`)

- **`schedules`**: On-call assignments with date, specialty, provider, healthcare plan, covering shifts
- **`directory`**: Provider contact information with specialties
- **`profiles`**: User accounts with roles and approval workflow
- **`specialties`**: Medical specialties with on-call visibility flags
- **`mmm_medical_groups`/`vital_medical_groups`**: Healthcare plan associations

### Unique Constraints

- One provider per specialty per day (except Internal Medicine which allows multiple plans)
- Atomic scheduling prevents conflicts
- Row-level security via Supabase RLS policies

## Critical Workflows

### Database Operations

```bash
npm run db:migrate    # Apply migrations to production
npm run db:generate   # Create migrations from schema changes
npm run db:push       # Push schema to dev database
npm run db:studio     # Open Drizzle Studio GUI
npm run db:seed       # Populate initial data
```

### Development Setup

```bash
npm run dev          # Start with Turbopack (faster than Webpack)
npm run build        # Production build
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Prettier formatting
npm run check        # Lint + format check
```

### PWA Assets

```bash
npm run pwa:splash   # Generate iOS splash screens (light/dark themes)
```

## Code Patterns & Conventions

### Data Fetching

- **Custom Hooks**: Use `src/app/hooks/` for page-level data fetching
- **API Routes**: RESTful endpoints in `src/app/api/` using Drizzle queries
- **Query Functions**: Centralized in `src/db/queries.ts` with type safety
- **Error Handling**: Toast notifications via Sonner, console logging for debugging

### Authentication & Access Control

- **Supabase Auth**: Server/client setup in `src/lib/supabase/`
- **Role Hierarchy**: `viewer` (read-only) → `scheduler` (edit) → `admin` (manage users)
- **Approval Workflow**: Users request elevated access, admins approve via email
- **Middleware**: Currently disabled (migrated from deprecated auth helpers)

### Form Handling

- **React Hook Form** + **Zod validation** schemas in `src/lib/validations/`
- **SearchableSelect**: Custom component for dropdowns with search
- **Real-time validation** with error display

### UI Components

- **shadcn/ui**: Pre-built components in `src/components/ui/`
- **Dark Mode**: CSS variables with system preference detection
- **Responsive**: Mobile-first design, PWA installable
- **Loading States**: Use `<Skeleton />` for card/content placeholders, `<LoadingSpinner />` for general loading states with `size` prop (`"sm" | "md" | "lg"`)
- **Refresh Buttons**: Use `<RefreshCw className="h-4 w-4" />` icon instead of "Refresh" text for better visual consistency

### Business Logic Constants

- **Healthcare Plans**: Defined in `src/lib/constants.ts` with colors and IPA flags
- **Specialties**: Dynamic from database with on-call visibility
- **Phone Logic**: Residency vs attending numbers based on specialty
- **Date Handling**: Custom utilities in `src/lib/date.ts` and `src/lib/oncall-utils.ts`

## Component Organization

### Feature-Based Structure

```
src/components/
├── admin/           # Admin dashboard components
├── auth/            # Authentication forms
├── directory/       # Provider directory modals/tables
├── lookup/          # Medical group search components
├── oncall/          # Schedule viewer components
├── schedule/        # Schedule editor components
└── ui/              # Reusable shadcn/ui primitives
```

### Page-Level Hooks

```
src/app/hooks/
├── useOnCall.ts         # Schedule data fetching
├── useDirectory.ts      # Provider directory
├── useMedicalGroup.ts   # Healthcare plan lookups
├── useProfiles.ts       # User management
└── useSpecialties.ts    # Specialty data
```

## Common Patterns

### Schedule Assignment Logic

- **Internal Medicine**: Requires healthcare plan selection (MMM/Vital)
- **Other Specialties**: Plan-optional, one provider per day
- **Covering Shifts**: `cover: true` with `coveringProvider` field
- **Phone Display**: `showSecondPhone` flag controls residency number visibility

### API Response Format

```typescript
// Success
{ ok: true, data: T }

// Error
{ ok: false, error: string }

// Paginated
{ ok: true, data: T[], total: number, page: number, pageSize: number }
```

### Database Query Patterns

```typescript
// Type-safe queries with Drizzle
const result = await db
	.select()
	.from(table)
	.where(and(eq(field, value), gte(dateField, startDate)))
	.orderBy(asc(sortField))
	.limit(pageSize)
	.offset((page - 1) * pageSize);
```

### Environment Variables

- **Database**: `DATABASE_URL` (Drizzle)
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Email**: `RESEND_API_KEY` (optional, logs warning if missing)

## Development Best Practices

### When Adding Features

1. **Check existing patterns** in similar components/hooks
2. **Update database schema** first, then generate migrations
3. **Add Zod schemas** for form validation
4. **Create API routes** with proper error handling
5. **Test with Drizzle Studio** before committing

### When Modifying Schedules

- **Validate constraints**: One provider per specialty per day
- **Handle covering shifts**: Update both original and cover records
- **Preserve audit trail**: Keep creation timestamps
- **Check permissions**: Only schedulers/admins can modify

### When Adding Specialties

- **Set visibility flags**: `showOncall` for schedule display
- **Configure phone logic**: `hasResidency` for secondary numbers
- **Update constants**: Add to `SPECIALTIES` in `src/lib/constants.ts`

### Admin Access Management

- **User Status Workflow**: `pending` → `approved`/`denied` → `revoked` (blocked)
- **Status Filter**: Filter users by status (approved/denied/blocked) in admin interface
- **User Counts**: Display counts for approved, denied, blocked, and total users in stats cards
- **Access Control**: Use `useUserCounts()` hook for fetching user statistics by status

## Key Files to Reference

- **`src/db/schema.ts`**: Complete data model and constraints
- **`src/lib/constants.ts`**: Business logic constants and enums
- **`src/db/queries.ts`**: All database operations
- **`src/app/api/schedules/route.ts`**: Schedule CRUD API pattern
- **`src/app/hooks/useOnCall.ts`**: Complex data fetching with business logic
- **`middleware.ts`**: Authentication middleware (currently disabled)</content>
  <parameter name="filePath">/Users/cfboy/Documents/GitHub/woc2/.github/copilot-instructions.md
