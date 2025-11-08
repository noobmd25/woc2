"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function UsageStub() {
	const [stats, setStats] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchAnalytics() {
			try {
				setLoading(true);
				const res = await fetch("/api/analytics/usage");
				if (!res.ok) {
					throw new Error("Failed to fetch analytics");
				}
				const data = await res.json();
				setStats(data);
			} catch (err: any) {
				console.error("Failed to fetch analytics:", err);
				setError(err.message || "Failed to load analytics");
			} finally {
				setLoading(false);
			}
		}
		fetchAnalytics();
	}, []);

	if (loading) {
		return (
			<div className="p-6 flex items-center justify-center min-h-[400px]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
				Track page views and user engagement across the platform. Data from
				Vercel Analytics.
			</p>

			{/* Main Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
					<div className="text-sm text-gray-600 dark:text-gray-400">
						OnCall Page Views
					</div>
					<div className="text-2xl font-bold mt-1">
						{stats?.oncall?.total || 0}
					</div>
					<div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
						Last 7 days
					</div>
				</div>
				<div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Directory Page Views
					</div>
					<div className="text-2xl font-bold mt-1">
						{stats?.directory?.total || 0}
					</div>
					<div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
						Last 7 days
					</div>
				</div>
				<div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Total Unique Users
					</div>
					<div className="text-2xl font-bold mt-1">
						{stats?.uniqueUsers || 0}
					</div>
					<div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
						Last 7 days
					</div>
				</div>
			</div>

			{/* Detailed Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
					<h3 className="font-semibold mb-3">OnCall Page Analytics</h3>
					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">
								Total Views:
							</span>
							<span className="font-medium">{stats?.oncall?.total || 0}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">
								Unique Users:
							</span>
							<span className="font-medium">
								{stats?.oncall?.uniqueUsers || 0}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">
								Avg. Session Time:
							</span>
							<span className="font-medium">
								{stats?.oncall?.avgSessionTime || 0}s
							</span>
						</div>
					</div>
				</div>

				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
					<h3 className="font-semibold mb-3">Directory Page Analytics</h3>
					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">
								Total Views:
							</span>
							<span className="font-medium">
								{stats?.directory?.total || 0}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">
								Unique Users:
							</span>
							<span className="font-medium">
								{stats?.directory?.uniqueUsers || 0}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">
								Avg. Session Time:
							</span>
							<span className="font-medium">
								{stats?.directory?.avgSessionTime || 0}s
							</span>
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

export default function UsagePage() {
	return (
		<div className="container mx-auto px-2 py-6 max-w-4xl">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
				<div className="flex items-center gap-4">
					<Link href="/admin">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="w-5 h-5" />
						</Button>
					</Link>
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
							Usage Statistics
						</h1>
						<p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
							View usage analytics and system performance metrics
						</p>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="mt-4">
				<UsageStub />
			</div>
		</div>
	);
}
