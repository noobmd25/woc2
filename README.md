# Who's On Call

# Who's On Call

**Who's On Call** is a role-based on-call scheduling and directory platform for hospital departments. Built with modern web technologies, it provides a secure, flexible, and intuitive interface for managing provider shifts, directory information, and medical group associations.

## 🔧 Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Drizzle ORM with PostgreSQL (Supabase)
- **Auth**: Supabase Auth with role-based access control (`viewer`, `scheduler`, `admin`)
- **Email**: Resend (transactional) for approval notifications
- **UI**: Radix UI primitives, Lucide icons, FullCalendar, React Hook Form
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS 4, CSS variables for theming, dark mode support

## 📱 Core Features

### On-Call Schedule Management
- **Real-Time Schedule Viewer**: Monthly calendar interface with provider assignments
- **Multi-Day Scheduling**: Assign providers across multiple days with mini-calendar
- **Healthcare Plan Support**: MMM and Vital medical group integration
- **Provider Contact Cards**: Quick access to provider contact information
- **Specialty-Based Views**: Filter schedules by medical specialty
- **Cover Shift Management**: Handle provider coverage and substitutions

### Provider Directory
- **Full CRUD Operations**: Add, edit, delete provider entries
- **Advanced Search & Filtering**: Search by name, filter by specialty
- **Pagination**: Configurable page sizes (10, 20, 50, 100)
- **Sorting**: Sort by name, specialty, or phone number
- **Phone Number Management**: Track primary and alternate contact numbers
- **Specialty Assignment**: Associate providers with medical specialties

### Medical Group Lookups
- **MMM Medical Groups**: PCP name and medical group associations
- **Vital Medical Groups**: Group name and code lookups
- **Paginated Search**: Fast lookup with server-side pagination
- **Unattached Groups**: Special handling for unattached/IPA B groups

### User Access Management
- **Role Request Workflow**: Users can request elevated access
- **Admin Approval System**: Admins approve/deny role changes
- **Email Notifications**: Automated approval/denial emails via Resend
- **Status Tracking**: Pending, approved, denied, withdrawn states

## 🔐 Access Control

- **Role-Based Access**: Three-tier system (viewer, scheduler, admin)
  - **Viewer**: Read-only access to schedules and directory
  - **Scheduler**: Can modify schedules and directory entries
  - **Admin**: Full access including user management and role approvals
- **Protected Routes**: Middleware-based route protection
- **Row-Level Security**: Database-level security policies (Supabase RLS)
- **Session Management**: Secure cookie-based sessions

## 💾 Database Architecture

### Drizzle ORM Integration
- **Type-Safe Queries**: Full TypeScript type inference
- **Schema Management**: `src/db/schema.ts` with complete table definitions
- **Migration System**: Automatic schema migrations with Drizzle Kit
- **Helper Queries**: Pre-built query functions in `src/db/queries.ts`

### Database Tables
- **profiles**: User profiles with roles and approval status
- **role_requests**: Role change request workflow
- **specialties**: Medical specialties with on-call visibility flags
- **schedules**: On-call scheduling with timestamp support
- **directory**: Provider directory with contact information
- **mmm_medical_groups**: MMM medical group associations
- **vital_medical_groups**: Vital medical group associations
- **signup_errors**: Error logging for signup failures

## 🎨 UI/UX Features

- **Dark Mode**: Complete dark/light theme support with system preference detection
- **Responsive Design**: Mobile-first design, optimized for all screen sizes
- **Progressive Web App (PWA)**: Installable on iOS and Android
- **Accessibility**: WCAG-compliant color contrasts and keyboard navigation
- **Loading States**: Skeleton loaders and optimistic updates
- **Toast Notifications**: User feedback via Sonner
- **Modal Workflows**: Form submissions and confirmations

## 🧩 Scalability

- **Component Architecture**: Modular, reusable React components
- **Custom Hooks**: Shared business logic (`useDirectory`, `useOnCall`, `useScheduleEntries`)
- **API Routes**: RESTful API design for all database operations
- **Type Safety**: End-to-end TypeScript coverage
- **Performance**: Pagination, lazy loading, and optimized queries
- **Extensibility**: Easy to add new specialties, medical groups, and features

## 🔧 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Headless UI
- **Backend**: Supabase (PostgreSQL) with Row-Level Security (RLS)
- **Auth**: Supabase Auth with custom roles (`scheduler`, `admin`)
- **Email**: Resend (transactional) for approval notifications (migrated from legacy EmailJS)
- **UI**: Calendar views, modals, responsive sidebars, Framer Motion animations

## 📱 Core Features

- **Real-Time On-Call Schedule Viewer**: Monthly calendar interface showing scheduled providers with contact cards.
- **Provider Assignment Modal**: Add/edit on-call providers per day with specialty and healthcare plan filters.
- **Multi-Day Scheduling**: Assign providers to multiple days using a mini-calendar.
- **Directory Integration**: Fetch provider contact info from Supabase.
- **Resident Phone Logic**: Displays alternate numbers based on specialty.
- **Dark Mode Support**: Styled for light and dark themes.
- **Responsive Design**: Optimized for mobile, tablet, and desktop.

## 🔐 Access Control

- **Role-Based Access**: Only users with specific `provider_type` (e.g., `scheduler`, `admin`) can modify schedules.
- **Row-Level Security**: Enforced via Supabase policies.

## 💾 Data Integrity

- **Atomic Scheduling**: Prevents duplicate provider entries per day/specialty/HCP.
- **Color-Coded Providers**: Consistent UI colors per provider.
- **Unsaved Changes Tracking**: Tracks modified entries; saves on confirmation.

## 🧩 Scalability

- Supports multiple specialties and healthcare plans.
- Componentized for future features (e.g., shift notes, analytics).
- API-ready structure for mobile or external integrations.

---

## 📚 Project Structure

```
woc2/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API routes (Drizzle ORM)
│   │   │   ├── admin/           # Admin endpoints
│   │   │   ├── auth/            # Authentication
│   │   │   ├── directory/       # Provider CRUD
│   │   │   ├── mmm-medical-groups/
│   │   │   ├── oncall/          # Schedule data
│   │   │   ├── profiles/        # User profiles
│   │   │   ├── role-requests/   # Access requests
│   │   │   ├── schedules/       # Schedule CRUD
│   │   │   ├── specialties/     # Specialty management
│   │   │   └── vital-medical-groups/
│   │   ├── admin/               # Admin dashboard
│   │   ├── auth/                # Auth pages (login, signup, request)
│   │   ├── directory/           # Provider directory page
│   │   ├── oncall/              # On-call schedule viewer
│   │   ├── schedule/            # Schedule management
│   │   └── hooks/               # Page-level hooks
│   ├── components/              # React components
│   │   ├── admin/               # Admin components
│   │   ├── auth/                # Auth forms
│   │   ├── directory/           # Directory modals/tables
│   │   ├── emails/              # Email templates (React Email)
│   │   ├── lookup/              # Medical group lookups
│   │   ├── medical-groups/      # Medical group components
│   │   ├── oncall/              # Schedule viewer components
│   │   ├── schedule/            # Schedule editor components
│   │   └── ui/                  # Radix UI components (shadcn)
│   ├── db/                      # Database layer
│   │   ├── schema.ts            # Drizzle schema definitions
│   │   ├── queries.ts           # Helper query functions
│   │   ├── functions.ts         # Business logic
│   │   ├── migrate.ts           # Migration runner
│   │   ├── seed.ts              # Database seeding
│   │   ├── index.ts             # DB client
│   │   └── migrations/          # Generated migrations
│   ├── lib/                     # Utility functions
│   │   ├── supabase/            # Supabase clients (server/client)
│   │   ├── types/               # TypeScript type definitions
│   │   ├── validations/         # Zod schemas
│   │   ├── access.ts            # Access control helpers
│   │   ├── constants.ts         # App constants
│   │   ├── date.ts              # Date utilities
│   │   ├── email.ts             # Email sending logic
│   │   └── utils.ts             # General utilities
│   └── types/
│       └── database.ts          # Database type definitions
├── public/
│   ├── icons/                   # PWA icons
│   ├── splash/                  # PWA splash screens
│   └── manifest.json            # PWA manifest
├── docs/                        # Documentation
│   ├── api-routes.md
│   ├── database-setup.md
│   ├── MIGRATION_COMPLETE.md
│   ├── pwa-ios.md
│   └── react-hook-form-integration.md
├── drizzle.config.ts            # Drizzle Kit configuration
├── middleware.ts                # Next.js middleware (auth)
├── next.config.ts               # Next.js configuration
├── tailwind.config.ts           # Tailwind CSS configuration
└── tsconfig.json                # TypeScript configuration
```

---

**Who's On Call** is designed for secure, efficient, and user-friendly on-call schedule management in healthcare environments.

## 📄 License

This project is proprietary and closed-source. All rights reserved. Unauthorized copying, modification, or distribution of any part of this project is strictly prohibited without explicit written permission.

---

## 🚀 Getting Started

This is a [Next.js](https://nextjs.org) project using the App Router.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- PostgreSQL database (Supabase or self-hosted)
- Resend account for email notifications (optional)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
# or
pnpm install
```

2. Set up environment variables (see [Environment Configuration](#-environment-configuration))

3. Run database migrations:

```bash
npm run db:migrate
```

4. (Optional) Seed the database with initial data:

```bash
npm run db:seed
```

### Development Server

Start the development server:

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

The page auto-updates as you edit files. This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to optimize fonts.

---

## ⚙️ Environment Configuration

Create a `.env.local` file in the root directory with the following variables:

### Required Variables

```env
# Database (Drizzle ORM)
DATABASE_URL=postgresql://user:password@host:port/database

# Supabase (Auth & Storage)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_BASE_URL=http://localhost:3000
```

### Email Configuration (Resend)

```env
RESEND_API_KEY=re_your_api_key
APPROVAL_EMAIL_FROM="Who's On Call <no-reply@whosoncall.app>"
APPROVAL_EMAIL_SUBJECT=Access Granted ✅
SUPPORT_EMAIL=support@example.org
```

**Note**: If `RESEND_API_KEY` is missing in non-production environments, the API will log a warning and skip sending emails.

---

## 📧 Email System

### Approval Email Workflow

When an admin approves a user's role request, an automated email is sent via Resend using a React Email template.

### Test Email Endpoints (Admin Only)

Navigate to `/admin` and use the email testing tools:

**1. Simple Test Email** - `/api/admin/test-email`
- Sends a basic HTML/text email
- Request body: `{ to: string, useOnboarding?: boolean, subject?: string }`
- When `useOnboarding: true` (default), uses `onboarding@resend.dev` sender (only delivers to your Resend account email)
- Set `useOnboarding: false` to use your verified domain sender

**2. Approval Email Test** - `/api/admin/test-approval-email`
- Sends the production approval template
- Request body: `{ to: string, name?: string }`
- Uses `APPROVAL_EMAIL_FROM` as sender
- Defaults to `Who's On Call <no-reply@whosoncall.app>` if unset

Both endpoints require an authenticated, approved admin user.

**Tip**: In local development, Resend's onboarding sender can only deliver to your account email. Use a verified domain sender to send to external addresses like Gmail.

---

## 📲 PWA / iOS Installability

The app is configured as a Progressive Web App (PWA) with iOS support.

### Manifest Configuration

PWA manifest is located at `public/manifest.json`.

### Splash Screen Generation

Generate iOS light/dark splash screens after updating `public/brand/wordmark.png`:

```bash
npm run pwa:splash
# or separately:
npm run pwa:splash:light
npm run pwa:splash:dark
```

Assets are written to `public/splash/light` and `public/splash/dark` and referenced in `app/layout.tsx`.

### Optional: Maskable Icon

For Android adaptive icons, create `public/icon-512-maskable.png` and add to the manifest icons array with `"purpose": "any maskable"`.

See `docs/pwa-ios.md` for validation steps and installation checklist.

---

## 🗄️ Database Management

### Available Scripts

```bash
# Generate migrations from schema changes
npm run db:generate

# Push schema changes to database
npm run db:push

# Pull schema from existing database
npm run db:pull

# Run migrations
npm run db:migrate

# Seed database with initial data
npm run db:seed

# Open Drizzle Studio (database GUI)
npm run db:studio

# Create database backup
npm run db:backup
```

### Local PostgreSQL (Podman)

```bash
# Start local PostgreSQL container
npm run db:local:start

# Stop container
npm run db:local:stop

# Remove container
npm run db:local:remove

# Delete all data
npm run db:local:purge
```

### Connection Testing

Test database connection:

```bash
tsx test-drizzle.ts
```

See `docs/database-setup.md` for detailed database setup instructions.

---

## 🔨 Available Scripts

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format with Prettier
npm run check            # Run both linting and format check

# Database
npm run db:generate      # Generate migrations
npm run db:push          # Push schema to DB
npm run db:pull          # Pull schema from DB
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Drizzle Studio

# PWA
npm run pwa:splash       # Generate splash screens (light + dark)
```

---

## 📖 Additional Documentation

- **[Database Setup](docs/database-setup.md)** - Complete Drizzle ORM setup guide
- **[API Routes](docs/api-routes.md)** - API endpoint documentation
- **[Migration Complete](docs/MIGRATION_COMPLETE.md)** - Drizzle migration summary
- **[PWA iOS Setup](docs/pwa-ios.md)** - PWA installation guide
- **[React Hook Form Integration](docs/react-hook-form-integration.md)** - Form validation patterns
- **[Drizzle Setup](DRIZZLE_SETUP.md)** - Quick start guide
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Feature overview

---

## 🚢 Deployment

### Vercel (Recommended)

The easiest way to deploy is using the [Vercel Platform](https://vercel.com/new):

1. Connect your repository
2. Configure environment variables
3. Deploy

See [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more options.

### Environment Variables for Production

Ensure all required environment variables are set in your deployment platform:
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `APPROVAL_EMAIL_FROM`
- `APP_BASE_URL`

---

## 🤝 Contributing

This is a proprietary project. Contributions are limited to authorized team members only.

---

## 📞 Support

For issues or questions, contact: support@example.org

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

### Email Configuration

Set the following environment variables for approval emails (Resend):

```
RESEND_API_KEY=your_key
APP_BASE_URL=https://www.whosoncall.app
APPROVAL_EMAIL_FROM="Who's On Call <no-reply@whosoncall.app>"
APPROVAL_EMAIL_SUBJECT=Access Granted ✅
SUPPORT_EMAIL=support@premuss.org
```

If `RESEND_API_KEY` is missing in non-production environments the API will log a warning and skip sending.

### Admin test email endpoints

Two admin-only endpoints are available to verify the Resend pipeline:

- POST `/api/admin/test-email`
  - Sends a simple HTML/text email.
  - Request body: `{ to: string, useOnboarding?: boolean, subject?: string }`
  - When `useOnboarding` is `true` (default), sender is `onboarding@resend.dev` (allowed only to your Resend account email). Set `useOnboarding: false` to send from your verified domain in dev/prod.

- POST `/api/admin/test-approval-email`
  - Sends the real Approvals React template used in production.
  - Request body: `{ to: string, name?: string }`
  - Uses `APPROVAL_EMAIL_FROM` (or `RESEND_FROM`) as the sender. Defaults to `Who's On Call <no-reply@whosoncall.app>` if unset.

Both endpoints:

- Require an authenticated, approved `admin` user (checked via Supabase).
- Run in the Node.js runtime and are `force-dynamic` (no caching).
- Return JSON with `{ ok, id, to, from }` or `{ ok: false, error, details }` for easier debugging.

Tip: In local dev, Resend’s onboarding sender can only deliver to your account email. Use a verified domain sender (e.g., `no-reply@whosoncall.app`) to send to external mailboxes like Gmail.

### Sending from the Admin page

- Navigate to `/admin` as an approved admin.
- Use the "Email Pipeline Test" to send a simple test email.
- Use the "Approval Email Test" to send the production approval template.
- Results (success or JSON error) are shown inline under each button.

## 📲 PWA / iOS Installability

PWA manifest: `public/manifest.json` (replaces older `site.webmanifest`).

Generate iOS light/dark splash screens after updating `public/brand/wordmark.png`:

```bash
npm run pwa:splash
```

Assets are written to `public/splash/light` and `public/splash/dark` and already referenced in `app/layout.tsx`.

Add a maskable icon (optional, Android adaptive shapes): create `public/icon-512-maskable.png` and add to `icons` array in the manifest with `"purpose": "any maskable"`.

See `docs/pwa-ios.md` for validation steps and checklist.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
