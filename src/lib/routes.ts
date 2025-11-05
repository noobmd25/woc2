// Application Routes
export const ROUTES = {
    // Main Pages
    HOME: "/",
    DIRECTORY: "/directory",
    ONCALL: "/oncall",
    SCHEDULE: "/schedule",

    // Admin
    ADMIN: "/admin",

    // Authentication
    AUTH: {
        LOGIN: "/auth/login",
        SIGNUP: "/auth/signup",
        REQUEST: "/auth/request",
        PENDING: "/auth/pending",
    },

    // Schedule Sub-routes
    SCHEDULE_MMM_MEDICAL_GROUPS: "/schedule/mmm-medical-groups",
    SCHEDULE_VITAL_MEDICAL_GROUPS: "/schedule/vital-medical-groups",

    // Other Pages
    UNAUTHORIZED: "/unauthorized",
    UPDATE_PASSWORD: "/update-password",

    // API Routes
    API: {
        // Auth
        AUTH_LOGIN: "/api/auth/login",
        AUTH_SIGNUP: "/api/auth/signup",

        // Admin
        ADMIN_APPROVE_USER: "/api/admin/approve-user",
        ADMIN_FORCE_PASSWORD_RESET: "/api/admin/force-password-reset",
        ADMIN_TEST_APPROVAL_EMAIL: "/api/admin/test-approval-email",
        ADMIN_TEST_EMAIL: "/api/admin/test-email",

        // Analytics
        ANALYTICS_USAGE: "/api/analytics/usage",

        // Data
        DIRECTORY: "/api/directory",
        ONCALL: "/api/oncall",
        PROFILES: "/api/profiles",
        ROLE_REQUESTS: "/api/role-requests",
        SCHEDULES: "/api/schedules",
        SCHEDULES_EXAMPLE: "/api/schedules-example",
        SPECIALTIES: "/api/specialties",
        USERS: "/api/users",

        // Medical Groups
        MMM_MEDICAL_GROUPS: "/api/mmm-medical-groups",
        VITAL_MEDICAL_GROUPS: "/api/vital-medical-groups",

        // Utils
        COOKIE_SYNC: "/api/cookie-sync",
        DEBUG_COOKIES: "/api/debug-cookies",
        DEBUG_SESSION: "/api/debug-session",
    },
} as const;

// Type for route keys
export type RouteKey = keyof typeof ROUTES;

// Helper function to get route by key
export const getRoute = (key: RouteKey) => ROUTES[key];

// Helper function to check if current path matches route
export const isActiveRoute = (currentPath: string, route: string) => {
    if (route === "/") {
        return currentPath === "/";
    }
    return currentPath.startsWith(route);
};