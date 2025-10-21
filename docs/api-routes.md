# Drizzle ORM API Routes

This document describes all the API routes created for the Drizzle ORM implementation.

## Overview

All API routes use Drizzle ORM to interact with the PostgreSQL database. Supabase is now used only for authentication/session. The routes follow RESTful conventions and return JSON responses.

## Base URL

All routes are prefixed with `/api/`

## Routes

### 1. Schedules (`/api/schedules`)

Manage on-call schedules. Schedules now use `timestamp` columns for start and end times to support shifts spanning days.

**GET** `/api/schedules`
- Query Parameters:
  - `date` (required): on_call_date in YYYY-MM-DD format (startDate and endDate are stored as timestamps)
  - `specialty` (required): specialty filter
  - `plan` (optional): healthcare_plan filter
- Response: `{ data: Schedule[], count: number }`

**POST** `/api/schedules`
- Body: Schedule object (include startDate and endDate as ISO 8601 timestamps)
- Response: `{ data: Schedule }`

**PUT** `/api/schedules`
- Body: `{ id: number, ...updateData }`
- Response: `{ data: Schedule }`

**DELETE** `/api/schedules`
- Query Parameters:
  - `id` (required): schedule ID
- Response: `{ data: Schedule }`

---

### 2. Directory (`/api/directory`)

Manage provider directory.

**GET** `/api/directory`
- Query Parameters:
  - `providerName` (optional): exact provider name filter
  - `specialty` (optional): specialty filter
  - `search` (optional): search term for provider name (uses ILIKE)
- Response: `{ data: Directory[], count: number }`

**POST** `/api/directory`
- Body: Directory object
- Response: `{ data: Directory }`

**PUT** `/api/directory`
- Body: `{ id: number, ...updateData }`
- Response: `{ data: Directory }`

**DELETE** `/api/directory`
- Query Parameters:
  - `id` (required): directory entry ID
- Response: `{ data: Directory }`

---

### 3. Specialties (`/api/specialties`)

Manage medical specialties.

**GET** `/api/specialties`
- Query Parameters:
  - `showOncall` (optional): filter by showOncall boolean ("true" or "false")
- Response: `{ data: Specialty[], count: number }`

**POST** `/api/specialties`
- Body: Specialty object
- Response: `{ data: Specialty }`

**PUT** `/api/specialties`
- Body: `{ id: string (UUID), ...updateData }`
- Response: `{ data: Specialty }`

**DELETE** `/api/specialties`
- Query Parameters:
  - `id` (required): specialty UUID
- Response: `{ data: Specialty }`

---

### 4. Profiles (`/api/profiles`)

Manage user profiles.

**GET** `/api/profiles`
- Query Parameters:
  - `id` (optional): profile UUID
  - `email` (optional): user email
- Response: `{ data: Profile[], count: number }`

**POST** `/api/profiles`
- Body: Profile object
- Response: `{ data: Profile }`

**PUT** `/api/profiles`
- Body: `{ id: string (UUID), ...updateData }`
- Response: `{ data: Profile }`

**DELETE** `/api/profiles`
- Query Parameters:
  - `id` (required): profile UUID
- Response: `{ data: Profile }`

---

### 5. Role Requests (`/api/role-requests`)

Manage access role requests.

**GET** `/api/role-requests`
- Query Parameters:
  - `id` (optional): request UUID
  - `userId` (optional): user UUID
  - `status` (optional): request status (pending, approved, denied, withdrawn)
- Response: `{ data: RoleRequest[], count: number }`

**POST** `/api/role-requests`
- Body: RoleRequest object
- Response: `{ data: RoleRequest }`

**PUT** `/api/role-requests`
- Body: `{ id: string (UUID), ...updateData }`
- Response: `{ data: RoleRequest }`

**DELETE** `/api/role-requests`
- Query Parameters:
  - `id` (required): role request UUID
- Response: `{ data: RoleRequest }`

---

### 6. On-Call (Special Route) (`/api/oncall`)

Get complete on-call provider data with phone numbers.

**GET** `/api/oncall`
- Query Parameters:
  - `date` (required): on_call_date in YYYY-MM-DD format
  - `specialty` (required): specialty filter
  - `plan` (optional): healthcare_plan filter
  - `includeSecondPhone` (optional): "true" to fetch second phone
  - `secondPhonePref` (optional): preference for second phone (pa, residency, auto)
  - `includeCover` (optional): "true" to fetch cover provider phone
- Response: `{ data: OnCallProvider }`

**Response Structure:**
```typescript
{
  data: {
    // Schedule fields (camelCase from DB)
    id: number,
    onCallDate: string,
    specialty: string,
    providerName: string,
    healthcarePlan: string | null,
    showSecondPhone: boolean,
    secondPhonePref: string,
    cover: boolean,
    coveringProvider: string | null,
    
    // Additional phone data
    phone_number: string | null,
    second_phone: string | null,
    _second_phone_source: string | null,
    cover_phone: string | null,
    cover_provider_name: string | null,
  }
}
```

---

## Error Handling

All routes return appropriate HTTP status codes:
- `200 OK`: Successful GET/PUT operation
- `201 Created`: Successful POST operation
- `400 Bad Request`: Missing required parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "error": "Error message description"
}
```

## Usage Examples

### Fetch on-call provider
```typescript
const response = await fetch(
  `/api/oncall?date=2024-10-20&specialty=Internal Medicine&plan=MMM&includeSecondPhone=true&includeCover=true`
);
const { data } = await response.json();
```

### Get all schedules for a date
```typescript
const response = await fetch(
  `/api/schedules?date=2024-10-20&specialty=Cardiology`
);
const { data, count } = await response.json();
```

### Create a new schedule
```typescript
const response = await fetch('/api/schedules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    onCallDate: '2024-10-20',
    specialty: 'Cardiology',
    providerName: 'Dr. Smith',
    // ... other fields
  }),
});
const { data } = await response.json();
```

### Update a profile
```typescript
const response = await fetch('/api/profiles', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'uuid-here',
    role: 'scheduler',
    // ... other fields to update
  }),
});
const { data } = await response.json();
```

### Search directory
```typescript
const response = await fetch(
  `/api/directory?search=Smith&specialty=Cardiology`
);
const { data, count } = await response.json();
```

## Authentication & Authorization

**TODO**: Add authentication middleware to protect routes based on user roles.

Consider adding:
- Session validation
- Role-based access control (RBAC)
- Rate limiting
- Input validation with Zod

## Migration from Supabase

All hooks and API routes have been migrated to use Drizzle ORM for all database queries. Supabase is now only used for authentication/session in server-side logic.

Migration pattern:
1. Create an API route for the entity
2. Move all database logic to the route using Drizzle ORM
3. Update the React hook/component to fetch from the API
4. Remove Supabase client imports from client components

## Next Steps

1. Add authentication middleware to protect API routes based on user roles
2. Add input validation with Zod schemas
3. Add rate limiting for public endpoints
4. Create API documentation with OpenAPI/Swagger
