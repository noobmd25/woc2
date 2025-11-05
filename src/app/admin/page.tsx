"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useEffect, useState } from "react";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getBrowserClient } from "@/lib/supabase/client";

const AccessRequests = dynamic(
  () => import("@/components/admin/AccessRequests"),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-gray-600">Loading access requests…</div>
    ),
  },
);

// Type for tab keys
type TabKey =
  | "access"
  | "integrity"
  | "errors"
  | "audit"
  | "announcements"
  | "usage";

function PageContent() {
  const router = useRouter();
  const supabase = getBrowserClient();
  const [role, setRole] = React.useState<string | undefined>(undefined);
  const [loading, setLoading] = React.useState(true);
  const [sendingTest, setSendingTest] = React.useState(false);
  const [testResult, setTestResult] = React.useState<string | null>(null);
  const [sendingApproval, setSendingApproval] = React.useState(false);
  const [approvalResult, setApprovalResult] = React.useState<string | null>(
    null,
  );
  // New: testing modal visibility
  const [testingOpen, setTestingOpen] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        router.push("/auth/login");
        return;
      }
      const { data: dbProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!mounted) return;

      const userRole = dbProfile?.role || (user.user_metadata as any)?.role;

      // Redirect if not admin
      if (userRole !== "admin") {
        router.push("/unauthorized");
        return;
      }

      setRole(userRole as string);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [supabase, router]);

  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = React.useState<TabKey>("access");
  const initedFromURLRef = React.useRef(false);
  const lastQSRef = React.useRef<string | null>(null);

  const [counts, setCounts] = React.useState({
    pendingAccess: 0,
    integrityIssues: 3,
    openErrors: 7,
    last24hEvents: 45,
    activeBanners: 2,
    weeklyVisits: 312,
  });

  // Fetch pending access count from role_requests (pending) and refresh periodically
  React.useEffect(() => {
    let mounted = true;
    const fetchPending = async () => {
      try {
        const res = await supabase
          .from("role_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending");
        const cnt = typeof res.count === "number" ? res.count : 0;
        if (mounted) setCounts((c) => ({ ...c, pendingAccess: cnt }));
      } catch {
        // ignore errors (non-critical)
      }
    };

    fetchPending();
    const id = setInterval(fetchPending, 10000); // refresh every 10s
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [supabase]);

  // Helper to validate a tab value
  const isValidTab = (t: string | null): t is TabKey =>
    !!t &&
    [
      "access",
      "integrity",
      "errors",
      "audit",
      "announcements",
      "usage",
    ].includes(t);

  // Initialize from URL once on mount; if missing/invalid, set a default and write it once
  React.useEffect(() => {
    if (initedFromURLRef.current) return;
    lastQSRef.current = null; // reset once
    const t = searchParams.get("tab");
    if (isValidTab(t)) {
      setActiveTab(t);
    } else {
      const defaultTab = "access";
      const q = new URLSearchParams(searchParams.toString());
      q.set("tab", defaultTab);
      const newQS = q.toString();
      const currentQS =
        typeof window !== "undefined"
          ? window.location.search.slice(1)
          : searchParams.toString();
      if (currentQS !== newQS && lastQSRef.current !== newQS) {
        const newURL = `${pathname}?${newQS}`;
        router.replace(newURL, { scroll: false });
        lastQSRef.current = newQS;
      }
      setActiveTab(defaultTab);
    }
    initedFromURLRef.current = true;
  }, [searchParams, pathname, router]);

  // When activeTab changes, reflect it in the URL only if different
  React.useEffect(() => {
    if (!initedFromURLRef.current) return; // wait for init
    const current =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("tab")
        : searchParams.get("tab");
    if (current !== activeTab) {
      const q =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams(searchParams.toString());
      q.set("tab", activeTab);
      const newQS2 = q.toString();
      const currentQS2 =
        typeof window !== "undefined"
          ? window.location.search.slice(1)
          : searchParams.toString();
      if (currentQS2 !== newQS2 && lastQSRef.current !== newQS2) {
        const newURL2 = `${pathname}?${newQS2}`;
        router.replace(newURL2, { scroll: false });
        lastQSRef.current = newQS2;
      }
    }
  }, [activeTab, pathname, router, role, searchParams]);

  const sendTestEmail = async () => {
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "karlunsco26@gmail.com",
          useOnboarding: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const details = data?.details
          ? ` | details: ${JSON.stringify(data.details)}`
          : "";
        setTestResult(`Error: ${data?.error || "Failed"}${details}`);
        return;
      }
      setTestResult(
        `Sent test email (id: ${data.id || "n/a"}) from ${data.from} to ${data.to}`,
      );
    } catch (e: any) {
      setTestResult(`Error: ${e?.message || String(e)}`);
    } finally {
      setSendingTest(false);
    }
  };

  const sendTestApprovalEmail = async () => {
    setSendingApproval(true);
    setApprovalResult(null);
    try {
      const res = await fetch("/api/admin/test-approval-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: "karlunsco26@gmail.com", name: "Karl" }),
      });
      const data = await res.json();
      if (!res.ok) {
        const details = data?.details
          ? ` | details: ${JSON.stringify(data.details)}`
          : "";
        setApprovalResult(`Error: ${data?.error || "Failed"}${details}`);
        return;
      }
      setApprovalResult(
        `Sent approval email (id: ${data.id || "n/a"}) from ${data.from} to ${data.to}`,
      );
    } catch (e: any) {
      setApprovalResult(`Error: ${e?.message || String(e)}`);
    } finally {
      setSendingApproval(false);
    }
  };

  // Close Testing modal with Escape
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && testingOpen) {
        e.preventDefault();
        setTestingOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [testingOpen]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "access", label: "Access Management" },
    { key: "integrity", label: "Data Integrity" },
    { key: "errors", label: "Error Reports" },
    { key: "audit", label: "Audit Logs" },
    { key: "announcements", label: "Announcements" },
    { key: "usage", label: "Usage Stats" },
  ];

  if (loading) {
    return (
      <div className="app-container px-4 py-6 max-w-lg mx-auto dark:bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Admin Dashboard
          </h1>
        </div>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container px-4 py-6 max-w-6xl mx-auto dark:bg-black">
      <div className="space-y-6">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Admin Dashboard
          </h1>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <DashboardCard
            title="Pending Access"
            value={counts.pendingAccess}
            onClick={() => setActiveTab("access")}
          />
          <DashboardCard
            title="Integrity Issues"
            value={counts.integrityIssues}
            onClick={() => setActiveTab("integrity")}
          />
          <DashboardCard
            title="Open Errors"
            value={counts.openErrors}
            onClick={() => setActiveTab("errors")}
          />
          <DashboardCard
            title="Last 24h Events"
            value={counts.last24hEvents}
            onClick={() => setActiveTab("audit")}
          />
          <DashboardCard
            title="Active Banners"
            value={counts.activeBanners}
            onClick={() => setActiveTab("announcements")}
          />
          <DashboardCard
            title="Weekly Visits"
            value={counts.weeklyVisits}
            onClick={() => setActiveTab("usage")}
          />
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {activeTab === "access" && <AccessRequests />}
          {activeTab === "integrity" && <IntegrityStub />}
          {activeTab === "errors" && <ErrorsStub />}
          {activeTab === "audit" && <AuditStub />}
          {activeTab === "announcements" && <AnnouncementsStub />}
          {activeTab === "usage" && <UsageStub />}
        </div>

        {/* Testing Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setTestingOpen(true)}
            className="inline-flex items-center px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm shadow"
            aria-haspopup="dialog"
            aria-expanded={testingOpen}
          >
            🧪 Testing
          </button>
        </div>
      </div>

      {/* Testing Modal */}
      {testingOpen && (
        <div
          className="fixed inset-0 z-[1200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 modal-overlay-in"
          onClick={() => setTestingOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Testing"
        >
          <div
            className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-2xl shadow-xl modal-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Testing</h2>
              <button
                onClick={() => setTestingOpen(false)}
                className="px-3 py-1 rounded border"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium text-amber-900 dark:text-amber-200">
                      Email Pipeline Test
                    </div>
                    <div className="text-sm text-amber-800/90 dark:text-amber-300/90">
                      Sends a test from no-reply@whosoncall.app to
                      karlunsco26@gmail.com
                    </div>
                  </div>
                  <button
                    onClick={sendTestEmail}
                    disabled={sendingTest}
                    className="inline-flex items-center px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm shadow"
                  >
                    {sendingTest ? "Sending…" : "Send Test Email"}
                  </button>
                </div>
                {testResult && (
                  <div className="mt-2 text-xs text-amber-900 dark:text-amber-200 break-all">
                    {testResult}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-md border border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium text-emerald-900 dark:text-emerald-200">
                      Approval Email Test
                    </div>
                    <div className="text-sm text-emerald-800/90 dark:text-emerald-300/90">
                      Sends the approval template from no-reply@whosoncall.app
                      to karlunsco26@gmail.com
                    </div>
                  </div>
                  <button
                    onClick={sendTestApprovalEmail}
                    disabled={sendingApproval}
                    className="inline-flex items-center px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm shadow"
                  >
                    {sendingApproval ? "Sending…" : "Send Test Approval Email"}
                  </button>
                </div>
                {approvalResult && (
                  <div className="mt-2 text-xs text-emerald-900 dark:text-emerald-200 break-all">
                    {approvalResult}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap the page in a Suspense boundary to satisfy Next.js requirement for useSearchParams
export default function Page() {
  return (
    <React.Suspense
      fallback={
        <div className="app-container px-4 py-6 max-w-lg mx-auto dark:bg-black">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Admin Dashboard
            </h1>
          </div>
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        </div>
      }
    >
      <PageContent />
    </React.Suspense>
  );
}

function DashboardCard({
  title,
  value,
  onClick,
}: {
  title: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left w-full"
    >
      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        {title}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </div>
    </button>
  );
}

function IntegrityStub() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Data Integrity Issues</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Monitor and resolve data consistency issues across the system.
      </p>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Issue Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Affected Records</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <TableCell className="font-medium">Missing Data</TableCell>
              <TableCell>Providers without specialty assignment</TableCell>
              <TableCell>3</TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                  Medium
                </span>
              </TableCell>
              <TableCell>Open</TableCell>
              <TableCell>
                <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm">
                  Review
                </button>
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <TableCell className="font-medium">Duplicate Entries</TableCell>
              <TableCell>Duplicate schedule entries for same date</TableCell>
              <TableCell>2</TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                  High
                </span>
              </TableCell>
              <TableCell>Open</TableCell>
              <TableCell>
                <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm">
                  Review
                </button>
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <TableCell className="font-medium">Orphaned Records</TableCell>
              <TableCell>Schedule entries with deleted providers</TableCell>
              <TableCell>1</TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                  Medium
                </span>
              </TableCell>
              <TableCell>Resolved</TableCell>
              <TableCell>
                <button className="text-gray-400 cursor-not-allowed text-sm">
                  Resolved
                </button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="font-bold text-gray-900 dark:text-white">Missing Data</div>
            <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              Medium
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Providers without specialty assignment
          </p>
          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-600 dark:text-gray-400">Affected:</span>
            <span className="font-medium">3 records</span>
          </div>
          <button className="w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm">
            Review
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="font-bold text-gray-900 dark:text-white">Duplicate Entries</div>
            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
              High
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Duplicate schedule entries for same date
          </p>
          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-600 dark:text-gray-400">Affected:</span>
            <span className="font-medium">2 records</span>
          </div>
          <button className="w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm">
            Review
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorsStub() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Error Reports</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Track and monitor system errors and exceptions.
      </p>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Error Type</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <TableCell className="font-medium">2024-01-15 14:32</TableCell>
              <TableCell>API Error</TableCell>
              <TableCell className="max-w-xs truncate">Failed to fetch schedule data</TableCell>
              <TableCell>user@example.com</TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                  Unresolved
                </span>
              </TableCell>
              <TableCell>
                <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm">
                  Details
                </button>
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <TableCell className="font-medium">2024-01-15 14:25</TableCell>
              <TableCell>Validation</TableCell>
              <TableCell className="max-w-xs truncate">Invalid phone number format</TableCell>
              <TableCell>admin@example.com</TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  Resolved
                </span>
              </TableCell>
              <TableCell>
                <button className="text-gray-400 cursor-not-allowed text-sm">
                  Resolved
                </button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="font-bold text-gray-900 dark:text-white">API Error</div>
            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
              Unresolved
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Failed to fetch schedule data
          </p>
          <div className="space-y-1 text-sm mb-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">User:</span>
              <span className="font-medium">user@example.com</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Time:</span>
              <span className="font-medium">2024-01-15 14:32</span>
            </div>
          </div>
          <button className="w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

function AuditStub() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Audit Logs</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Track all administrative actions and system changes.
      </p>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <TableCell className="font-medium">2024-01-15 14:30</TableCell>
              <TableCell>admin@example.com</TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  Update
                </span>
              </TableCell>
              <TableCell>Provider: Dr. Smith</TableCell>
              <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                Updated specialty
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <TableCell className="font-medium">2024-01-15 14:25</TableCell>
              <TableCell>admin@example.com</TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  Create
                </span>
              </TableCell>
              <TableCell>Schedule Entry</TableCell>
              <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                Added on-call schedule
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <TableCell className="font-medium">2024-01-15 14:20</TableCell>
              <TableCell>admin@example.com</TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                  Delete
                </span>
              </TableCell>
              <TableCell>Provider: Dr. Jones</TableCell>
              <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                Removed provider
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="font-bold text-gray-900 dark:text-white">Provider Updated</div>
            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              Update
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Dr. Smith - Updated specialty
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">User:</span>
              <span className="font-medium">admin@example.com</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Time:</span>
              <span className="font-medium">2024-01-15 14:30</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="font-bold text-gray-900 dark:text-white">Schedule Created</div>
            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              Create
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Schedule Entry - Added on-call schedule
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">User:</span>
              <span className="font-medium">admin@example.com</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Time:</span>
              <span className="font-medium">2024-01-15 14:25</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnouncementsStub() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Announcements</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Manage system-wide announcements and notifications.
      </p>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <TableCell className="font-medium">System Maintenance</TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  Info
                </span>
              </TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  Active
                </span>
              </TableCell>
              <TableCell>2024-01-15</TableCell>
              <TableCell>2024-01-20</TableCell>
              <TableCell>
                <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm mr-2">
                  Edit
                </button>
                <button className="text-red-600 hover:text-red-800 dark:text-red-400 text-sm">
                  Delete
                </button>
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <TableCell className="font-medium">New Feature Release</TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  Update
                </span>
              </TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                  Scheduled
                </span>
              </TableCell>
              <TableCell>2024-01-14</TableCell>
              <TableCell>2024-01-21</TableCell>
              <TableCell>
                <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm mr-2">
                  Edit
                </button>
                <button className="text-red-600 hover:text-red-800 dark:text-red-400 text-sm">
                  Delete
                </button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="font-bold text-gray-900 dark:text-white">System Maintenance</div>
            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              Active
            </span>
          </div>
          <div className="mb-3">
            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              Info
            </span>
          </div>
          <div className="space-y-1 text-sm mb-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Created:</span>
              <span className="font-medium">2024-01-15</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Expires:</span>
              <span className="font-medium">2024-01-20</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm">
              Edit
            </button>
            <button className="flex-1 px-3 py-2 rounded border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 text-sm">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageStub() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const res = await fetch('/api/analytics/usage');
        if (!res.ok) {
          throw new Error('Failed to fetch analytics');
        }
        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        console.error('Failed to fetch analytics:', err);
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Usage Statistics</h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Usage Statistics</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Track page views and user engagement across the platform. Data from Vercel Analytics.
      </p>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">OnCall Page Views</div>
          <div className="text-2xl font-bold mt-1">{stats?.oncall?.total || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Last 7 days</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Directory Page Views</div>
          <div className="text-2xl font-bold mt-1">{stats?.directory?.total || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Last 7 days</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Unique Users</div>
          <div className="text-2xl font-bold mt-1">{stats?.uniqueUsers || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Last 7 days</div>
        </div>
      </div>

      {/* Detailed Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold mb-3">OnCall Page Analytics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Views:</span>
              <span className="font-medium">{stats?.oncall?.total || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Unique Users:</span>
              <span className="font-medium">{stats?.oncall?.uniqueUsers || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Avg. Session Time:</span>
              <span className="font-medium">{stats?.oncall?.avgSessionTime || 0}s</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold mb-3">Directory Page Analytics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Views:</span>
              <span className="font-medium">{stats?.directory?.total || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Unique Users:</span>
              <span className="font-medium">{stats?.directory?.uniqueUsers || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Avg. Session Time:</span>
              <span className="font-medium">{stats?.directory?.avgSessionTime || 0}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="font-semibold mb-3">Page Views Trend</h3>
        <div className="h-48 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
          Chart visualization - Coming soon
        </div>
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
          View detailed analytics in your{" "}
          <a
            href="https://vercel.com/analytics"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Vercel Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
