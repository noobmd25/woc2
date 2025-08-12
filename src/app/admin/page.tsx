'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import Header from '@/components/Header';

type TabKey =
  | 'access'
  | 'integrity'
  | 'errors'
  | 'audit'
  | 'announcements'
  | 'usage';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'access', label: 'Access Requests' },
  { key: 'integrity', label: 'Data Integrity' },
  { key: 'errors', label: 'Error Reports' },
  { key: 'audit', label: 'Audit Logs' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'usage', label: 'Usage Stats' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('access');
  const [counts, setCounts] = useState({
    pendingAccess: 0,
    integrityIssues: 0,
    openErrors: 0,
    last24hEvents: 0,
    activeBanners: 0,
    weeklyVisits: 0,
    topUsersCount: 0,
  });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingUserRole, setLoadingUserRole] = useState(true);

  useEffect(() => {
    // Placeholder counts
    setCounts({
      pendingAccess: 12,
      integrityIssues: 3,
      openErrors: 7,
      last24hEvents: 45,
      activeBanners: 2,
      weeklyVisits: 312,
      topUsersCount: 5,
    });
  }, []);

  useEffect(() => {
    async function fetchUserRole() {
      setLoadingUserRole(true);
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) {
        setUserRole(null);
        setLoadingUserRole(false);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (error) {
        setUserRole(null);
      } else {
        setUserRole(data?.role ?? null);
      }
      setLoadingUserRole(false);
    }
    fetchUserRole();
  }, []);

  if (loadingUserRole) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Header />
      <div className="p-4 sm:p-6 lg:p-8">
        <div>
          <nav className="border-b border-gray-200 dark:border-gray-700">
            <ul className="flex -mb-px space-x-6 text-sm font-medium text-gray-600 dark:text-gray-300">
              {tabs.map(tab => (
                <li key={tab.key}>
                  <button
                    className={`inline-block p-4 border-b-2 ${
                      activeTab === tab.key
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent hover:text-gray-800 dark:hover:text-gray-100'
                    }`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 py-6">
            <DashboardCard title="Pending Access" value={counts.pendingAccess} href="#access" onClick={() => setActiveTab('access')} />
            <DashboardCard title="Integrity Issues" value={counts.integrityIssues} href="#integrity" onClick={() => setActiveTab('integrity')} />
            <DashboardCard title="Open Errors" value={counts.openErrors} href="#errors" onClick={() => setActiveTab('errors')} />
            <DashboardCard title="Last 24h Events" value={counts.last24hEvents} href="#audit" onClick={() => setActiveTab('audit')} />
            <DashboardCard title="Active Banners" value={counts.activeBanners} href="#announcements" onClick={() => setActiveTab('announcements')} />
            <DashboardCard title="Weekly Visits" value={counts.weeklyVisits} href="#usage" onClick={() => setActiveTab('usage')} />
          </div>

          {/* Tab content */}
          <section className="py-6">
            {activeTab === 'access' && userRole === 'admin' && <AccessRequestsStub />}
            {activeTab === 'integrity' && <IntegrityStub />}
            {activeTab === 'errors' && <ErrorsStub />}
            {activeTab === 'audit' && <AuditStub />}
            {activeTab === 'announcements' && <AnnouncementsStub />}
            {activeTab === 'usage' && <UsageStub />}
          </section>
        </div>
      </div>
    </>
  );
}

function DashboardCard({ title, value, href, onClick }: { title: string; value: number; href: string; onClick: () => void }) {
  return (
    <a href={href} onClick={e => { e.preventDefault(); onClick(); }} className="block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</div>
    </a>
  );
}

function AccessRequestsStub() {
  type RoleRequest = {
    id: string;
    user_id: string | null;
    email: string;
    provider_type: string | null;
    requested_role: 'viewer' | 'scheduler' | 'admin';
    justification: string | null;
    metadata: any | null;
    status: 'pending' | 'approved' | 'denied' | 'withdrawn';
    decided_by: string | null;
    decided_at: string | null;
    decision_reason: string | null;
    source: string | null;
    created_at: string;
    updated_at: string;
  };

  const [rows, setRows] = React.useState<RoleRequest[] | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actingId, setActingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('role_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows(data as RoleRequest[]);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: string) => {
    try {
      setActingId(id);
      const { data: userRes } = await supabase.auth.getUser();
      const decider = userRes?.user?.id;
      if (!decider) throw new Error('No authenticated user');
      const { error } = await supabase.rpc('approve_role_request', {
        p_request_id: id,
        p_decider: decider,
      });
      if (error) throw error;
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Approve failed');
    } finally {
      setActingId(null);
    }
  };

  const deny = async (id: string) => {
    try {
      setActingId(id);
      const { data: userRes } = await supabase.auth.getUser();
      const decider = userRes?.user?.id;
      if (!decider) throw new Error('No authenticated user');
      const reason = prompt('Reason for denial (optional):') ?? '';
      const { error } = await supabase.rpc('deny_role_request', {
        p_request_id: id,
        p_decider: decider,
        p_reason: reason,
      });
      if (error) throw error;
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Deny failed');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Access Requests & Approvals</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">Approve or deny pending role requests. Approvals update <code>profiles.role</code> and stamp the request.</p>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 flex items-center justify-between">
          <div className="font-medium">Pending Requests</div>
          <button onClick={load} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 px-4">Email</th>
                <th className="py-2 px-4">Provider Type</th>
                <th className="py-2 px-4">Requested Role</th>
                <th className="py-2 px-4">Justification</th>
                <th className="py-2 px-4">Created</th>
                <th className="py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="py-4 px-4" colSpan={6}>Loading…</td></tr>
              ) : rows && rows.length > 0 ? (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="py-2 px-4">{r.email}</td>
                    <td className="py-2 px-4">{r.provider_type ?? '-'}</td>
                    <td className="py-2 px-4 capitalize">{r.requested_role}</td>
                    <td className="py-2 px-4 max-w-[22rem] truncate" title={r.justification ?? ''}>{r.justification ?? '-'}</td>
                    <td className="py-2 px-4">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => approve(r.id)}
                          disabled={actingId === r.id}
                          className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {actingId === r.id ? 'Working…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => deny(r.id)}
                          disabled={actingId === r.id}
                          className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
                        >
                          Deny
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td className="py-6 px-4 text-gray-500" colSpan={6}>No pending requests.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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
      <p className="text-sm text-gray-600 dark:text-gray-300">Weekly visits and top users. Wire this to a lightweight analytics table and daily aggregation view.</p>

      {/* KPI row */}
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

      {/* Chart placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="font-medium mb-2">Visits by Day (last 14 days)</div>
        <div className="h-48 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 text-sm">
          Chart placeholder
        </div>
        <div className="mt-2 text-xs text-gray-500">TODO: Create a tiny line chart (client-only) or server-rendered sparkline using aggregated data.</div>
      </div>

      {/* Top users table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="font-medium mb-2">Top 5 Users (by sessions)</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">User</th>
                <th className="py-2 pr-4">Sessions</th>
                <th className="py-2 pr-4">Last Visit</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-2 pr-4">jane.doe@example.com</td>
                <td className="py-2 pr-4">22</td>
                <td className="py-2 pr-4">2025-08-08 14:31</td>
              </tr>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-2 pr-4">john.smith@example.com</td>
                <td className="py-2 pr-4">19</td>
                <td className="py-2 pr-4">2025-08-09 10:02</td>
              </tr>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-2 pr-4">maria.rios@example.com</td>
                <td className="py-2 pr-4">17</td>
                <td className="py-2 pr-4">2025-08-09 18:05</td>
              </tr>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-2 pr-4">ahernandez@example.com</td>
                <td className="py-2 pr-4">15</td>
                <td className="py-2 pr-4">2025-08-10 08:12</td>
              </tr>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="py-2 pr-4">l.garcia@example.com</td>
                <td className="py-2 pr-4">13</td>
                <td className="py-2 pr-4">2025-08-07 21:47</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-gray-500">TODO: Back this with `page_views` + `daily_page_views` (view) + `top_users_last_7d` (view/RPC). Anonymize or hash emails if needed.</div>
      </div>
    </div>
  );
}
