'use client';

import * as React from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import dynamic from 'next/dynamic';
import { getBrowserClient } from '@/lib/supabase/client';
import { usePageRefresh } from '@/components/PullToRefresh';

const AccessRequests = dynamic(() => import('@/components/admin/AccessRequests'), {
  ssr: false,
  loading: () => <div className="p-4 text-gray-600">Loading access requests…</div>,
});

// Type for tab keys
type TabKey = 'access' | 'integrity' | 'errors' | 'audit' | 'announcements' | 'usage';

function PageContent() {
  const supabase = getBrowserClient();
  const [role, setRole] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        setRole(undefined);
        return;
      }
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!mounted) return;
      if (dbProfile?.role) {
        setRole(dbProfile.role as string);
      } else {
        const meta: any = user.user_metadata as any;
        setRole((meta && meta.role) as string | undefined);
      }
    })();
    return () => { mounted = false; };
  }, [supabase]);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [activeTab, setActiveTab] = React.useState<TabKey>('integrity');
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
          .from('role_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        const cnt = typeof (res.count) === 'number' ? res.count : 0;
        if (mounted) setCounts((c) => ({ ...c, pendingAccess: cnt }));
      } catch {
        // ignore errors (non-critical)
      }
    };

    fetchPending();
    const id = setInterval(fetchPending, 10000); // refresh every 10s
    return () => { mounted = false; clearInterval(id); };
  }, [supabase]);

  usePageRefresh(async () => {
    try {
      const res = await supabase
        .from('role_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      const cnt = typeof (res.count) === 'number' ? res.count : 0;
      setCounts(c => ({ ...c, pendingAccess: cnt }));
    } catch {}
  });

  // Helper to validate a tab value
  const isValidTab = (t: string | null): t is TabKey => !!t && ['access','integrity','errors','audit','announcements','usage'].includes(t);

  // Initialize from URL once on mount; if missing/invalid, set a default and write it once
  React.useEffect(() => {
    if (initedFromURLRef.current) return;
    lastQSRef.current = null; // reset once
    const t = searchParams.get('tab');
    if (isValidTab(t)) {
      if (t === 'access' && role !== 'admin') {
        setActiveTab('integrity');
      } else {
        setActiveTab(t);
      }
    } else {
      const defaultTab = role === 'admin' ? 'access' : 'integrity';
      const q = new URLSearchParams(searchParams.toString());
      q.set('tab', defaultTab);
      const newQS = q.toString();
      const currentQS = typeof window !== 'undefined' ? window.location.search.slice(1) : searchParams.toString();
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
    if (activeTab === 'access' && role !== 'admin') {
      setActiveTab('integrity');
      return;
    }
    const current = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('tab')
      : searchParams.get('tab');
    if (current !== activeTab) {
      const q = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams(searchParams.toString());
      q.set('tab', activeTab);
      const newQS2 = q.toString();
      const currentQS2 = typeof window !== 'undefined' ? window.location.search.slice(1) : searchParams.toString();
      if (currentQS2 !== newQS2 && lastQSRef.current !== newQS2) {
        const newURL2 = `${pathname}?${newQS2}`;
        router.replace(newURL2, { scroll: false });
        lastQSRef.current = newQS2;
      }
    }
  }, [activeTab, pathname, router, role, searchParams]);

  const tabs: { key: TabKey; label: string }[] = [];
  if (role === 'admin') {
    tabs.push({ key: 'access', label: 'Access Management' });
  }
  tabs.push(
    { key: 'integrity', label: 'Data Integrity' },
    { key: 'errors', label: 'Error Reports' },
    { key: 'audit', label: 'Audit Logs' },
    { key: 'announcements', label: 'Announcements' },
    { key: 'usage', label: 'Usage Stats' },
  );

  return (
    <>
      <Header />
      <div className="p-4 sm:p-6 lg:p-8">
        <nav className="border-b border-gray-200 dark:border-gray-700">
          <ul className="flex -mb-px space-x-6 text-sm font-medium text-gray-600 dark:text-gray-300">
            {tabs.map((tab) => (
              <li key={tab.key}>
                <button
                  className={`inline-block p-4 border-b-2 ${
                    activeTab === tab.key
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent hover:text-gray-800 dark:hover:text-gray-100'
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

        <div className="mt-3 text-xs text-gray-400">Active tab: {activeTab}</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 py-6">
          {role === 'admin' && (
            <DashboardCard title="Pending Access" value={counts.pendingAccess} onClick={() => setActiveTab('access')} />
          )}
          <DashboardCard title="Integrity Issues" value={counts.integrityIssues} onClick={() => setActiveTab('integrity')} />
          <DashboardCard title="Open Errors" value={counts.openErrors} onClick={() => setActiveTab('errors')} />
          <DashboardCard title="Last 24h Events" value={counts.last24hEvents} onClick={() => setActiveTab('audit')} />
          <DashboardCard title="Active Banners" value={counts.activeBanners} onClick={() => setActiveTab('announcements')} />
          <DashboardCard title="Weekly Visits" value={counts.weeklyVisits} onClick={() => setActiveTab('usage')} />
        </div>

        <section className="py-6">
          {role === 'admin' && activeTab === 'access' && (
            <>
              <AccessRequests />
            </>
          )}
          {activeTab === 'integrity' && <IntegrityStub />}
          {activeTab === 'errors' && <ErrorsStub />}
          {activeTab === 'audit' && <AuditStub />}
          {activeTab === 'announcements' && <AnnouncementsStub />}
          {activeTab === 'usage' && <UsageStub />}
        </section>
      </div>
    </>
  );
}

// Wrap the page in a Suspense boundary to satisfy Next.js requirement for useSearchParams
export default function Page() {
  return (
    <React.Suspense fallback={<div className="p-4 text-gray-600">Loading…</div>}>
      <PageContent />
    </React.Suspense>
  );
}

function DashboardCard({ title, value, onClick }: { title: string; value: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="block w-full text-left rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</div>
    </button>
  );
}

function IntegrityStub() { return <div>Data Integrity content</div>; }
function ErrorsStub() { return <div>Error Reports content</div>; }
function AuditStub() { return <div>Audit Logs content</div>; }
function AnnouncementsStub() { return <div>Announcements content</div>; }
function UsageStub() {
  return (
    <div id="usage" className="space-y-4">
      <h2 className="text-xl font-semibold">Usage Statistics</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">Wire this to your analytics store + daily aggregates.</p>
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
        <div className="mt-2 text-xs text-gray-500">TODO: wire to a tiny line chart.</div>
      </div>
    </div>
  );
}
