'use client';

import * as React from 'react';
import { getBrowserClient } from '@/lib/supabase/client';

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

type PendingProfile = {
  id: string;
  email: string | null;
  provider_type: string | null;
  role: 'viewer' | 'scheduler' | 'admin' | null;
  status: 'pending' | 'approved' | 'denied' | 'revoked' | null;
  created_at?: string;
  updated_at?: string;
};

export default function AccessRequests() {
  const supabase = getBrowserClient();
  const [rows, setRows] = React.useState<RoleRequest[] | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actingId, setActingId] = React.useState<string | null>(null);
  const [backfilling, setBackfilling] = React.useState<boolean>(false);
  const [missingCount, setMissingCount] = React.useState<number>(0);
  const [profilesById, setProfilesById] = React.useState<Record<string, { full_name: string | null }>>({});

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editRole, setEditRole] = React.useState<'viewer' | 'scheduler' | 'admin'>('viewer');

  const computeMissingCount = React.useCallback(async () => {
    // Try server-side counter first (security definer). If it doesn't exist, fall back to client calc.
    try {
      const { data, error } = await supabase.rpc('count_missing_role_requests');
      if (!error && typeof data === 'number') {
        setMissingCount(data);
        return;
      }
      // fallthrough to client-side if RPC missing or errored
    } catch (_) {}

    // Fallback: client-side count using two queries
    const [{ data: pendProfiles, error: profErr }, { data: pendReqs, error: reqErr }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id')
        .eq('status', 'pending'),
      supabase
        .from('role_requests')
        .select('user_id')
        .eq('status', 'pending'),
    ]);

    if (!profErr && !reqErr) {
      const pendingSet = new Set((pendReqs ?? []).map((r: any) => r.user_id));
      const missing = (pendProfiles ?? []).filter((p: any) => !pendingSet.has(p.id));
      setMissingCount(missing.length);
    }
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1) Load pending role requests (source of truth for approvals)
    const { data, error } = await supabase
      .from('role_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as RoleRequest[]);
      // Fetch profile names for the listed requests (best-effort; ignore errors)
      const list = (data ?? []) as RoleRequest[];
      const ids = Array.from(new Set(list.map(r => r.user_id).filter((v): v is string => Boolean(v))));
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', ids);
        if (profs && Array.isArray(profs)) {
          const map: Record<string, { full_name: string | null }> = {};
          for (const p of profs) {
            if (p && p.id) map[p.id] = { full_name: (p as any).full_name ?? null };
          }
          setProfilesById(map);
          console.log('[AccessRequests] name map', map);
        } else {
          setProfilesById({});
        }
      } else {
        setProfilesById({});
      }
    }

    // 2) Compute how many pending profiles lack a pending role_request (for backfill notification)
    await computeMissingCount();

    setLoading(false);
  }, [computeMissingCount]);

  React.useEffect(() => {
    load();
  }, [load]);

  const beginEdit = (req: RoleRequest) => {
    setEditingId(req.id);
    setEditRole(req.requested_role);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (req: RoleRequest) => {
    try {
      setActingId(req.id);
      setError(null);
      const { error } = await supabase
        .from('role_requests')
        .update({ requested_role: editRole })
        .eq('id', req.id);
      if (error) throw error;
      await load();
      setEditingId(null);
    } catch (e: any) {
      setError(e.message ?? 'Failed to update role');
    } finally {
      setActingId(null);
    }
  };

  const approve = async (req: RoleRequest) => {
    try {
      setActingId(req.id);
      const { data: userRes } = await supabase.auth.getUser();
      const decider = userRes?.user?.id;
      if (!decider) throw new Error('No authenticated user');

      console.log('[approve] sending', {
        p_request_id: req.id,
        p_decider: decider,
        p_role: (req.requested_role as any) ?? 'viewer',
        p_reason: null,
      });

      const { error } = await supabase.rpc('approve_role_request', {
        p_request_id: req.id,
        p_decider: decider,
        p_role: (req.requested_role as any) ?? 'viewer',
        p_reason: null,
      });
      if (error) throw error;

      if (req.email) {
        const origin =
          (typeof window !== 'undefined' && window.location.origin) ||
          process.env.NEXT_PUBLIC_SITE_URL ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        await supabase.auth.resetPasswordForEmail(req.email, {
          redirectTo: `${origin}/auth/update-password`,
        });
      }

      await load();
    } catch (e: any) {
      setError(e.message ?? 'Approve failed');
    } finally {
      setActingId(null);
    }
  };

  const deny = async (req: RoleRequest) => {
    try {
      setActingId(req.id);
      const { data: userRes } = await supabase.auth.getUser();
      const decider = userRes?.user?.id;
      if (!decider) throw new Error('No authenticated user');

      const reason = prompt('Reason for denial (optional):') ?? '';
      const { error } = await supabase.rpc('deny_role_request', {
        p_request_id: req.id,
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

  const backfillMissing = async () => {
    try {
      setBackfilling(true);
      setError(null);

      // Prefer server-side RPC (security definer) to bypass RLS
      const { data, error } = await supabase.rpc('backfill_missing_role_requests');
      if (error) {
        // Surface a clear action item if the function isn't installed
        setError(
          error.message?.includes('function backfill_missing_role_requests')
            ? 'Server function backfill_missing_role_requests() is missing. Please run the provided SQL to create it.'
            : `Backfill failed: ${error.message}`
        );
        return;
      }

      // Refresh list and missing count
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Backfill failed');
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <div className="space-y-4" id="access">
      <h2 className="text-xl font-semibold">Access Requests & Approvals</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Approve or deny pending role requests. Approvals update the user’s profile and email them a password setup link.
      </p>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="font-medium">Pending Requests</div>
          <div className="flex items-center gap-2">
            {missingCount > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                {missingCount} pending profile{missingCount === 1 ? '' : 's'} missing request
              </span>
            )}
            <button
              onClick={load}
              className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
            >
              Refresh
            </button>
            <button
              onClick={backfillMissing}
              disabled={backfilling}
              className="px-3 py-2 rounded border border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm disabled:opacity-60"
              title="Run server backfill to create role_requests for pending profiles"
            >
              {backfilling ? 'Backfilling…' : 'Backfill missing requests'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 px-4">Name</th>
                <th className="py-2 px-4">Email</th>
                <th className="py-2 px-4">Provider Type</th>
                <th className="py-2 px-4 w-40">Requested Role</th>
                <th className="py-2 px-4">Justification</th>
                <th className="py-2 px-4">Created</th>
                <th className="py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="py-4 px-4" colSpan={7}>Loading…</td></tr>
              ) : rows && rows.length > 0 ? (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="py-2 px-4">
                      {editingId === r.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Role:</span>
                          <select
                            className="p-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as 'viewer' | 'scheduler' | 'admin')}
                          >
                            <option value="viewer">viewer</option>
                            <option value="scheduler">scheduler</option>
                            <option value="admin">admin</option>
                          </select>
                          <button
                            onClick={() => saveEdit(r)}
                            disabled={actingId === r.id}
                            className="px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700 disabled:opacity-60"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="relative group">
                          <div>
                            {(() => {
                              const metaName = (r as any)?.metadata?.full_name || (r as any)?.metadata?.fullName || (r as any)?.full_name;
                              const profName = r.user_id ? profilesById[r.user_id]?.full_name : undefined;
                              return metaName || profName || r.email;
                            })()}
                          </div>
                          <button
                            onClick={() => beginEdit(r)}
                            className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-800/90 text-xs text-gray-700 dark:text-gray-200 shadow-sm"
                            title="Edit requested role"
                          >
                            Edit role
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-4">{r.email}</td>
                    <td className="py-2 px-4">{r.provider_type ?? '-'}</td>
                    <td className="py-2 px-4 capitalize">{r.requested_role}</td>
                    <td className="py-2 px-4 max-w-[22rem] truncate" title={r.justification ?? ''}>
                      {r.justification ?? '-'}
                    </td>
                    <td className="py-2 px-4">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => approve(r)}
                          disabled={actingId === r.id}
                          className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {actingId === r.id ? 'Working…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => deny(r)}
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
                <tr><td className="py-6 px-4 text-gray-500" colSpan={7}>No pending requests.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}