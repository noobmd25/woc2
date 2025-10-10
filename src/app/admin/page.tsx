"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import dynamic from "next/dynamic";
import { getBrowserClient } from "@/lib/supabase/client";
import { usePageRefresh } from "@/components/PullToRefresh";

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
  const supabase = getBrowserClient();
  const [role, setRole] = React.useState<string | undefined>(undefined);
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
        setRole(undefined);
        return;
      }
      const { data: dbProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!mounted) return;
      if (dbProfile?.role) {
        setRole(dbProfile.role as string);
      } else {
        const meta: any = user.user_metadata as any;
        setRole((meta && meta.role) as string | undefined);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [activeTab, setActiveTab] = React.useState<TabKey>("integrity");
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

  usePageRefresh(null); // full reload on pull-to-refresh (counts rehydrated after reload)

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
      if (t === "access" && role !== "admin") {
        setActiveTab("integrity");
      } else {
        setActiveTab(t);
      }
    } else {
      const defaultTab = role === "admin" ? "access" : "integrity";
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
  }, [role, searchParams, pathname, router]);

  // When activeTab changes, reflect it in the URL only if different
  React.useEffect(() => {
    if (!initedFromURLRef.current) return; // wait for init
    if (activeTab === "access" && role !== "admin") {
      setActiveTab("integrity");
      return;
    }
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

  const tabs: { key: TabKey; label: string }[] = [];
  if (role === "admin") {
    tabs.push({ key: "access", label: "Access Management" });
  }
  tabs.push(
    { key: "integrity", label: "Data Integrity" },
    { key: "errors", label: "Error Reports" },
    { key: "audit", label: "Audit Logs" },
    { key: "announcements", label: "Announcements" },
    { key: "usage", label: "Usage Stats" },
  );

  return (
    <>
      <Header />
      <div className="p-4 sm:p-6 lg:p-8">
        <nav
          className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto -mx-4 sm:mx-0 px-4"
          role="tablist"
          aria-label="Admin sections"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <ul className="flex -mb-px space-x-6 text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap snap-x snap-mandatory">
            {tabs.map((tab) => (
              <li key={tab.key} className="shrink-0 snap-start">
                <button
                  role="tab"
                  className={`inline-block p-4 border-b-2 ${
                    activeTab === tab.key
                      ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                      : "border-transparent hover:text-gray-800 dark:hover:text-gray-100"
                  }`}
                  aria-selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-3 text-xs text-gray-400">
          Active tab: {activeTab}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 py-4 sm:py-6">
          {role === "admin" && (
            <DashboardCard
              title="Pending Access"
              value={counts.pendingAccess}
              onClick={() => setActiveTab("access")}
            />
          )}
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

        {/* Replaced inline test sections with a single Testing button and modal */}
        {role === "admin" && (
          <div className="my-4 flex justify-end">
            <button
              onClick={() => setTestingOpen(true)}
              className="inline-flex items-center px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm shadow"
              aria-haspopup="dialog"
              aria-expanded={testingOpen}
            >
              🧪 Testing
            </button>
          </div>
        )}

        <section className="py-6">
          {role === "admin" && activeTab === "access" && (
            <>
              <AccessRequests />
            </>
          )}
          {activeTab === "integrity" && <IntegrityStub />}
          {activeTab === "errors" && <ErrorsStub />}
          {activeTab === "audit" && <AuditStub />}
          {activeTab === "announcements" && <AnnouncementsStub />}
          {activeTab === "usage" && <UsageStub />}
        </section>
      </div>

      {/* Testing Modal */}
      {role === "admin" && testingOpen && (
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
    </>
  );
}

// Wrap the page in a Suspense boundary to satisfy Next.js requirement for useSearchParams
export default function Page() {
  return (
    <React.Suspense
      fallback={<div className="p-4 text-gray-600">Loading…</div>}
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
      className="block w-full text-left rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 sm:p-3 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <div className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
        {title}
      </div>
      <div className="mt-0.5 sm:mt-1 text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </div>
    </button>
  );
}

function IntegrityStub() {
  return <div>Data Integrity content</div>;
}
function ErrorsStub() {
  return <div>Error Reports content</div>;
}
function AuditStub() {
  return <div>Audit Logs content</div>;
}
function AnnouncementsStub() {
  return <div>Announcements content</div>;
}
function UsageStub() {
  return (
    <div id="usage" className="space-y-4">
      <h2 className="text-xl font-semibold">Usage Statistics</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Wire this to your analytics store + daily aggregates.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500">This Week</div>
          <div className="text-2xl font-semibold">312</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500">Unique Users</div>
          <div className="text-2xl font-semibold">148</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500">Avg. Sessions/User</div>
          <div className="text-2xl font-semibold">1.7</div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="font-medium mb-2">Visits by Day (last 14 days)</div>
        <div className="h-48 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 text-sm">
          Chart placeholder
        </div>
        <div className="mt-2 text-xs text-gray-500">
          TODO: wire to a tiny line chart.
        </div>
      </div>
    </div>
  );
}
