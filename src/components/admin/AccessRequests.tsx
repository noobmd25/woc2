"use client";

import { useProfiles } from "@/app/hooks/useProfiles";
import { useManagedUsers, usePendingUsers } from "@/app/hooks/useUsers";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CheckCircle, Search, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function AccessRequests() {
	const { approveUser, denyUser, loading: profilesLoading } = useProfiles();
	const { users, loading, refreshUsers, total } = usePendingUsers();
	const {
		users: allUsers,
		loading: allUsersLoading,
		refreshUsers: refreshAllUsers,
		updateUserRole,
		revokeUserAccess,
		forcePasswordReset,
		page: managedPage,
		setPage: setManagedPage,
		pageSize: managedPageSize,
		setPageSize: setManagedPageSize,
		total: managedTotal,
		search: managedSearch,
		setSearch: setManagedSearch,
		sortBy: managedSortBy,
		setSortBy: setManagedSortBy,
		sortDir: managedSortDir,
		setSortDir: setManagedSortDir,
	} = useManagedUsers();

	// State for user counts
	const [approvedCount, setApprovedCount] = useState(0);
	const [countsLoading, setCountsLoading] = useState(false);

	// Fetch user counts
	const fetchUserCounts = useCallback(async () => {
		setCountsLoading(true);
		try {
			const approvedRes = await fetch("/api/users?status=approved&pageSize=1");
			const approvedData = await approvedRes.json();
			setApprovedCount(approvedData.count || 0);
		} catch (error) {
			console.error("Failed to fetch user counts:", error);
		} finally {
			setCountsLoading(false);
		}
	}, []);

	// Fetch counts on mount and when pending total changes
	useEffect(() => {
		fetchUserCounts();
	}, [fetchUserCounts]);
	useEffect(() => {
		if (![10, 20, 50, 100].includes(managedPageSize)) {
			setManagedPageSize(20);
			setManagedPage(1);
		}
	}, [managedPageSize, setManagedPageSize, setManagedPage]);

	// Confirmation dialogs
	const [approveDialog, setApproveDialog] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [denyDialog, setDenyDialog] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [revokeDialog, setRevokeDialog] = useState<{
		id: string;
		name: string;
	} | null>(null);

	// Handle user approval
	const handleApprove = useCallback(async () => {
		if (!approveDialog) return;
		try {
			await approveUser(approveDialog.id);
			toast.success("User approved successfully");
			refreshUsers();
			fetchUserCounts();
		} catch (err) {
			toast.error("Failed to approve user");
		} finally {
			setApproveDialog(null);
		}
	}, [approveDialog, approveUser, refreshUsers, fetchUserCounts]);

	// Handle user denial
	const handleDeny = useCallback(async () => {
		if (!denyDialog) return;
		try {
			await denyUser(denyDialog.id);
			toast.success("User denied successfully");
			refreshUsers();
			fetchUserCounts();
		} catch (err) {
			toast.error("Failed to deny user");
		} finally {
			setDenyDialog(null);
		}
	}, [denyDialog, denyUser, refreshUsers, fetchUserCounts]);

	// Handle user revocation
	const handleRevoke = useCallback(async () => {
		if (!revokeDialog) return;
		try {
			await revokeUserAccess(revokeDialog.id);
			toast.success("User access revoked successfully");
			refreshAllUsers();
			fetchUserCounts();
		} catch (err) {
			toast.error("Failed to revoke user access");
		} finally {
			setRevokeDialog(null);
		}
	}, [revokeDialog, revokeUserAccess, refreshAllUsers, fetchUserCounts]);

	// Refresh handlers that also update counts
	const handleRefreshPending = useCallback(() => {
		refreshUsers();
		fetchUserCounts();
	}, [refreshUsers, fetchUserCounts]);

	const handleRefreshAll = useCallback(() => {
		refreshAllUsers();
		fetchUserCounts();
	}, [refreshAllUsers, fetchUserCounts]);

	return (
		<div className="container mx-auto px-2 py-6 max-w-7xl">
			{/* Header */}
			<div className="mb-6">
				<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
					Access Requests
				</h1>
				<p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
					Manage user access requests and approvals
				</p>
			</div>
			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
					<h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
						Pending Requests
					</h3>
					<p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
						{loading ? "..." : total || 0}
					</p>
				</div>
				<div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
					<h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
						Approved Users
					</h3>
					<p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
						{countsLoading ? "..." : approvedCount}
					</p>
				</div>
				<div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
					<h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
						Total Users
					</h3>
					<p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
						{allUsersLoading ? "..." : managedTotal}
					</p>
				</div>
			</div>{" "}
			{/* Pending Requests Section */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold">Pending Requests</h2>
						<Button variant="outline" size="sm" onClick={handleRefreshPending}>
							Refresh
						</Button>
					</div>
				</div>

				{/* Desktop Table */}
				<div className="hidden md:block">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{loading ? (
								<TableRow>
									<TableCell colSpan={4} className="text-center py-12">
										Loading pending requests...
									</TableCell>
								</TableRow>
							) : users.length === 0 ? (
								<TableRow>
									<TableCell colSpan={4} className="text-center py-12">
										No pending requests
									</TableCell>
								</TableRow>
							) : (
								users.map((user) => (
									<TableRow key={user.id}>
										<TableCell className="font-medium">
											{user.full_name || "N/A"}
										</TableCell>
										<TableCell>{user.email || "N/A"}</TableCell>
										<TableCell>
											{user.created_at
												? new Date(user.created_at).toLocaleDateString()
												: "N/A"}
										</TableCell>
										<TableCell>
											<div className="flex items-center justify-end gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														setApproveDialog({
															id: user.id,
															name: user.full_name || user.email || user.id,
														})
													}
													disabled={profilesLoading}
												>
													<CheckCircle className="w-4 h-4 mr-1" />
													Approve
												</Button>
												<Button
													variant="destructive"
													size="sm"
													onClick={() =>
														setDenyDialog({
															id: user.id,
															name: user.full_name || user.email || user.id,
														})
													}
													disabled={profilesLoading}
												>
													<XCircle className="w-4 h-4 mr-1" />
													Deny
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>

				{/* Mobile Cards */}
				<div className="block md:hidden">
					{loading ? (
						<div className="flex flex-col items-center py-8">
							<p className="mt-3 text-gray-600 dark:text-gray-400">
								Loading pending requests...
							</p>
						</div>
					) : users.length === 0 ? (
						<div className="text-center py-8 text-gray-500 dark:text-gray-400">
							<p>No pending requests</p>
						</div>
					) : (
						<div className="flex flex-col gap-4 p-2">
							{users.map((user) => (
								<div
									key={user.id}
									className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4 flex flex-col gap-3"
								>
									<div>
										<div className="font-bold text-gray-900 dark:text-white text-base">
											{user.full_name || "N/A"}
										</div>
										<div className="text-sm text-gray-600 dark:text-gray-400">
											{user.email || "N/A"}
										</div>
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">
										Created:{" "}
										{user.created_at
											? new Date(user.created_at).toLocaleDateString()
											: "N/A"}
									</div>
									<div className="flex gap-2 mt-2">
										<Button
											size="sm"
											variant="outline"
											className="flex-1"
											onClick={() =>
												setApproveDialog({
													id: user.id,
													name: user.full_name || user.email || user.id,
												})
											}
											disabled={profilesLoading}
										>
											<CheckCircle className="w-4 h-4 mr-1" />
											Approve
										</Button>
										<Button
											size="sm"
											variant="destructive"
											className="flex-1"
											onClick={() =>
												setDenyDialog({
													id: user.id,
													name: user.full_name || user.email || user.id,
												})
											}
											disabled={profilesLoading}
										>
											<XCircle className="w-4 h-4 mr-1" />
											Deny
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
			{/* All Users Section */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold">All Users</h2>
						<Button variant="outline" size="sm" onClick={handleRefreshAll}>
							Refresh
						</Button>
					</div>
				</div>

				{/* Filters */}
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<div className="flex flex-col md:flex-row justify-between gap-4">
						{/* Search */}
						<div className="flex-1">
							<div className="space-y-2">
								<Label htmlFor="user-search">Search Users</Label>
								<div className="relative">
									<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
									<Input
										id="user-search"
										placeholder="Search by name or email..."
										value={managedSearch}
										onChange={(e) => {
											setManagedSearch(e.target.value);
											setManagedPage(1);
										}}
										className="pl-10"
									/>
								</div>
							</div>
						</div>

						{/* Sort and Page Size */}
						<div className="flex flex-row gap-4 flex-1 md:justify-end sm:flex-row sm:gap-2 w-full">
							{/* Sort */}
							<div className="space-y-2">
								<Label htmlFor="user-sort">Sort By</Label>
								<Select
									value={managedSortBy}
									onValueChange={(
										value: "full_name" | "email" | "role" | "created_at"
									) => setManagedSortBy(value)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Sort By" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="full_name">By Name</SelectItem>
										<SelectItem value="email">By Email</SelectItem>
										<SelectItem value="role">By Role</SelectItem>
										<SelectItem value="created_at">By Created Date</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Sort Direction */}
							<div className="space-y-2">
								<Label htmlFor="user-sort-dir">Order</Label>
								<Select
									value={managedSortDir}
									onValueChange={(value: "asc" | "desc") =>
										setManagedSortDir(value)
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Order" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="asc">Ascending</SelectItem>
										<SelectItem value="desc">Descending</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Page Size */}
							<div className="space-y-2">
								<Label htmlFor="user-page-size">Items per page</Label>
								<Select
									value={managedPageSize.toString()}
									onValueChange={(value) => {
										const numValue = Number(value);
										// Ensure only valid page sizes are allowed
										if ([10, 20, 50, 100].includes(numValue)) {
											setManagedPageSize(numValue);
											setManagedPage(1); // Reset to first page when changing page size
										}
									}}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Items per page" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="10">10</SelectItem>
										<SelectItem value="20">20</SelectItem>
										<SelectItem value="50">50</SelectItem>
										<SelectItem value="100">100</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
				</div>

				{/* Desktop Table */}
				<div className="hidden md:block">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{allUsersLoading ? (
								<TableRow>
									<TableCell colSpan={6} className="text-center py-12">
										Loading users...
									</TableCell>
								</TableRow>
							) : allUsers.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="text-center py-12">
										No users found
									</TableCell>
								</TableRow>
							) : (
								allUsers.map((user) => (
									<TableRow key={user.id}>
										<TableCell className="font-medium">
											{user.full_name || "N/A"}
										</TableCell>
										<TableCell>{user.email || "N/A"}</TableCell>
										<TableCell>
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${
													user.role === "admin"
														? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
														: user.role === "scheduler"
															? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
															: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
												}`}
											>
												{user.role || "viewer"}
											</span>
										</TableCell>
										<TableCell>
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${
													user.status === "approved"
														? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
														: user.status === "denied"
															? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
															: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
												}`}
											>
												{user.status || "unknown"}
											</span>
										</TableCell>
										<TableCell>
											{user.created_at
												? new Date(user.created_at).toLocaleDateString()
												: "N/A"}
										</TableCell>
										<TableCell>
											<div className="flex items-center justify-end gap-2">
												{user.status === "approved" && (
													<>
														<Button
															variant="outline"
															size="sm"
															onClick={() => {
																// TODO: Implement role change
																toast.info("Role change coming soon");
															}}
														>
															Change Role
														</Button>
														<Button
															variant="outline"
															size="sm"
															onClick={() => {
																// TODO: Implement password reset
																toast.info("Password reset coming soon");
															}}
														>
															Reset Password
														</Button>
													</>
												)}
												<Button
													variant="destructive"
													size="sm"
													onClick={() =>
														setRevokeDialog({
															id: user.id,
															name: user.full_name || user.email || user.id,
														})
													}
												>
													Revoke Access
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>

				{/* Mobile Cards */}
				<div className="block md:hidden">
					{allUsersLoading ? (
						<div className="flex flex-col items-center py-8">
							<p className="mt-3 text-gray-600 dark:text-gray-400">
								Loading users...
							</p>
						</div>
					) : allUsers.length === 0 ? (
						<div className="text-center py-8 text-gray-500 dark:text-gray-400">
							<p>No users found</p>
						</div>
					) : (
						<div className="flex flex-col gap-4 p-2">
							{allUsers.map((user) => (
								<div
									key={user.id}
									className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4 flex flex-col gap-3"
								>
									<div>
										<div className="font-bold text-gray-900 dark:text-white text-base">
											{user.full_name || "N/A"}
										</div>
										<div className="text-sm text-gray-600 dark:text-gray-400">
											{user.email || "N/A"}
										</div>
										<div className="flex gap-2 mt-2">
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${
													user.role === "admin"
														? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
														: user.role === "scheduler"
															? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
															: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
												}`}
											>
												{user.role || "viewer"}
											</span>
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${
													user.status === "approved"
														? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
														: user.status === "denied"
															? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
															: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
												}`}
											>
												{user.status || "unknown"}
											</span>
										</div>
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">
										Created:{" "}
										{user.created_at
											? new Date(user.created_at).toLocaleDateString()
											: "N/A"}
									</div>
									<div className="flex gap-2 mt-2">
										{user.status === "approved" && (
											<>
												<Button
													size="sm"
													variant="outline"
													className="flex-1"
													onClick={() => {
														toast.info("Role change coming soon");
													}}
												>
													Change Role
												</Button>
												<Button
													size="sm"
													variant="outline"
													className="flex-1"
													onClick={() => {
														toast.info("Password reset coming soon");
													}}
												>
													Reset Password
												</Button>
											</>
										)}
										<Button
											size="sm"
											variant="destructive"
											className={user.status === "approved" ? "flex-1" : ""}
											onClick={() =>
												setRevokeDialog({
													id: user.id,
													name: user.full_name || user.email || user.id,
												})
											}
										>
											Revoke Access
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
			{/* Pagination */}
			{allUsers.length > 0 && (
				<div className="flex flex-col sm:flex-row items-center justify-between mt-6">
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Page {managedPage} of{" "}
						{Math.max(1, Math.ceil(managedTotal / managedPageSize))} (
						{managedTotal} total)
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setManagedPage(managedPage - 1)}
							disabled={managedPage <= 1}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setManagedPage(managedPage + 1)}
							disabled={
								managedPage >= Math.ceil(managedTotal / managedPageSize)
							}
						>
							Next
						</Button>
					</div>
				</div>
			)}
			{/* Approve Confirmation Dialog */}
			<AlertDialog
				open={!!approveDialog}
				onOpenChange={() => setApproveDialog(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Approve User</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to approve{" "}
							<span className="font-semibold">"{approveDialog?.name}"</span>?
							They will be granted access to the system.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setApproveDialog(null)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction onClick={handleApprove}>
							Approve
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			{/* Deny Confirmation Dialog */}
			<AlertDialog open={!!denyDialog} onOpenChange={() => setDenyDialog(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Deny User</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to deny{" "}
							<span className="font-semibold">"{denyDialog?.name}"</span>? They
							will not be granted access to the system.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setDenyDialog(null)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeny}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Deny
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			{/* Revoke Confirmation Dialog */}
			<AlertDialog
				open={!!revokeDialog}
				onOpenChange={() => setRevokeDialog(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Revoke User Access</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to revoke access for{" "}
							<span className="font-semibold">"{revokeDialog?.name}"</span>?
							This will permanently remove their access to the system and cannot
							be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setRevokeDialog(null)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleRevoke}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Revoke Access
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
