"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getBrowserClient } from "@/lib/supabase/client";

const supabase = getBrowserClient();

type RoleRequest = {
  id: string;
  user_id: string | null;
  email: string;
  provider_type: string | null;
  requested_role: "viewer" | "scheduler" | "admin";
  justification: string | null;
  metadata: any | null;
  status: "pending" | "approved" | "denied" | "withdrawn";
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

export default function AccessRequests() {
  const [rows, setRows] = useState<RoleRequest[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState<boolean>(false);
  const [missingCount, setMissingCount] = useState<number>(0);
  const [profilesById, setProfilesById] = useState<
    Record<string, { full_name: string | null }>
  >({});

  const pendingRequestsCount = useMemo(() => (rows ?? []).length, [rows]);
  // --- New: simple toast notifications ---
  type Toast = { id: string; message: string; kind?: "info" | "error" };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback(
    (message: string, kind: Toast["kind"] = "info", ttl = 6000) => {
      const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
      const t = { id, message, kind } as Toast;
      setToasts((s) => [t, ...s]);
      setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), ttl);
    },
    [],
  );
  // Debug: log client session/profile on mount to help diagnose missing auth
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sessRes = await supabase.auth.getSession();
        if (!mounted) return;
        if (!sessRes?.data?.session) {
          setError("No active session in browser. Please sign in.");
          addToast("No active session — please sign in", "error");
        }
      } catch {
        // silent
      }
    })();
    return () => {
      mounted = false;
    };
  }, [addToast]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<"viewer" | "scheduler" | "admin">(
    "viewer",
  );

  // --- New: current users management state ---
  type ProfileRow = {
    id: string;
    email: string | null;
    full_name: string | null;
    role: "viewer" | "scheduler" | "admin" | null;
    status: "pending" | "approved" | "denied" | "revoked" | null;
    created_at?: string | null;
    updated_at?: string | null;
  };

  const [users, setUsers] = useState<ProfileRow[] | null>(null);
  const [usersLoading, setUsersLoading] = useState<boolean>(true);
  const [userActingId, setUserActingId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserRole, setEditingUserRole] = useState<
    "viewer" | "scheduler" | "admin"
  >("viewer");

  // --- New: pagination / search / sorting state ---
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const totalPages = totalUsers
    ? Math.max(1, Math.ceil(totalUsers / pageSize))
    : 1;

  const [searchQ, setSearchQ] = useState<string>("");
  const [debouncedSearchQ, setDebouncedSearchQ] = useState<string>("");
  const [sortBy, setSortBy] = useState<
    "full_name" | "email" | "role" | "created_at"
  >("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Cursor pagination state (server returns nextCursor). Keep a cursor history to enable Prev navigation.
  const [cursors, setCursors] = useState<(string | null)[]>([null]); // index 0 = page 1
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Helper: toggle sorting for column
  const handleSort = useCallback(
    (col: "full_name" | "email" | "role" | "created_at") => {
      setSortBy((prevCol) => {
        if (prevCol === col) {
          // toggle direction
          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          return prevCol;
        }
        // default directions per column (created_at defaults to desc)
        setSortDir(col === "created_at" ? "desc" : "asc");
        return col;
      });
    },
    [],
  );

  // ensure current user is an approved admin (client-side guard)
  const ensureAdminOrThrow = useCallback(async () => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) throw new Error("Not authenticated");
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", userId)
        .single();
      if (
        !profile ||
        profile.role !== "admin" ||
        profile.status !== "approved"
      ) {
        throw new Error("Forbidden — admin only");
      }
      return { userId, profile };
    } catch (e: any) {
      throw new Error(e?.message ?? String(e));
    }
  }, []);

  const computeMissingCount = useCallback(async () => {
    // Try server-side counter first (security definer). If it doesn't exist, fall back to client calc.
    try {
      const { data, error } = await supabase.rpc("count_missing_role_requests");
      if (!error && typeof data === "number") {
        setMissingCount(data);
        return;
      }
      // fallthrough to client-side if RPC missing or errored
    } catch (_) { }

    // Fallback: client-side count using two queries
    const [
      { data: pendProfiles, error: profErr },
      { data: pendReqs, error: reqErr },
    ] = await Promise.all([
      supabase.from("profiles").select("id").eq("status", "pending"),
      supabase.from("role_requests").select("user_id").eq("status", "pending"),
    ]);

    if (!profErr && !reqErr) {
      const pendingSet = new Set((pendReqs ?? []).map((r: any) => r.user_id));
      const missing = (pendProfiles ?? []).filter(
        (p: any) => !pendingSet.has(p.id),
      );
      setMissingCount(missing.length);
    }
  }, []);

  const loadUsers = useCallback(
    async ({
      page: p = 1,
      search = "",
      sortBy: sBy = sortBy,
      sortDir: sDir = sortDir,
      cursor = null,
    }: {
      page?: number;
      search?: string;
      sortBy?: typeof sortBy;
      sortDir?: typeof sortDir;
      cursor?: string | null;
    } = {}) => {
      setUsersLoading(true);
      try {
        try {
          await ensureAdminOrThrow();
        } catch (authErr: any) {
          const msg = authErr?.message ?? "Not authorized";
          setUsers([]);
          setTotalUsers(null);
          setError(msg);
          addToast(msg, "error");
          setUsersLoading(false);
          return;
        }

        const params = new URLSearchParams();
        params.set("limit", String(pageSize));
        params.set("sortBy", sBy);
        params.set("sortDir", sDir);
        if (search) params.set("search", search);

        if (cursor) {
          params.set("cursor", cursor);
        } else {
          params.set("page", String(p));
        }

        const res = await fetch(`/api/users?${params.toString()}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) {
          const txt = await res.text();
          if (res.status === 401) {
            setUsers([]);
            setTotalUsers(null);
            setError("Unauthorized — please sign in");
            addToast("Unauthorized — please sign in", "error");
            setUsersLoading(false);
            return;
          }
          if (res.status === 403) {
            setUsers([]);
            setTotalUsers(null);
            setError("Forbidden — admin only");
            addToast("Forbidden — admin only", "error");
            setUsersLoading(false);
            return;
          }
          throw new Error(txt || `Server returned ${res.status}`);
        }
        const json = await res.json();
        setUsers((json.rows ?? []) as ProfileRow[]);
        setNextCursor(json.nextCursor ?? null);
        setTotalUsers(typeof json.count === "number" ? json.count : null);

        if (cursor) {
          setCursors((cur) => {
            const copy = cur.slice(0, p - 1);
            copy[p - 1] = cursor;
            return copy;
          });
        }
      } catch (e: any) {
        setUsers([]);
        setTotalUsers(null);
        addToast("Failed to load users: " + (e?.message ?? ""), "error");
        setError(e?.message ?? "Failed to load users");
      } finally {
        setUsersLoading(false);
      }
    },
    [pageSize, sortBy, sortDir, ensureAdminOrThrow, addToast],
  );
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1) Load pending role requests (source of truth for approvals)
    const { data, error } = await supabase
      .from("role_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as RoleRequest[]);
      // Fetch profile names for the listed requests (best-effort; ignore errors)
      const list = (data ?? []) as RoleRequest[];
      const ids = Array.from(
        new Set(
          list.map((r) => r.user_id).filter((v): v is string => Boolean(v)),
        ),
      );
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        if (profs && Array.isArray(profs)) {
          const map: Record<string, { full_name: string | null }> = {};
          for (const p of profs) {
            if (p && p.id)
              map[p.id] = { full_name: (p as any).full_name ?? null };
          }
          setProfilesById(map);
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
    await loadUsers({
      page: 1,
      search: debouncedSearchQ,
      sortBy,
      sortDir,
      cursor: null,
    });
  }, [computeMissingCount, debouncedSearchQ, loadUsers, sortBy, sortDir]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // when search or sort changes, reset page and cursor history
    setPage(1);
    setCursors([null]);
    loadUsers({
      page: 1,
      search: debouncedSearchQ,
      sortBy,
      sortDir,
      cursor: null,
    });
  }, [debouncedSearchQ, sortBy, sortDir, loadUsers]);

  useEffect(() => {
    const cur = cursors[page - 1] ?? null;
    loadUsers({ page, search: debouncedSearchQ, sortBy, sortDir, cursor: cur });
  }, [page, cursors, debouncedSearchQ, loadUsers, sortBy, sortDir]);

  // --- New: update a user's role in profiles table ---
  const beginEditUser = (u: ProfileRow) => {
    setEditingUserId(u.id);
    setEditingUserRole((u.role as any) ?? "viewer");
  };

  const cancelEditUser = () => setEditingUserId(null);

  const saveUserRole = async (u: ProfileRow) => {
    try {
      // client-side guard
      await ensureAdminOrThrow();
      setUserActingId(u.id);
      setError(null);
      const { error } = await supabase
        .from("profiles")
        .update({ role: editingUserRole })
        .eq("id", u.id);
      if (error) throw error;
      await loadUsers({ page, search: debouncedSearchQ, sortBy, sortDir });
      setEditingUserId(null);
      addToast("Role updated", "info");
    } catch (e: any) {
      const msg = e?.message ?? "Failed to update user role";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setUserActingId(null);
    }
  };

  const revokeAccess = async (u: ProfileRow) => {
    if (
      !confirm(
        `Revoke access for ${u.email ?? u.full_name ?? u.id}? This will mark the profile as revoked.`,
      )
    )
      return;
    try {
      // client-side guard
      await ensureAdminOrThrow();
      setUserActingId(u.id);
      setError(null);
      const { error } = await supabase
        .from("profiles")
        .update({ status: "revoked", role: null })
        .eq("id", u.id);
      if (error) throw error;

      // Optionally: notify user or perform other cleanup here.
      await loadUsers({ page, sortBy, sortDir });
      addToast("Access revoked", "info");
    } catch (e: any) {
      const msg = e?.message ?? "Failed to revoke access";
      setError(msg);
      addToast(msg, "error");
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
        .from("role_requests")
        .update({ requested_role: editRole })
        .eq("id", req.id);
      if (error) throw error;
      await load();
      setEditingId(null);
    } catch (e: any) {
      setError(e.message ?? "Failed to update role");
      addToast(e?.message ?? "Failed to update role", "error");
    } finally {
      setActingId(null);
    }
  };

  const approve = async (req: RoleRequest) => {
    try {
      // client-side guard
      await ensureAdminOrThrow();
      setActingId(req.id);

      // New: call server API to perform approval + email
      const res = await fetch("/api/admin/approve-user", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: req.id }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Approve failed (${res.status})`);
      }
      let emailUsed: string | null = null;
      try {
        const data = await res.json();
        emailUsed = data?.email ?? null;
      } catch { }

      // Removed: password reset email (user already set password at signup)

      addToast(
        `Approved${emailUsed ? " – approval email queued" : ""}.`,
        "info",
      );
      await load();
    } catch (e: any) {
      setError(e.message ?? "Approve failed");
      addToast(e?.message ?? "Approve failed", "error");
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
      if (!decider) throw new Error("No authenticated user");

      const reason = prompt("Reason for denial (optional):") ?? "";
      const { error } = await supabase.rpc("deny_role_request", {
        p_request_id: req.id,
        p_decider: decider,
        p_reason: reason,
      });
      if (error) throw error;

      await load();
    } catch (e: any) {
      setError(e.message ?? "Deny failed");
      addToast(e?.message ?? "Deny failed", "error");
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
      const { error } = await supabase.rpc("backfill_missing_role_requests");
      if (error) {
        // Surface a clear action item if the function isn't installed
        setError(
          error.message?.includes("function backfill_missing_role_requests")
            ? "Server function backfill_missing_role_requests() is missing. Please run the provided SQL to create it."
            : `Backfill failed: ${error.message}`,
        );
        return;
      }

      // Refresh list and missing count
      await load();
    } catch (e: any) {
      setError(e.message ?? "Backfill failed");
      addToast(e?.message ?? "Backfill failed", "error");
    } finally {
      setBackfilling(false);
    }
  };

  const isLocalhost =
    typeof window !== "undefined" && window.location.hostname === "localhost";
  return (
    <div className="space-y-4" id="access">
      <h2 className="text-xl font-semibold">Access Requests & Approvals</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Approve or deny pending role requests. Approvals update the user’s
        profile and send an approval email.
      </p>

      {isLocalhost && (
        <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
          <div className="font-medium text-sm mb-2">Local Debug Tools</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={async () => {
                try {
                  await supabase.auth.getSession();
                  addToast("Session fetch (see dev tools state)", "info");
                } catch {
                  addToast("Session fetch failed", "error");
                }
              }}
              className="px-2 py-1 rounded border"
            >
              Check Session
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/debug-session", {
                    cache: "no-store",
                    credentials: "include",
                  });
                  addToast(
                    `/api/debug-session ${res.ok ? "OK" : res.status}`,
                    res.ok ? "info" : "error",
                  );
                } catch {
                  addToast("debug-session failed", "error");
                }
              }}
              className="px-2 py-1 rounded border"
            >
              Server Session
            </button>
            <button
              onClick={async () => {
                try {
                  const dc =
                    typeof document !== "undefined" ? document.cookie : "";
                  const match = dc.match(/(?:^|; )([^=]+)=([^;]+)/g);
                  const sbCookie = (match || [])
                    .map((str) => str.trim())
                    .find((str) => str.startsWith("sb-")); // renamed s->str to avoid unused var
                  if (!sbCookie) {
                    addToast("No sb- cookie found", "error");
                    return;
                  }
                  const parts = sbCookie.split("=");
                  const name = parts[0];
                  const value = decodeURIComponent(parts.slice(1).join("="));
                  const r = await fetch("/api/cookie-sync", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, value }),
                  });
                  addToast(
                    `cookie-sync ${r.ok ? "OK" : r.status}`,
                    r.ok ? "info" : "error",
                  );
                } catch {
                  addToast("cookie-sync failed", "error");
                }
              }}
              className="px-2 py-1 rounded border"
            >
              Sync Cookie
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Visible only on localhost.
          </div>
        </div>
      )}

      {error && (
        <div className="rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 flex flex-wrap gap-3 items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="font-medium">Pending Requests</div>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {pendingRequestsCount.toLocaleString()} pending
            </span>
          </div>
          <div className="flex items-center gap-2">
            {missingCount > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                {missingCount} pending profile{missingCount === 1 ? "" : "s"}{" "}
                missing request
              </span>
            )}
            <button
              onClick={load}
              className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={backfillMissing}
              disabled={backfilling}
              className="px-3 py-2 rounded border border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm disabled:opacity-60 transition-colors"
              title="Run server backfill to create role_requests for pending profiles"
            >
              {backfilling ? "Backfilling…" : "Backfill missing requests"}
            </button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Provider Type</TableHead>
                <TableHead className="w-40">Requested Role</TableHead>
                <TableHead>Justification</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows && rows.length > 0 ? (
                rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <TableCell>
                      {editingId === r.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Role:</span>
                          <select
                            className="p-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                            value={editRole}
                            onChange={(e) =>
                              setEditRole(
                                e.target.value as
                                | "viewer"
                                | "scheduler"
                                | "admin",
                              )
                            }
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
                              const metaName =
                                (r as any)?.metadata?.full_name ||
                                (r as any)?.metadata?.fullName ||
                                (r as any)?.full_name;
                              const profName = r.user_id
                                ? profilesById[r.user_id]?.full_name
                                : undefined;
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
                    </TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.provider_type ?? "-"}</TableCell>
                    <TableCell className="capitalize">{r.requested_role}</TableCell>
                    <TableCell
                      className="max-w-[22rem] truncate"
                      title={r.justification ?? ""}
                    >
                      {r.justification ?? "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approve(r)}
                          disabled={actingId === r.id}
                          className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                        >
                          {actingId === r.id ? "Working…" : "Approve"}
                        </button>
                        <button
                          onClick={() => deny(r)}
                          disabled={actingId === r.id}
                          className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60 transition-colors"
                        >
                          Deny
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No pending requests.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden">
          {loading ? (
            <div className="flex flex-col items-center py-8">
              <div className="text-gray-500">Loading…</div>
            </div>
          ) : rows && rows.length > 0 ? (
            <div className="flex flex-col gap-4 p-4">
              {rows.map((r) => (
                <div key={r.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">
                        {(() => {
                          const metaName =
                            (r as any)?.metadata?.full_name ||
                            (r as any)?.metadata?.fullName ||
                            (r as any)?.full_name;
                          const profName = r.user_id
                            ? profilesById[r.user_id]?.full_name
                            : undefined;
                          return metaName || profName || r.email;
                        })()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{r.email}</div>
                    </div>
                    <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 capitalize">
                      {r.requested_role}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Provider Type:</span>
                      <span className="font-medium">{r.provider_type ?? "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Created:</span>
                      <span className="font-medium">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.justification && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-gray-600 dark:text-gray-400 mb-1">Justification:</div>
                        <div className="text-sm">{r.justification}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => approve(r)}
                      disabled={actingId === r.id}
                      className="flex-1 px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm font-medium"
                    >
                      {actingId === r.id ? "Working…" : "Approve"}
                    </button>
                    <button
                      onClick={() => deny(r)}
                      disabled={actingId === r.id}
                      className="flex-1 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60 transition-colors text-sm font-medium"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No pending requests.
            </div>
          )}
        </div>
      </div>

      {/* --- New: Current Users management table --- */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 flex items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700">
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
              onClick={() => {
                setSearchQ("");
                setDebouncedSearchQ("");
                setPage(1);
              }}
              className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() =>
                loadUsers({
                  page: 1,
                  search: debouncedSearchQ,
                  sortBy,
                  sortDir,
                })
              }
              className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  aria-sort={
                    sortBy === "full_name"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    className="cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    onClick={() => handleSort("full_name")}
                    aria-label={`Sort by Name ${sortBy === "full_name" ? (sortDir === "asc" ? "descending" : "ascending") : "ascending"}`}
                  >
                    Name{" "}
                    {sortBy === "full_name"
                      ? sortDir === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </button>
                </TableHead>
                <TableHead
                  aria-sort={
                    sortBy === "email"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    className="cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    onClick={() => handleSort("email")}
                    aria-label={`Sort by Email ${sortBy === "email" ? (sortDir === "asc" ? "descending" : "ascending") : "ascending"}`}
                  >
                    Email{" "}
                    {sortBy === "email" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                </TableHead>
                <TableHead
                  aria-sort={
                    sortBy === "role"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    className="cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    onClick={() => handleSort("role")}
                    aria-label={`Sort by Role ${sortBy === "role" ? (sortDir === "asc" ? "descending" : "ascending") : "ascending"}`}
                  >
                    Role{" "}
                    {sortBy === "role" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead
                  aria-sort={
                    sortBy === "created_at"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    className="cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    onClick={() => handleSort("created_at")}
                    aria-label={`Sort by Created ${sortBy === "created_at" ? (sortDir === "asc" ? "descending" : "ascending") : "descending"}`}
                    title="Sort by Created"
                  >
                    Created{" "}
                    {sortBy === "created_at"
                      ? sortDir === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Loading users…
                  </TableCell>
                </TableRow>
              ) : users && users.length > 0 ? (
                users.map((u) => (
                  <TableRow
                    key={u.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <TableCell className="font-medium">
                      {u.full_name ?? u.email ?? u.id}
                    </TableCell>
                    <TableCell>{u.email ?? "-"}</TableCell>
                    <TableCell>
                      {editingUserId === u.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            className="p-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                            value={editingUserRole}
                            onChange={(e) =>
                              setEditingUserRole(e.target.value as any)
                            }
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
                          <span className="capitalize">{u.role ?? "-"}</span>
                          <button
                            onClick={() => beginEditUser(u)}
                            className="ml-3 opacity-70 hover:opacity-100 text-xs text-gray-500"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">{u.status ?? "-"}</TableCell>
                    <TableCell>
                      {u.created_at
                        ? new Date(u.created_at).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button
                          onClick={() => revokeAccess(u)}
                          disabled={userActingId === u.id}
                          className="px-3 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-60 transition-colors dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          {userActingId === u.id ? "Working…" : "Revoke"}
                        </button>
                        {u.email && (
                          <button
                            onClick={async () => {
                              try {
                                await ensureAdminOrThrow();
                                if (
                                  !confirm(
                                    `Send password reset email to ${u.email}?`,
                                  )
                                )
                                  return;
                                setUserActingId(u.id);
                                const res = await fetch(
                                  "/api/admin/force-password-reset",
                                  {
                                    method: "POST",
                                    credentials: "include",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({ email: u.email }),
                                  },
                                );
                                if (!res.ok) {
                                  const data = await res
                                    .json()
                                    .catch(() => ({}));
                                  throw new Error(
                                    data?.error ||
                                    `Reset failed (${res.status})`,
                                  );
                                }
                                addToast(
                                  `Password reset email sent to ${u.email}`,
                                  "info",
                                );
                              } catch (e: any) {
                                addToast(
                                  e?.message || "Failed to send reset email",
                                  "error",
                                );
                              } finally {
                                setUserActingId(null);
                              }
                            }}
                            disabled={userActingId === u.id}
                            className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-60 transition-colors"
                            title="Send password reset email"
                            aria-label={`Send password reset email to ${u.email}`}
                          >
                            Force Reset
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden">
          {usersLoading ? (
            <div className="flex flex-col items-center py-8">
              <div className="text-gray-500">Loading users…</div>
            </div>
          ) : users && users.length > 0 ? (
            <div className="flex flex-col gap-4 p-4">
              {users.map((u) => (
                <div key={u.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">
                        {u.full_name ?? u.email ?? u.id}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{u.email ?? "-"}</div>
                    </div>
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 capitalize">
                      {u.role}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className="font-medium capitalize">{u.status ?? "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Created:</span>
                      <span className="font-medium">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => revokeAccess(u)}
                      disabled={userActingId === u.id}
                      className="flex-1 px-3 py-2 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-60 transition-colors dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 text-sm font-medium"
                    >
                      {userActingId === u.id ? "Working…" : "Revoke"}
                    </button>
                    {u.email && (
                      <button
                        onClick={async () => {
                          try {
                            await ensureAdminOrThrow();
                            if (
                              !confirm(
                                `Send password reset email to ${u.email}?`,
                              )
                            )
                              return;
                            setUserActingId(u.id);
                            const res = await fetch(
                              "/api/admin/force-password-reset",
                              {
                                method: "POST",
                                credentials: "include",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ email: u.email }),
                              },
                            );
                            if (!res.ok) {
                              const data = await res
                                .json()
                                .catch(() => ({}));
                              throw new Error(
                                data?.error ||
                                `Reset failed (${res.status})`,
                              );
                            }
                            addToast(
                              `Password reset email sent to ${u.email}`,
                              "info",
                            );
                          } catch (e: any) {
                            addToast(
                              e?.message || "Failed to send reset email",
                              "error",
                            );
                          } finally {
                            setUserActingId(null);
                          }
                        }}
                        disabled={userActingId === u.id}
                        className="flex-1 px-3 py-2 rounded border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-60 transition-colors text-sm font-medium"
                        title="Send password reset email"
                      >
                        Force Reset
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No users found.
            </div>
          )}
        </div>

        {/* Pagination controls */}
        <div className="p-4 flex items-center justify-between text-sm border-t border-gray-200 dark:border-gray-700 flex-wrap gap-3">
          <div>
            {totalUsers !== null ? (
              <span>
                {totalUsers.toLocaleString()} users — page {page} of{" "}
                {totalPages}
              </span>
            ) : (
              <span>Page {page}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Per-page selector */}
            <label className="text-xs">Per page:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
                setCursors([null]);
              }}
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
            >
              Prev
            </button>

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
              disabled={
                totalUsers !== null && page >= totalPages && !nextCursor
              }
              className="px-2 py-1 rounded border border-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Toasts */}
      <div className="fixed right-4 bottom-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`max-w-sm rounded px-3 py-2 shadow ${t.kind === "error" ? "bg-red-50 border border-red-300 text-red-800" : "bg-gray-50 border border-gray-200 text-gray-800"}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
