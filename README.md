# Who's On Call

**Who’s On Call** is a role-based on-call scheduling and directory platform for hospital departments. Built with modern web technologies, it provides a secure, flexible, and intuitive interface for managing provider shifts.

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

**Who's On Call** is designed for secure, efficient, and user-friendly on-call schedule management in healthcare environments.

## License

This project is proprietary and closed-source. All rights reserved. Unauthorized copying, modification, or distribution of any part of this project is strictly prohibited without explicit written permission.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

