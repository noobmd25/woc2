'use client';

import * as React from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
const supabase = getBrowserClient();

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
  const [rows, setRows] = React.useState<RoleRequest[] | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actingId, setActingId] = React.useState<string | null>(null);
  const [backfilling, setBackfilling] = React.useState<boolean>(false);
  const [missingCount, setMissingCount] = React.useState<number>(0);
  const [profilesById, setProfilesById] = React.useState<Record<string, { full_name: string | null }>>({});

  const pendingRequestsCount = React.useMemo(() => (rows ?? []).length, [rows]);

  // Debug: log client session/profile on mount to help diagnose missing auth
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sessRes = await supabase.auth.getSession();
        const userRes = await supabase.auth.getUser();
        console.debug('[AccessRequests] supabase.auth.getSession()', sessRes?.data ?? sessRes);
        console.debug('[AccessRequests] supabase.auth.getUser()', userRes?.data ?? userRes);
        if (!mounted) return;
        if (!sessRes?.data?.session) {
          // no session in browser — surface user-friendly error
          setError('No active session in browser. Please sign in.');
          addToast('No active session — please sign in', 'error');
        }
      } catch (e) {
        console.error('[AccessRequests] debug getSession/getUser error', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editRole, setEditRole] = React.useState<'viewer' | 'scheduler' | 'admin'>('viewer');

  // --- New: current users management state ---
  type ProfileRow = {
    id: string;
    email: string | null;
    full_name: string | null;
    role: 'viewer' | 'scheduler' | 'admin' | null;
    status: 'pending' | 'approved' | 'denied' | 'revoked' | null;
    created_at?: string | null;
    updated_at?: string | null;
  };

  const [users, setUsers] = React.useState<ProfileRow[] | null>(null);
  const [usersLoading, setUsersLoading] = React.useState<boolean>(true);
  const [userActingId, setUserActingId] = React.useState<string | null>(null);
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null);
  const [editingUserRole, setEditingUserRole] = React.useState<'viewer' | 'scheduler' | 'admin'>('viewer');

  // --- New: pagination / search / sorting state ---
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(20);
  const [totalUsers, setTotalUsers] = React.useState<number | null>(null);
  const totalPages = totalUsers ? Math.max(1, Math.ceil(totalUsers / pageSize)) : 1;

  const [searchQ, setSearchQ] = React.useState<string>('');
  const [debouncedSearchQ, setDebouncedSearchQ] = React.useState<string>('');
  const [sortBy, setSortBy] = React.useState<'full_name' | 'email' | 'role'>('full_name');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');

  // Cursor pagination state (server returns nextCursor). Keep a cursor history to enable Prev navigation.
  const [cursors, setCursors] = React.useState<(string | null)[]>([null]); // index 0 = page 1
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [cursorMode, setCursorMode] = React.useState<boolean>(true);

  // --- New: simple toast notifications ---
  type Toast = { id: string; message: string; kind?: 'info' | 'error' };
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const addToast = (message: string, kind: Toast['kind'] = 'info', ttl = 6000) => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
    const t = { id, message, kind } as Toast;
    setToasts((s) => [t, ...s]);
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), ttl);
  };

  // debounce search
  React.useEffect(() => {
    const h = setTimeout(() => setDebouncedSearchQ(searchQ.trim()), 400);
    return () => clearTimeout(h);
  }, [searchQ]);

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

    // Also refresh the users list so admin sees current state after loading requests
    setPage(1);
    setCursors([null]);
    await loadUsers({ page: 1, search: debouncedSearchQ, sortBy, sortDir, cursor: null });
  }, [computeMissingCount]);

  React.useEffect(() => {
    load();
  }, [load]);

  // --- New: load current users/profiles ---
  const loadUsers = React.useCallback(
    async ({ page: p = 1, search = '', sortBy: sBy = sortBy, sortDir: sDir = sortDir, cursor = null } : { page?: number; search?: string; sortBy?: typeof sortBy; sortDir?: typeof sortDir; cursor?: string | null } = {}) => {
      setUsersLoading(true);
      try {
        // Ensure the current client user is an approved admin before calling the server API.
        // This gives faster, clearer feedback if the signed-in user lacks admin privileges.
        try {
          await ensureAdminOrThrow();
        } catch (authErr: any) {
          const msg = authErr?.message ?? 'Not authorized';
          console.warn('[AccessRequests] loadUsers blocked by client auth:', msg);
          setUsers([]);
          setTotalUsers(null);
          setError(msg);
          addToast(msg, 'error');
          setUsersLoading(false);
          return;
        }

        const params = new URLSearchParams();
        params.set('limit', String(pageSize));
        params.set('sortBy', sBy);
        params.set('sortDir', sDir);
        if (search) params.set('search', search);

        if (cursor) {
          params.set('cursor', cursor);
          setCursorMode(true);
        } else {
          params.set('page', String(p));
          setCursorMode(false);
        }

        const res = await fetch(`/api/users?${params.toString()}`, { cache: 'no-store', credentials: 'include' });
        if (!res.ok) {
          const txt = await res.text();
          // handle auth/forbidden explicitly
          if (res.status === 401) {
            setUsers([]);
            setTotalUsers(null);
            setError('Unauthorized — please sign in');
            addToast('Unauthorized — please sign in', 'error');
            setUsersLoading(false);
            return;
          }
          if (res.status === 403) {
            setUsers([]);
            setTotalUsers(null);
            setError('Forbidden — admin only');
            addToast('Forbidden — admin only', 'error');
            setUsersLoading(false);
            return;
          }
          throw new Error(txt || `Server returned ${res.status}`);
        }
        const json = await res.json();
        // expected: { rows: ProfileRow[], nextCursor?: string | null, count?: number | null }
        setUsers((json.rows ?? []) as ProfileRow[]);
        setNextCursor(json.nextCursor ?? null);
        setTotalUsers(typeof json.count === 'number' ? json.count : null);

        // maintain cursors for cursor-mode navigation
        if (cursor) {
          setCursors((cur) => {
            const copy = cur.slice(0, p - 1);
            copy[p - 1] = cursor;
            return copy;
          });
        }
      } catch (e: any) {
        console.error('[AccessRequests] loadUsers', e);
        setUsers([]);
        setTotalUsers(null);
        addToast('Failed to load users: ' + (e?.message ?? ''), 'error');
        setError(e?.message ?? 'Failed to load users');
      } finally {
        setUsersLoading(false);
      }
    },
    [pageSize, sortBy, sortDir]
  );

  React.useEffect(() => {
    // when search or sort changes, reset page and cursor history
    setPage(1);
    setCursors([null]);
    loadUsers({ page: 1, search: debouncedSearchQ, sortBy, sortDir, cursor: null });
  }, [debouncedSearchQ, sortBy, sortDir, loadUsers]);

  React.useEffect(() => {
    const cur = cursors[page - 1] ?? null;
    loadUsers({ page, search: debouncedSearchQ, sortBy, sortDir, cursor: cur });
  }, [page]);

  // --- New: update a user's role in profiles table ---
  const beginEditUser = (u: ProfileRow) => {
    setEditingUserId(u.id);
    setEditingUserRole((u.role as any) ?? 'viewer');
  };

  const cancelEditUser = () => setEditingUserId(null);

  const saveUserRole = async (u: ProfileRow) => {
    try {
      // client-side guard
      await ensureAdminOrThrow();
      setUserActingId(u.id);
      setError(null);
      const { error } = await supabase
        .from('profiles')
        .update({ role: editingUserRole })
        .eq('id', u.id);
      if (error) throw error;
      await loadUsers({ page, search: debouncedSearchQ, sortBy, sortDir });
      setEditingUserId(null);
      addToast('Role updated', 'info');
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to update user role';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setUserActingId(null);
    }
  };

  const revokeAccess = async (u: ProfileRow) => {
    if (!confirm(`Revoke access for ${u.email ?? u.full_name ?? u.id}? This will mark the profile as revoked.`)) return;
    try {
      // client-side guard
      await ensureAdminOrThrow();
      setUserActingId(u.id);
      setError(null);
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'revoked', role: null })
        .eq('id', u.id);
      if (error) throw error;

      // Optionally: notify user or perform other cleanup here.
      await loadUsers({ page, sortBy, sortDir });
      addToast('Access revoked', 'info');
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to revoke access';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setUserActingId(null);
    }
  };

  const beginEdit = (req: RoleRequest) => {
    setEditingId(req.id);
    setEditRole(req.requested_role);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (req: RoleRequest) => {
    try {
      // client-side guard
      await ensureAdminOrThrow();
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
      addToast(e?.message ?? 'Failed to update role', 'error');
    } finally {
      setActingId(null);
    }
  };

  const approve = async (req: RoleRequest) => {
    try {
      // client-side guard
      await ensureAdminOrThrow();
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
      addToast(e?.message ?? 'Approve failed', 'error');
    } finally {
      setActingId(null);
    }
  };

  const deny = async (req: RoleRequest) => {
    try {
      // client-side guard
      await ensureAdminOrThrow();
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
      addToast(e?.message ?? 'Deny failed', 'error');
    } finally {
      setActingId(null);
    }
  };

  const backfillMissing = async () => {
    try {
      // client-side guard
      await ensureAdminOrThrow();
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
      addToast(e?.message ?? 'Backfill failed', 'error');
    } finally {
      setBackfilling(false);
    }
  };

  // ensure current user is an approved admin (client-side guard)
  const ensureAdminOrThrow = async () => {
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        console.warn('[ensureAdminOrThrow] supabase.auth.getUser error', userErr);
        throw userErr;
      }
      const userId = userRes?.user?.id;
      console.debug('[ensureAdminOrThrow] userId', userId);
      if (!userId) throw new Error('Not authenticated');

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', userId)
        .single();

      if (profErr) {
        console.warn('[ensureAdminOrThrow] profile lookup error', profErr);
        throw profErr;
      }
      console.debug('[ensureAdminOrThrow] profile', profile);
      if (!profile || profile.role !== 'admin' || profile.status !== 'approved') {
        throw new Error('Forbidden — admin only');
      }

      return { userId, profile };
    } catch (e: any) {
      // normalize error for callers
      const msg = e?.message ?? String(e);
      console.warn('[ensureAdminOrThrow] failing with', msg);
      throw new Error(msg);
    }
  };

  return (
    <div className="space-y-4" id="access">
      <h2 className="text-xl font-semibold">Access Requests & Approvals</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Approve or deny pending role requests. Approvals update the user’s profile and email them a password setup link.
      </p>

      {/* Debug panel: client cookies and server debug-session */}
      <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="font-medium text-sm">Debug: Session / Cookies</div>
          <button
            onClick={async () => {
              try {
                const c = typeof document !== 'undefined' ? document.cookie : '(no document)';
                setError(null);
                addToast('Copied document.cookie to console', 'info');
                console.log('[debug] document.cookie ->', c);
              } catch (e) {
                console.error(e);
              }
            }}
            className="px-2 py-1 rounded border text-xs"
          >Log document.cookie</button>
          <button
            onClick={async () => {
              try {
                const s = await supabase.auth.getSession();
                console.log('[debug] client supabase.auth.getSession()', s);
                addToast('See console for client session', 'info');
              } catch (e) { console.error(e); addToast('Failed to get client session', 'error'); }
            }}
            className="px-2 py-1 rounded border text-xs"
          >Client getSession</button>
          <button
            onClick={async () => {
              try {
                setError(null);
                const res = await fetch('/api/debug-session', { cache: 'no-store', credentials: 'include' });
                const text = await res.text();
                console.log('[debug] /api/debug-session', { status: res.status, body: text });
                if (!res.ok) addToast('/api/debug-session returned ' + res.status, 'error');
                else addToast('/api/debug-session OK — see console', 'info');
              } catch (e) { console.error(e); addToast('Failed to call /api/debug-session', 'error'); }
            }}
            className="px-2 py-1 rounded border text-xs"
          >Call /api/debug-session</button>
          <button
            onClick={async () => {
              try {
                // Find the supabase auth token cookie (name starts with sb-)
                const dc = typeof document !== 'undefined' ? document.cookie : '';
                const match = dc.match(/(?:^|; )([^=]+)=([^;]+)/g);
                const sbCookie = (match || []).map(s => s.trim()).find(s => s.startsWith('sb-'));
                if (!sbCookie) {
                  addToast('No sb- cookie found in document.cookie', 'error');
                  return;
                }
                const parts = sbCookie.split('=');
                const name = parts[0];
                const value = decodeURIComponent(parts.slice(1).join('='));

                // Post to cookie-sync to set server cookie
                const r = await fetch('/api/cookie-sync', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name, value }),
                });
                const j = await r.json().catch(() => null);
                console.log('[debug] cookie-sync', { status: r.status, body: j });
                if (!r.ok) addToast('/api/cookie-sync failed ' + r.status, 'error');
                else addToast('/api/cookie-sync OK — server cookie set', 'info');
              } catch (e) {
                console.error(e);
                addToast('cookie-sync failed', 'error');
              }
            }}
            className="px-2 py-1 rounded border text-xs"
          >Sync cookie to server</button>
        </div>
        <div className="text-xs text-gray-500">Open browser console and server terminal to inspect outputs.</div>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-medium">Pending Requests</div>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-100">
              {pendingRequestsCount.toLocaleString()} pending
            </span>
          </div>
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

      {/* --- New: Current Users management table --- */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="font-medium">Current Users</div>
          <div className="flex items-center gap-2 w-full max-w-2xl">
            <input
              type="search"
              placeholder="Search email or name…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="flex-1 p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
            />
            <button
              onClick={() => { setSearchQ(''); setDebouncedSearchQ(''); setPage(1); }}
              className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
            >
              Clear
            </button>
            <button
              onClick={() => loadUsers({ page: 1, search: debouncedSearchQ, sortBy, sortDir })}
              className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 px-4 cursor-pointer" onClick={() => { setSortBy('full_name'); setSortDir(sortBy === 'full_name' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
                  Name {sortBy === 'full_name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="py-2 px-4 cursor-pointer" onClick={() => { setSortBy('email'); setSortDir(sortBy === 'email' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
                  Email {sortBy === 'email' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="py-2 px-4 cursor-pointer" onClick={() => { setSortBy('role'); setSortDir(sortBy === 'role' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
                  Role {sortBy === 'role' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="py-2 px-4">Status</th>
                <th className="py-2 px-4">Created</th>
                <th className="py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr><td className="py-4 px-4" colSpan={6}>Loading users…</td></tr>
              ) : users && users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="py-2 px-4">{u.full_name ?? u.email ?? u.id}</td>
                    <td className="py-2 px-4">{u.email ?? '-'}</td>
                    <td className="py-2 px-4">
                      {editingUserId === u.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            className="p-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                            value={editingUserRole}
                            onChange={(e) => setEditingUserRole(e.target.value as any)}
                          >
                            <option value="viewer">viewer</option>
                            <option value="scheduler">scheduler</option>
                            <option value="admin">admin</option>
                          </select>
                          <button
                            onClick={() => saveUserRole(u)}
                            disabled={userActingId === u.id}
                            className="px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700 disabled:opacity-60"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditUser}
                            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="relative group">
                          <span className="capitalize">{u.role ?? '-'}</span>
                          <button
                            onClick={() => beginEditUser(u)}
                            className="ml-3 opacity-70 hover:opacity-100 text-xs text-gray-500"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-4 capitalize">{u.status ?? '-'}</td>
                    <td className="py-2 px-4">{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</td>
                    <td className="py-2 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => revokeAccess(u)}
                          disabled={userActingId === u.id}
                          className="px-3 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          {userActingId === u.id ? 'Working…' : 'Revoke'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td className="py-6 px-4 text-gray-500" colSpan={6}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="p-3 flex items-center justify-between text-sm text-gray-600 flex-wrap gap-3">
          <div>
            {totalUsers !== null ? (
              <span>{totalUsers.toLocaleString()} users — page {page} of {totalPages}</span>
            ) : (
              <span>Page {page}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Per-page selector */}
            <label className="text-xs">Per page:</label>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); setCursors([null]); }}
              className="p-1 border rounded"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            {/* Page number input (jump uses offset-mode) */}
            <label className="text-xs ml-2">Go to page:</label>
            <input
              type="number"
              min={1}
              value={page}
              onChange={(e) => {
                const v = Math.max(1, Number(e.target.value || 1));
                // Jump uses offset-mode (server will return count)
                setPage(v);
                // clear cursor history to force offset fetch for jump
                setCursors([null]);
              }}
              className="w-16 p-1 border rounded text-sm"
            />

            {/* Prev/Next */}
            <button
              onClick={() => {
                if (page <= 1) return;
                setPage((p) => Math.max(1, p - 1));
              }}
              disabled={page <= 1}
              className="px-2 py-1 rounded border border-gray-300 disabled:opacity-50"
            >Prev</button>

            <button
              onClick={async () => {
                if (nextCursor) {
                  setCursors((c) => {
                    const copy = c.slice();
                    copy[page] = nextCursor; // store cursor for next page index
                    return copy;
                  });
                  setPage((p) => p + 1);
                } else {
                  setPage((p) => p + 1);
                }
              }}
              disabled={totalUsers !== null && page >= totalPages && !nextCursor}
              className="px-2 py-1 rounded border border-gray-300 disabled:opacity-50"
            >Next</button>
          </div>
        </div>
      </div>

      {/* Toasts */}
      <div className="fixed right-4 bottom-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className={`max-w-sm rounded px-3 py-2 shadow ${t.kind === 'error' ? 'bg-red-50 border border-red-300 text-red-800' : 'bg-gray-50 border border-gray-200 text-gray-800'}`}>
            {t.message}
          </div>
        ))}
      </div>
 
     </div>
   );
 }